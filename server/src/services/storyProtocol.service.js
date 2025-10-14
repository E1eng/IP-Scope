const axios = require('axios');
const { get, set } = require('../utils/cache'); 

// Simple utility for formatting Wei (18 decimals) to a readable ETH string
const formatWeiToEther = (weiAmount) => {
    try {
        const wei = BigInt(weiAmount);
        let weiStr = wei.toString().padStart(19, '0'); 
        const integerPart = weiStr.slice(0, -18) || '0';
        const decimalPart = weiStr.slice(-18); 
        
        if (decimalPart.replace(/0/g, '') === '') {
             return `${integerPart}.00`;
        }
        
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
const storyScanApiKey = process.env.STORYSCAN_API_KEY; 

// Utility untuk memanggil API Story Protocol (Assets atau Transactions)
const fetchStoryApi = async (url, apiKey, body, method = 'POST') => { 
    const options = {
        method: method,
        url: url,
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
        },
        data: body 
    };

    try {
        const response = await axios(options);
        if (url.includes(STORY_ASSETS_API_BASE_URL) && method === 'POST') {
             return { data: response.data.data, pagination: response.data.pagination };
        }
        return response.data;
    } catch (error) {
        if (error.response && (error.response.status === 404 || error.response.status === 400)) {
            if (url.includes(STORY_ASSETS_API_BASE_URL)) return { data: [], pagination: { total: 0 } };
            if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) return { events: [] };
        }
        
        console.error(`[SERVICE_ERROR] Gagal mengambil data dari Story Protocol API (${url}).`);
        if (error.response) {
            throw new Error(`API Error: Status ${error.response.status} - ${error.response.data.message || 'Gagal mengambil data'}`);
        } else {
            throw new Error('Terjadi kesalahan saat membuat permintaan atau tidak ada respons.');
        }
    }
}

// Fungsi pembantu untuk mengambil dan mengagregasi event royalti menggunakan Transactions API
const getAndAggregateRoyaltyEventsFromApi = async (ipId) => {
    
    // PENTING: Periksa apakah key transaksi ada sebelum melakukan panggilan
    if (!storyScanApiKey) {
        throw new Error("STORYSCAN_API_KEY is not set in environment variables.");
    }
    
    console.log(`[SERVICE] Fetching RoyaltyPaid events from Transactions API for IP ID: ${ipId}`);

    const requestBody = {
        where: {
            eventTypes: ["RoyaltyPaid"],
            ipIds: [ipId],
        },
        pagination: { limit: 200 }, 
        orderBy: "blockNumber",
        orderDirection: "desc"
    };
    
    try {
        const response = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyScanApiKey, requestBody);
        const events = response.events || [];

        if (events.length === 0) {
            return { transactions: [], totalWei: 0n, licenseeMap: new Map() };
        }
        
        const licenseeMap = new Map();
        let totalWei = 0n;
        
        const transactions = events.map(event => {
            const { caller, amount } = event.args;
            const numericAmount = BigInt(amount || '0'); 
            totalWei += numericAmount;
            
            const currentData = licenseeMap.get(caller) || { address: caller, count: 0, totalWei: 0n };
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
        // FIX: Return nilai nol di catch agar loop agregasi global tidak berhenti
        console.error(`[ROYALTY AGGREGATION ERROR] Failed to query Transactions API for IP ID ${ipId}: ${e.message}`);
        return { transactions: [], totalWei: 0n, licenseeMap: new Map() };
    }
}


/**
 * CORE FUNCTION: Get all IP Assets for a given filter set.
 */
const getAssetsByOwner = async (ownerAddress, limit = 20, offset = 0, tokenContract) => {
    
    // --- LOGIC: BUILD FILTER CLAUSE ---
    const whereClause = {};
    
    // 1. Owner Address (Apply if provided and valid)
    if (ownerAddress) {
        whereClause.ownerAddress = ownerAddress.trim(); 
    }

    // 2. Token Contract (Apply if provided)
    if (tokenContract) {
        const cleanedTokenContract = tokenContract.trim();
        if (cleanedTokenContract) { 
             whereClause.tokenContract = cleanedTokenContract; 
        }
    }

    // MANDATORY CHECK: Harus ada setidaknya satu filter (Owner atau Token Contract)
    if (Object.keys(whereClause).length === 0) {
        return { data: [], pagination: { total: 0 } };
    }

    // Build unique cache key
    const cacheKey = `assets:owner:${ownerAddress || 'none'}:${limit}:${offset}:${tokenContract || 'all'}`;
    const cachedResponse = get(cacheKey);
    if (cachedResponse) {
        console.log(`[SERVICE] Mengambil aset dari cache untuk filter: ${cacheKey}`);
        return cachedResponse;
    }
    
    const requestBody = {
        includeLicenses: true, 
        moderated: false,      
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit: limit, offset: offset },
        where: whereClause 
    };
    
    console.log("[SERVICE DEBUG] Final Assets Request Body:", JSON.stringify(requestBody, null, 2));


    const response = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody);
    set(cacheKey, response);
    return response; 
};

/**
 * NEW: Aggregates portfolio-wide stats (Royalties and Dispute Status) for the dashboard.
 */
