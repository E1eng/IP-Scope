const axios = require('axios');

// Utility: Menggunakan fungsi ini untuk memastikan konsistensi format BigInt ke string.
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
const STORYSCAN_API_BASE_URL = 'https://www.storyscan.io/api/v2'; 
const STORY_TRANSACTION_DETAIL_BASE_URL = `${STORYSCAN_API_BASE_URL}/transactions`; 

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

/**
 * Helper: Fetches and processes individual transaction details from StoryScan.
 */
const fetchTransactionDetailFromStoryScan = async (txHash) => {
    if (!storyScanApiKey) return { amount: 0n, decimals: 18, symbol: 'ETH' }; 
    
    try {
        const response = await axios.get(`${STORY_TRANSACTION_DETAIL_BASE_URL}/${txHash}`, { headers: { 'X-Api-Key': storyScanApiKey } });
        const txData = response.data;
        
        // Logika Perbaikan: Ambil transfer token kedua jika ada, atau pertama jika hanya ada satu
        let royaltyTransfer = null;
        if (txData.token_transfers && txData.token_transfers.length > 1) {
            royaltyTransfer = txData.token_transfers[1]; // Transfer Royalti yang sebenarnya
        } else if (txData.token_transfers && txData.token_transfers.length > 0) {
            royaltyTransfer = txData.token_transfers[0]; // Fallback
        }

        if (royaltyTransfer && royaltyTransfer.total && royaltyTransfer.total.value) {
            return {
                amount: BigInt(royaltyTransfer.total.value),
                decimals: parseInt(royaltyTransfer.token.decimals, 10),
                symbol: royaltyTransfer.token.symbol,
                from: txData.from.hash,
                timestamp: txData.timestamp,
            };
        }
        return { amount: 0n, decimals: 18, symbol: 'ETH' };
    } catch (e) {
        const statusCode = e.response?.status || 'Network Error';
        console.error(`[STORYSCAN FATAL ERROR] Failed to fetch detail for ${txHash}. Status: ${statusCode}.`);
        if (statusCode === 429) {
             console.error(">>> DIAGNOSTIC: Rate Limit Exceeded. Increase delay or contact API provider.");
        } else if (statusCode === 403 || statusCode === 401) {
             console.error(">>> DIAGNOSTIC: StoryScan API Key invalid or expired. Check STORYSCAN_API_KEY.");
        }
        return { amount: 0n, decimals: 18, symbol: 'ETH' }; 
    }
}


/**
 * Fungsi pembantu untuk mengambil dan mengagregasi event royalti (Menggunakan 2 API)
 */
