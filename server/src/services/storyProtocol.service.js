const axios = require('axios');
const { get, set } = require('../utils/cache'); 

// Simple utility for formatting Wei (18 decimals) to a readable ETH string
const formatWeiToEther = (weiAmount) => {
    try {
        const wei = BigInt(weiAmount);
        let weiStr = wei.toString().padStart(19, '0'); 
        const integerPart = weiStr.slice(0, -18) || '0';
        const decimalPart = weiStr.slice(-18); 
        
        // Cek jika decimalPart hanya berisi nol
        if (decimalPart.replace(/0/g, '') === '') {
             return `${integerPart}.00`;
        }
        
        // Hapus nol di akhir dari bagian desimal, lalu batasi (misalnya 4 desimal)
        let formattedDecimal = decimalPart.replace(/0+$/, '');
        
        return `${integerPart}.${formattedDecimal.slice(0, 4)}`; 
    } catch (e) {
        console.error(`Error formatting Wei: ${weiAmount}`, e);
        return 'N/A';
    }
};

const STORY_ASSETS_API_BASE_URL = 'https://api.storyapis.com/api/v4/assets';
const STORY_TRANSACTIONS_API_BASE_URL = 'https://api.storyapis.com/api/v4/transactions';
const STORY_TRANSACTION_DETAIL_BASE_URL = 'https://api.storyapis.com/api/v4/transactions'; 

const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;
// KUNCI INI DI-HARDCODE UNTUK MEMASTIKAN OTENTIKASI BERHASIL
const storyScanApiKey = 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U'; 

// Utility untuk memanggil API Story Protocol (Assets atau Transactions)
const fetchStoryApi = async (url, apiKey, body) => { 
    const options = {
        method: 'POST',
        url: url,
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
        },
        data: body 
    };

    try {
        // Panggilan GET untuk detail transaksi
        if (options.method === 'GET') {
            const response = await axios(options);
            return response.data;
        }

        // Panggilan POST untuk daftar aset/transaksi
        const response = await axios(options);
        return url.includes(STORY_ASSETS_API_BASE_URL) ? response.data.data : response.data.events;
    } catch (error) {
        // PENTING: Tangani 404/400 dari API eksternal
        if (error.response && (error.response.status === 404 || error.response.status === 400)) {
            if (url.includes(STORY_ASSETS_API_BASE_URL)) {
                console.warn(`[API WARN] Assets API returned ${error.response.status}. Treating as no asset found.`);
                return [];
            }
            if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) {
                console.warn(`[API WARN] Transactions API returned ${error.response.status}. Treating as no events found.`);
                return [];
            }
        }
        
        console.error(`[SERVICE_ERROR] Gagal mengambil data dari Story Protocol API (${url}).`);
        if (error.response) {
            console.error("Status Error:", error.response.status);
            console.error("Data Error:", JSON.stringify(error.response.data, null, 2));
            throw new Error(`API Error: Status ${error.response.status} - ${error.response.data.message || 'Gagal mengambil data'}`);
        } else {
            console.error("Error Message:", error.message);
            throw new Error('Terjadi kesalahan saat membuat permintaan atau tidak ada respons.');
        }
    }
}

// Fungsi pembantu untuk mengambil dan mengagregasi event royalti menggunakan Transactions API
const getAndAggregateRoyaltyEventsFromApi = async (ipId) => {
    // storyScanApiKey sudah di hardcode di scope atas.
    
    console.log(`[SERVICE] Fetching RoyaltyPaid events from Transactions API for IP ID: ${ipId}`);

    const requestBody = {
        where: {
            eventTypes: ["RoyaltyPaid"],
            ipIds: [ipId], // FIX 2: Mengganti 'ipId' menjadi 'ipIds' (array)
        },
        pagination: { limit: 200 }, // FIX 1: Mengganti limit dari 1000 ke 200
        orderBy: "blockNumber",
        orderDirection: "desc"
    };
    
    try {
        const events = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyScanApiKey, requestBody);

        if (!events || events.length === 0) {
            return { transactions: [], totalWei: 0n, licenseeMap: new Map() };
        }
        
        const licenseeMap = new Map();
        let totalWei = 0n;
        
        const transactions = events.map(event => {
            const { caller, amount } = event.args;
            
            // Konversi yang aman
            const numericAmount = BigInt(amount || '0'); 
            
            totalWei += numericAmount;
            
            const currentData = licenseeMap.get(caller) || {
                address: caller,
                count: 0,
                totalWei: 0n
            };
            currentData.count += 1;
            currentData.totalWei += numericAmount;
            licenseeMap.set(caller, currentData);

            return {
                txHash: event.transactionHash,
                from: caller, 
                value: `${formatWeiToEther(numericAmount)} ETH`, 
                timestamp: event.timestamp ? new Date(event.timestamp * 1000).toLocaleString('en-US') : `Block #${event.blockNumber}`
            };
        }).reverse(); 

        return { transactions, totalWei, licenseeMap };
    } catch (e) {
        throw new Error(`Failed to query Transactions API: ${e.message}`);
    }
}

/**
 * Fetch detail for a specific transaction hash.
 */