const getPortfolioStats = async (ownerAddress) => {
    
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    if (!ownerAddress) {
        return { totalAssets: 0, totalRoyalties: '0.00 ETH', overallDisputeStatus: 'N/A' };
    }
    
    // 1. Dapatkan semua aset (cap di 200 untuk menghindari timeout)
    const MAX_ASSET_LIMIT = 200; 
    let allAssets = [];
    
    let assetResponse = await getAssetsByOwner(ownerAddress, MAX_ASSET_LIMIT, 0);
    allAssets = assetResponse.data;
    const totalAssets = assetResponse.pagination?.total || 0;

    if (allAssets.length === 0) {
        return { totalAssets, totalRoyalties: '0.00 ETH', overallDisputeStatus: 'None' };
    }

    // 2. Agregasi Total Royalti dan Status Sengketa
    let globalTotalWei = 0n;
    let overallDisputeStatus = 'None'; 

    for (const asset of allAssets) {
        try {
            // Re-use the royalty aggregation function for each asset
            const { totalWei } = await getAndAggregateRoyaltyEventsFromApi(asset.ipId.toLowerCase());
            globalTotalWei += totalWei;
            
            // Dispute Status Aggregation: Jika ADA sengketa Aktif/Pending, set status portofolio
            if (asset.disputeStatus === 'Active') {
                overallDisputeStatus = 'Active';
                break; // Hentikan loop jika menemukan status tertinggi
            } else if (asset.disputeStatus === 'Pending' && overallDisputeStatus === 'None') {
                overallDisputeStatus = 'Pending';
            }

        } catch (e) {
            console.error(`Error processing IP ID ${asset.ipId}: ${e.message}`);
        }
    }
    
    return { 
        totalAssets, 
        totalRoyalties: formatWeiToEther(globalTotalWei), 
        overallDisputeStatus: overallDisputeStatus 
    };
};


// --- Fungsi Lainnya ---

const getAssetDetails = async (ipId) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }

    if (!ipId) return null;
    const lowerCaseIpId = ipId.toLowerCase(); 
    const cacheKey = `asset:detail:${ipId}`;
    let asset = get(cacheKey);
    if (!asset || !asset.ipId) { 
        const searchIpIds = [ipId]; 
        if (lowerCaseIpId !== ipId) { searchIpIds.push(lowerCaseIpId); }
        const requestBody = {
            includeLicenses: true, moderated: false, orderBy: "blockNumber", orderDirection: "desc", pagination: { limit: 1 }, where: { ipIds: searchIpIds }
        };
        // FIX: Tambahkan disputeStatus ke API call asset
        const response = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody);
        asset = response.data[0];
    }
    
    // Default Dispute Status jika tidak ada
    let assetDisputeStatus = asset.disputeStatus || 'None'; 

    let analytics = {};
    if (asset) {
        try {
            const { totalWei } = await getAndAggregateRoyaltyEventsFromApi(ipId); 
            analytics.totalRoyaltiesPaid = { ETH: formatWeiToEther(totalWei) };
            // FIX: Menggunakan status sengketa real/default
            analytics.disputeStatus = assetDisputeStatus; 
        } catch (e) {
            console.error(`[API_ERROR] Gagal mendapatkan data royalti untuk ${ipId}: ${e.message}`);
            analytics.errorMessage = e.message; 
        }
    } else { return null; }
    
    if (asset) { 
        asset.analytics = analytics; 
        asset.disputeStatus = assetDisputeStatus; // Ensure base object has status for AssetTable
        set(cacheKey, asset); 
    }
    return asset;
};

const getRoyaltyTransactions = async (ipId) => {
    try {
        const { transactions } = await getAndAggregateRoyaltyEventsFromApi(ipId);
        return transactions;
    } catch (e) {
        throw new Error(`Failed to load royalty transactions: ${e.message}`); 
    }
};

const getTopLicensees = async (ipId) => {
    try {
        // Logika Top Licensees yang sudah ada
        const { licenseeMap } = await getAndAggregateRoyaltyEventsFromApi(ipId);
        let licensees = Array.from(licenseeMap.values()).map(lic => ({
            ...lic,
            totalValue: `${formatWeiToEther(lic.totalWei)} ETH`,
        }));
        licensees.sort((a, b) => (a.totalWei < b.totalWei) ? 1 : -1);
        return licensees.slice(0, 3);
    } catch (e) {
        throw new Error(`Failed to load royalty transactions: ${e.message}`); 
    }
};

const fetchTransactionDetail = async (txHash) => {
    if (!storyScanApiKey) {
        throw new Error("STORYSCAN_API_KEY is not set in environment variables.");
    }
    
    const url = `${STORY_TRANSACTION_DETAIL_BASE_URL}/${txHash}`;
    try {
        const options = { method: 'GET', url: url, headers: { 'X-Api-Key': storyScanApiKey } };
        const response = await axios(options);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) { return { error: 'Transaction not found on API' }; }
        throw new Error(`Failed to fetch transaction detail: ${error.message}`);
    }
}


module.exports = {
  getAssetsByOwner,
  getAssetDetails,
  getRoyaltyTransactions,
  getTopLicensees,
  fetchTransactionDetail, 
  getPortfolioStats, // NEW Export
};