const getAndAggregateRoyaltyEventsFromApi = async (ipId) => {
    
    if (!storyScanApiKey) {
        throw new Error("STORYSCAN_API_KEY is not set in environment variables.");
    }
    
    const requestBody = {
        where: {
            eventTypes: ["RoyaltyPaid"],
            // FIX KRITIS: Mengirim IP ID AS-IS (checksum), sesuai dengan yang berhasil di Playground
            ipIds: [ipId], 
        },
        pagination: { limit: 200 }, 
        orderBy: "blockNumber",
        orderDirection: "desc"
    };
    
    try {
        // 1. Panggil Story API /transactions untuk mendapatkan txHashes
        const response = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, requestBody);
        const events = response.events || [];

        if (events.length === 0) {
            console.log(`[AGGR RESULT] IP ID ${ipId}: No RoyaltyPaid events found.`);
            return { totalRoyaltiesByToken: new Map(), licenseeMap: new Map() };
        }
        
        // 2. PROSES AGREGASI (PROMISE.ALL) - Mengandalkan Client Timeout/Throttling untuk stabilisasi
        const detailPromises = events.map(event => 
            fetchTransactionDetailFromStoryScan(event.transactionHash)
        );
        const detailedTxData = await Promise.all(detailPromises);

        // 3. AGREGASI
        const totalRoyaltiesByToken = new Map();
        const licenseeMap = new Map();
        let totalEthWei = 0n;
        
        detailedTxData.forEach((txDetail) => {
            const { amount, symbol, from } = txDetail;

            // Agregasi Total Royalti
            if (amount > 0n && symbol) {
                const currentData = totalRoyaltiesByToken.get(symbol) || { total: 0n, decimals: txDetail.decimals };
                currentData.total = currentData.total + amount; 
                totalRoyaltiesByToken.set(symbol, currentData);
                
                if (symbol === 'ETH' || symbol === 'WETH') {
                     totalEthWei += amount; 
                }
            }
            
            // Agregasi Licensee Map
            if (from) { 
                const currentData = licenseeMap.get(from) || { address: from, count: 0, totalWei: 0n };
                currentData.count += 1;
                currentData.totalWei += amount; 
                licenseeMap.set(from, currentData);
            }
        });
        
        // FIX/DEBUG: Log Total ETH Wei yang terkumpul untuk IP ID ini
        if (totalEthWei > 0n) {
             console.log(`[AGGR RESULT] IP ID ${ipId}: SUCCESS. Total ETH/WETH Wei: ${totalEthWei.toString()}.`);
        } else {
             console.log(`[AGGR RESULT] IP ID ${ipId}: No valuable transfers found (Final Sum: 0).`);
        }

        return { totalRoyaltiesByToken, licenseeMap }; 
    } catch (e) {
        console.error(`[ROYALTY AGGREGATION ERROR] Failed to query API for IP ID ${ipId}: ${e.message}`);
        return { totalRoyaltiesByToken: new Map(), licenseeMap: new Map() };
    }
}


/**
 * CORE FUNCTION: Get all IP Assets for a given filter set.
 */
const getAssetsByOwner = async (ownerAddress, limit = 20, offset = 0, tokenContract) => {
    
    const whereClause = {};
    
    if (ownerAddress) {
        whereClause.ownerAddress = ownerAddress.trim(); 
    }

    if (tokenContract) {
        const cleanedTokenContract = tokenContract.trim();
        if (cleanedTokenContract) { 
             whereClause.tokenContract = cleanedTokenContract; 
        }
    }

    if (Object.keys(whereClause).length === 0) {
        return { data: [], pagination: { total: 0 } };
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
    return response; 
};

/**
 * Aggregates portfolio-wide stats (Royalties and Dispute Status) for the dashboard.
 */
const getPortfolioStats = async (ownerAddress) => {
    
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    if (!ownerAddress) {
        return { totalAssets: 0, totalRoyalties: '0.00 ETH', overallDisputeStatus: '0' };
    }
    
    const MAX_ASSET_LIMIT = 200; 
    let allAssets = [];
    
    let assetResponse = await getAssetsByOwner(ownerAddress, MAX_ASSET_LIMIT, 0);
    allAssets = assetResponse.data;
    const totalAssets = assetResponse.pagination?.total || 0;

    if (allAssets.length === 0) {
        return { totalAssets, totalRoyalties: '0.00 ETH', overallDisputeStatus: '0' };
    }

    // 2. Agregasi Total Royalti dan Status Sengketa
    let globalTotalWei = 0n;
    let overallDisputeStatus = 'None'; 
    let activeDisputeCount = 0; 

    for (const asset of allAssets) {
        try {
            const ipIdForAggregation = asset.ipId; 
            const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(ipIdForAggregation);
            
            // Agregasi global total Wei (hanya ETH dan WETH)
            globalTotalWei += totalRoyaltiesByToken.get('ETH')?.total || 0n; 
            globalTotalWei += totalRoyaltiesByToken.get('WETH')?.total || 0n; 

            // Dispute Status Aggregation:
            if (asset.disputeStatus === 'Active') {
                overallDisputeStatus = 'Active';
                activeDisputeCount++;
            } else if (asset.disputeStatus === 'Pending' && overallDisputeStatus === 'None') {
                overallDisputeStatus = 'Pending';
            }
            if (asset.disputeStatus === 'Active') {
                activeDisputeCount++;
            }

        } catch (e) {
            console.error(`Error processing IP ID ${asset.ipId}: ${e.message}`);
        }
    }
    
    return { 
        totalAssets, 
        totalRoyalties: formatWeiToEther(globalTotalWei), 
        overallDisputeStatus: activeDisputeCount > 0 ? activeDisputeCount.toString() : '0' 
    };
};


// --- Fungsi Lainnya (detail, transaksi, licensee tetap sama) ---

const getAssetDetails = async (ipId) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }

    if (!ipId) return null;
    const lowerCaseIpId = ipId(); 
    
    // Panggilan API untuk detail aset
    const searchIpIds = [ipId]; 
    if (lowerCaseIpId !== ipId) { searchIpIds.push(lowerCaseIpId); }
    const requestBody = {
        includeLicenses: true, moderated: false, orderBy: "blockNumber", orderDirection: "desc", pagination: { limit: 1 }, where: { ipIds: searchIpIds }
    };
    const response = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody);
    let asset = response.data[0];
    
    let assetDisputeStatus = asset?.disputeStatus || 'None'; 

    let analytics = {};
    if (asset) {
        try {
            const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(ipId); 
            
            // Format total royalties paid ke format yang diharapkan client (Array of objects)
            const formattedRoyalties = Array.from(totalRoyaltiesByToken.entries()).map(([symbol, data]) => ({
                currency: symbol,
                totalValue: formatWeiToEther(data.total), // Menggunakan total BigInt dari data
            }));

            analytics.totalRoyaltiesPaid = formattedRoyalties;
            analytics.disputeStatus = assetDisputeStatus; 
        } catch (e) {
            console.error(`[API_ERROR] Gagal mendapatkan data royalti untuk ${ipId}: ${e.message}`);
            analytics.errorMessage = e.message; 
        }
    } else { return null; }
    
    if (asset) { 
        asset.analytics = analytics; 
        asset.disputeStatus = assetDisputeStatus; 
    }
    return asset;
};