const fetchTransactionDetail = async (txHash) => {
    // storyScanApiKey sudah di hardcode di scope atas
    
    const url = `${STORY_TRANSACTION_DETAIL_BASE_URL}/${txHash}`;
    
    try {
        console.log(`[SERVICE] Fetching Transaction Detail for: ${txHash}`);
        // Endpoint detail transaksi menggunakan GET
        const options = {
            method: 'GET', 
            url: url,
            headers: {
                'X-Api-Key': storyScanApiKey,
            },
        };
        const response = await axios(options);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { error: 'Transaction not found on API' };
        }
        console.error(`[SERVICE_ERROR] Failed to fetch transaction detail for ${txHash}.`, error.message);
        throw new Error(`Failed to fetch transaction detail: ${error.message}`);
    }
}


/**
 * Mendapatkan daftar aset berdasarkan alamat pemilik.
 */
const getAssetsByOwner = async (ownerAddress) => {
    if (!ownerAddress || !/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) return [];

    const cacheKey = `assets:owner:${ownerAddress}`;
    const cachedAssets = get(cacheKey);
    if (cachedAssets) {
        console.log(`[SERVICE] Mengambil ${cachedAssets.length} aset dari cache untuk pemilik: ${ownerAddress}`);
        return cachedAssets;
    }

    const requestBody = {
        includeLicenses: true, 
        moderated: false,      
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit: 200 },
        where: { ownerAddress: ownerAddress }
    };
    
    // Perbaikan dari masalah lama di awal: menggunakan ownerAddress, bukan owner
    const assets = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody);
    set(cacheKey, assets);
    return assets;
};

/**
 * Mendapatkan detail aset untuk IP ID tertentu.
 */
const getAssetDetails = async (ipId) => {
    if (!ipId) return null;

    const lowerCaseIpId = ipId.toLowerCase(); 

    const cacheKey = `asset:detail:${ipId}`;
    let asset = get(cacheKey);

    if (!asset || !asset.ipId) { 
        console.log(`[SERVICE] Memulai pencarian detail aset untuk IP ID: ${ipId}`);
        const searchIpIds = [ipId]; 
        
        if (lowerCaseIpId !== ipId) {
             searchIpIds.push(lowerCaseIpId);
        }

        const requestBody = {
            includeLicenses: true, 
            moderated: false,      
            orderBy: "blockNumber",
            orderDirection: "desc",
            pagination: { limit: 1 },
            where: { ipIds: searchIpIds } // FIX: Menggunakan 'ipIds' (array) di Assets API
        };
        
        const assets = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody);
        asset = assets[0];
    }
    
    let analytics = {};
    if (asset) {
        try {
            const { totalWei } = await getAndAggregateRoyaltyEventsFromApi(ipId); 

            analytics.totalRoyaltiesPaid = {
                ETH: formatWeiToEther(totalWei), 
            };
            
            analytics.disputeStatus = 'None'; 
            
        } catch (e) {
            console.error(`[API_ERROR] Gagal mendapatkan data royalti untuk ${ipId}: ${e.message}`);
            analytics.errorMessage = e.message; 
        }
    } else {
         return null;
    }

    if (asset) {
        asset.analytics = analytics;
        set(cacheKey, asset); 
    }
    
    return asset;
};

/**
 * ON-CHAIN via API: Mendapatkan transaksi royalti untuk IP ID tertentu (Royalty Ledger).
 */
const getRoyaltyTransactions = async (ipId) => {
    try {
        const { transactions } = await getAndAggregateRoyaltyEventsFromApi(ipId);
        return transactions;
    } catch (e) {
        console.error(`[API ERROR] Gagal mengambil RoyaltyPaidEvents: ${e.message}`);
        throw new Error(`Failed to load royalty transactions: ${e.message}`); 
    }
};

/**
 * ON-CHAIN via API: Mendapatkan 3 pembayar royalti teratas (Top Licensees).
 */
const getTopLicensees = async (ipId) => {
    try {
        console.log(`[SERVICE] Aggregating Top Licensees from Transactions API for IP ID: ${ipId}`);
        const { licenseeMap } = await getAndAggregateRoyaltyEventsFromApi(ipId);

        // Konversi Map ke Array
        let licensees = Array.from(licenseeMap.values()).map(lic => ({
            ...lic,
            totalValue: `${formatWeiToEther(lic.totalWei)} ETH`,
        }));

        // Urutkan berdasarkan totalWei (secara descending)
        licensees.sort((a, b) => {
            if (a.totalWei < b.totalWei) return 1;
            if (a.totalWei > b.totalWei) return -1;
            return 0;
        });

        // Batasi hingga 3 teratas
        return licensees.slice(0, 3);
    } catch (e) {
        console.error(`[API ERROR] Gagal mengagregasi Top Licensees: ${e.message}`);
        throw new Error(`Failed to load top licensees: ${e.message}`); 
    }
};


module.exports = {
  getAssetsByOwner,
  getAssetDetails,
  getRoyaltyTransactions,
  getTopLicensees,
  fetchTransactionDetail, 
};