const getRoyaltyTransactions = async (ipId) => {
    try {
        const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(ipId);

        // Panggil /transactions dari Story Protocol API untuk daftar hash
        const response = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, {
            where: { ipIds: [ipId], eventTypes: ["RoyaltyPaid"] }, // FIX: Mengirim ipId AS-IS
            pagination: { limit: 200 }
        });
        const events = response.events || [];
        
        // Panggil StoryScan untuk detail (diperlukan untuk value dan symbol yang akurat)
        const detailPromises = events.map(event => 
            fetchTransactionDetailFromStoryScan(event.transactionHash).then(detail => ({ 
                txHash: event.transactionHash,
                ...detail 
            }))
        );
        const detailedTransactions = await Promise.all(detailPromises);
        
        // Format untuk UI
        return detailedTransactions
            .filter(tx => tx.amount > 0n)
            .map(tx => ({
                txHash: tx.txHash,
                from: tx.from || 'N/A', 
                value: `${formatWeiToEther(tx.amount)} ${tx.symbol || 'ETH'}`,
                timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString('en-US') : 'N/A',
            }));

    } catch (e) {
        throw new Error(`Failed to load royalty transactions: ${e.message}`); 
    }
};

const getTopLicensees = async (ipId) => {
    // Logika Top Licensees yang sudah ada (menggunakan data yang diagregasi)
    try {
        const { licenseeMap } = await getAndAggregateRoyaltyEventsFromApi(ipId);
        
        let licensees = Array.from(licenseeMap.entries()).map(([address, data]) => {
            return {
                address: address,
                count: data.count,
                // Menggunakan BigInt totalWei (ETH/WETH)
                totalValue: `${formatWeiToEther(data.totalWei)} ETH`, 
            };
        });
        
        licensees.sort((a, b) => {
            // Sorting berdasarkan nilai BigInt totalWei
            return a.totalWei < b.totalWei ? 1 : a.totalWei > b.totalWei ? -1 : 0;
        });
        
        return licensees.slice(0, 3);
    } catch (e) {
        throw new Error(`Failed to load royalty transactions: ${e.message}`); 
    }
}

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
  getPortfolioStats, 
};