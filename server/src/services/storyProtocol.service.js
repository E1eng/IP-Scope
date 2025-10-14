const axios = require('axios');
const { get, set } = require('../utils/cache');
const { formatUnits } = require("viem");

// --- URL & API Key Configuration ---
const STORY_ASSETS_API_BASE_URL = 'https://api.storyapis.com/api/v4/assets';
const STORY_TRANSACTIONS_API_BASE_URL = 'https://api.storyapis.com/api/v4/transactions';
const STORYSCAN_API_BASE_URL = 'https://www.storyscan.io/api/v2';

const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;

// --- Axios Instances ---

// Instance untuk Story Protocol API (memerlukan X-Api-Key)
const storyApi = axios.create({
    headers: {
        'X-Api-Key': storyApiKey,
        'Content-Type': 'application/json',
    },
    timeout: 30000 // 30 second timeout
});

// Instance untuk StoryScan API (tidak memerlukan API key)
const storyScanApi = axios.create({
    baseURL: STORYSCAN_API_BASE_URL,
    headers: { 'accept': 'application/json' },
    timeout: 15000 // 15 second timeout
});


// --- Helper Functions ---

/**
 * Formats a raw token value string into a readable decimal format.
 * @param {string | bigint} value The raw value from the blockchain.
 * @param {number | string} decimals The number of decimals the token uses.
 * @returns {string} A formatted decimal string.
 */
const formatTokenValue = (value, decimals) => {
    try {
        const numDecimals = parseInt(decimals, 10);
        if (isNaN(numDecimals)) return '0.0000';
        return parseFloat(formatUnits(BigInt(value), numDecimals)).toFixed(4);
    } catch (e) {
        console.error(`Error formatting token value: ${value}`, e);
        return '0.0000';
    }
};

/**
 * Utility to format a BigInt representing Wei into a readable ETH string.
 * This is used for aggregating total values.
 */
const formatWeiToEther = (weiAmount) => {
    try {
        const wei = BigInt(weiAmount);
        return parseFloat(formatUnits(wei, 18)).toFixed(4);
    } catch (e) {
        console.error(`Error formatting Wei: ${weiAmount}`, e);
        return 'N/A';
    }
};


// --- Core Service Functions ---

/**
 * Fetches royalty events, gets details from StoryScan, and aggregates the data.
 * Enhanced with multiple extraction methods and better error handling.
 */
const getAndAggregateRoyaltyEventsFromApi = async (ipId) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    
    // STEP 1: Fetch RoyaltyPaid event logs to get transaction hashes.
    console.log(`[ROYALTY_FETCH] Step 1: Fetching RoyaltyPaid events for IP: ${ipId}`);
    
    const eventLogBody = {
        where: { eventTypes: ["RoyaltyPaid"], ipIds: [ipId] },
        pagination: { limit: 500, offset: 0 }, // Increased limit
        orderBy: "blockNumber",
        orderDirection: "desc"
    };

    let events = [];
    try {
        const response = await storyApi.post(STORY_TRANSACTIONS_API_BASE_URL, eventLogBody);
        events = response.data.data || [];
        console.log(`[ROYALTY_FETCH] ✓ Found ${events.length} RoyaltyPaid events for ${ipId}`);
        
        // DEBUG: Log sample event structure
        if (events.length > 0) {
            console.log(`[DEBUG] Sample event structure:`, JSON.stringify(events[0], null, 2));
        }
    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        console.error(`[ROYALTY_FETCH] ✗ Step 1 failed for ${ipId}. Status: ${status}, Message: ${message}`);
        
        // Return empty instead of throwing to not break portfolio aggregation
        return { transactions: [], totalWei: 0n, licenseeMap: new Map(), error: message };
    }

    if (events.length === 0) {
        console.log(`[ROYALTY_FETCH] No royalty events found for ${ipId}`);
        return { transactions: [], totalWei: 0n, licenseeMap: new Map() };
    }

    // STEP 2: Extract transaction data directly from events OR fetch from StoryScan
    const licenseeMap = new Map();
    let totalWei = 0n;
    const transactions = [];
    
    console.log(`[ROYALTY_FETCH] Step 2: Processing ${events.length} events...`);
    
    for (const event of events) {
        try {
            // Method 1: Try to extract data directly from event (Story API v4 might include this)
            let caller = event.from || event.sender;
            let rawValue = null;
            let decimals = 18; // Default to ETH decimals
            let symbol = 'ETH';
            
            // Check if event has embedded token data
            if (event.royaltyTokens && Array.isArray(event.royaltyTokens) && event.royaltyTokens.length > 0) {
                const royaltyToken = event.royaltyTokens[0];
                rawValue = royaltyToken.amount;
                symbol = royaltyToken.symbol || 'ETH';
                decimals = royaltyToken.decimals || 18;
                caller = royaltyToken.sender || caller;
                
                console.log(`[ROYALTY_FETCH] Direct extraction: ${rawValue} ${symbol} from ${caller}`);
            }
            // Method 2: Try to extract from log data
            else if (event.logData) {
                // Parse log data if available
                const logData = event.logData;
                if (logData.amount) rawValue = logData.amount;
                if (logData.token) symbol = logData.token;
                if (logData.sender) caller = logData.sender;
                
                console.log(`[ROYALTY_FETCH] Log extraction: ${rawValue} ${symbol} from ${caller}`);
            }
            // Method 3: Fallback to StoryScan API
            else if (event.transactionHash) {
                console.log(`[ROYALTY_FETCH] Fetching details from StoryScan for tx: ${event.transactionHash}`);
                try {
                    const txResponse = await storyScanApi.get(`/transactions/${event.transactionHash}`);
                    const txData = txResponse.data;
                    
                    // DEBUG: Log transaction structure
                    console.log(`[DEBUG] StoryScan tx structure:`, JSON.stringify(txData, null, 2));
                    
                    const royaltyTransfer = txData.token_transfers?.[0];
                    
                    if (royaltyTransfer && royaltyTransfer.total && royaltyTransfer.total.value) {
                        caller = txData.from.hash;
                        rawValue = royaltyTransfer.total.value;
                        decimals = parseInt(royaltyTransfer.token.decimals, 10);
                        symbol = royaltyTransfer.token.symbol;
                        
                        console.log(`[ROYALTY_FETCH] StoryScan extraction: ${rawValue} ${symbol} from ${caller}`);
                    } else {
                        console.warn(`[ROYALTY_FETCH] No token_transfers in StoryScan response for ${event.transactionHash}`);
                        continue;
                    }
                } catch (storyScanError) {
                    console.error(`[ROYALTY_FETCH] StoryScan fetch failed for ${event.transactionHash}:`, storyScanError.message);
                    continue;
                }
            }
            
            // Process the extracted data
            if (rawValue && caller) {
                const rawValueBigInt = BigInt(rawValue);
                
                // Normalize value to 18 decimals (Wei) for consistent total calculation
                const valueInWei = rawValueBigInt * (10n ** BigInt(18 - decimals));
                totalWei += valueInWei;

                // Update licensee map for "Top Licensees"
                const currentData = licenseeMap.get(caller) || { address: caller, count: 0, totalWei: 0n };
                currentData.count++;
                currentData.totalWei += valueInWei;
                licenseeMap.set(caller, currentData);

                // Prepare transaction object for the frontend ledger
                transactions.push({
                    txHash: event.transactionHash,
                    from: caller,
                    value: `${formatTokenValue(rawValueBigInt, decimals)} ${symbol}`,
                    timestamp: event.timestamp ? new Date(event.timestamp).toLocaleString('en-US') : 
                              event.blockTimestamp ? new Date(event.blockTimestamp * 1000).toLocaleString('en-US') :
                              `Block #${event.blockNumber}`
                });
            }
        } catch (eventError) {
            console.error(`[ROYALTY_FETCH] Error processing event:`, eventError.message);
            continue;
        }
    }
    
    console.log(`[ROYALTY_FETCH] ✓ Step 3: Successfully processed ${transactions.length}/${events.length} transactions. Total: ${formatWeiToEther(totalWei)} ETH`);
    
    return { transactions: transactions.reverse(), totalWei, licenseeMap };
};

/**
 * Get all IP Assets for a given filter set.
 */
const getAssetsByOwner = async (ownerAddress, limit = 20, offset = 0, tokenContract) => {
    const whereClause = {};
    if (ownerAddress) whereClause.ownerAddress = ownerAddress.trim();
    if (tokenContract) whereClause.tokenContract = tokenContract.trim();

    if (Object.keys(whereClause).length === 0) {
        return { data: [], pagination: { total: 0 } };
    }

    const cacheKey = `assets:owner:${ownerAddress || 'none'}:${limit}:${offset}:${tokenContract || 'all'}`;
    const cachedResponse = get(cacheKey);
    if (cachedResponse) {
        console.log(`[SERVICE] Serving assets from cache for filter: ${cacheKey}`);
        return cachedResponse;
    }
    
    const requestBody = {
        includeLicenses: true,
        moderated: false,
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit, offset },
        where: whereClause
    };
    
    try {
        const response = await storyApi.post(STORY_ASSETS_API_BASE_URL, requestBody);
        const result = { data: response.data.data, pagination: response.data.pagination };
        set(cacheKey, result);
        return result;
    } catch (error) {
        console.error(`[SERVICE_ERROR] Failed to get assets by owner:`, error.message);
        throw error;
    }
};

/**
 * Aggregates portfolio-wide stats (Royalties and Dispute Status) for the dashboard.
 * Enhanced with better error handling and logging.
 */
const getPortfolioStats = async (ownerAddress) => {
    if (!ownerAddress) {
        console.warn('[PORTFOLIO_STATS] No owner address provided');
        return { totalAssets: 0, totalRoyalties: '0.00 ETH', overallDisputeStatus: 'N/A' };
    }
    
    console.log(`[PORTFOLIO_STATS] Starting stats calculation for: ${ownerAddress}`);
    
    // Fetch all assets (increased limit for better coverage)
    let allAssets = [];
    let totalAssets = 0;
    
    try {
        const assetResponse = await getAssetsByOwner(ownerAddress, 500, 0); // Increased from 200 to 500
        allAssets = assetResponse.data;
        totalAssets = assetResponse.pagination?.total || 0;
        
        console.log(`[PORTFOLIO_STATS] ✓ Found ${allAssets.length} assets (Total: ${totalAssets})`);
    } catch (error) {
        console.error(`[PORTFOLIO_STATS] ✗ Failed to fetch assets:`, error.message);
        return { totalAssets: 0, totalRoyalties: 'Error', overallDisputeStatus: 'Error' };
    }

    if (allAssets.length === 0) {
        console.log(`[PORTFOLIO_STATS] No assets found for address`);
        return { totalAssets, totalRoyalties: '0.00 ETH', overallDisputeStatus: 'None' };
    }

    let globalTotalWei = 0n;
    let overallDisputeStatus = 'None';
    let successfulFetches = 0;
    let failedFetches = 0;

    console.log(`[PORTFOLIO_STATS] Processing royalty data for ${allAssets.length} assets...`);
    
    // Process royalty data for each asset with better error tracking
    const royaltyPromises = allAssets.map((asset, index) => 
        getAndAggregateRoyaltyEventsFromApi(asset.ipId.toLowerCase())
            .then(result => {
                if (result.error) {
                    console.warn(`[PORTFOLIO_STATS] Asset ${index + 1}/${allAssets.length} (${asset.ipId}): Error - ${result.error}`);
                    failedFetches++;
                    return { totalWei: 0n };
                }
                
                const ethValue = formatWeiToEther(result.totalWei);
                if (result.totalWei > 0n) {
                    console.log(`[PORTFOLIO_STATS] ✓ Asset ${index + 1}/${allAssets.length} (${asset.ipId}): ${ethValue} ETH from ${result.transactions.length} tx`);
                    successfulFetches++;
                } else {
                    console.log(`[PORTFOLIO_STATS] ○ Asset ${index + 1}/${allAssets.length} (${asset.ipId}): No royalties`);
                }
                
                return result;
            })
            .catch(e => {
                console.error(`[PORTFOLIO_STATS] ✗ Critical error processing ${asset.ipId}: ${e.message}`);
                failedFetches++;
                return { totalWei: 0n };
            })
    );

    const royaltyResults = await Promise.all(royaltyPromises);
    
    royaltyResults.forEach(result => {
        globalTotalWei += result.totalWei;
    });

    // Aggregate dispute status
    for (const asset of allAssets) {
        if (asset.disputeStatus === 'Active') {
            overallDisputeStatus = 'Active';
            break;
        } else if (asset.disputeStatus === 'Pending' && overallDisputeStatus === 'None') {
            overallDisputeStatus = 'Pending';
        }
    }
    
    const finalRoyaltyValue = formatWeiToEther(globalTotalWei);
    
    console.log(`[PORTFOLIO_STATS] ========== FINAL RESULTS ==========`);
    console.log(`[PORTFOLIO_STATS] Total Assets: ${totalAssets}`);
    console.log(`[PORTFOLIO_STATS] Total Royalties: ${finalRoyaltyValue} ETH`);
    console.log(`[PORTFOLIO_STATS] Successful Fetches: ${successfulFetches}/${allAssets.length}`);
    console.log(`[PORTFOLIO_STATS] Failed Fetches: ${failedFetches}/${allAssets.length}`);
    console.log(`[PORTFOLIO_STATS] Dispute Status: ${overallDisputeStatus}`);
    console.log(`[PORTFOLIO_STATS] ===================================`);
    
    return { 
        totalAssets, 
        totalRoyalties: `${finalRoyaltyValue} ETH`, 
        overallDisputeStatus
    };
};


// --- Other Exported Functions ---

const getAssetDetails = async (ipId) => {
    if (!ipId) return null;
    const lowerCaseIpId = ipId.toLowerCase(); 
    const cacheKey = `asset:detail:${ipId}`;
    let asset = get(cacheKey);

    if (!asset) { 
        const requestBody = {
            includeLicenses: true,
            moderated: false,
            pagination: { limit: 1 },
            where: { ipIds: [lowerCaseIpId] }
        };
        const response = await storyApi.post(STORY_ASSETS_API_BASE_URL, requestBody);
        asset = response.data.data?.[0];
    }
    
    if (!asset) return null;

    let analytics = { disputeStatus: asset.disputeStatus || 'None' };
    try {
        const { totalWei } = await getAndAggregateRoyaltyEventsFromApi(lowerCaseIpId);
        analytics.totalRoyaltiesPaid = { ETH: formatWeiToEther(totalWei) };
    } catch (e) {
        console.error(`[API_ERROR] Failed to get royalty data for ${ipId}: ${e.message}`);
        analytics.errorMessage = e.message; 
    }
    
    asset.analytics = analytics;
    set(cacheKey, asset);
    return asset;
};

const getRoyaltyTransactions = async (ipId) => {
    const { transactions } = await getAndAggregateRoyaltyEventsFromApi(ipId);
    return transactions;
};

const getTopLicensees = async (ipId) => {
    const { licenseeMap } = await getAndAggregateRoyaltyEventsFromApi(ipId);
    const licensees = Array.from(licenseeMap.values()).map(lic => ({
        ...lic,
        totalValue: `${formatWeiToEther(lic.totalWei)} ETH`,
    }));
    licensees.sort((a, b) => (b.totalWei > a.totalWei) ? 1 : -1);
    return licensees.slice(0, 3);
};

const fetchTransactionDetail = async (txHash) => {
    try {
        const response = await storyScanApi.get(`/transactions/${txHash}`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) { return { error: 'Transaction not found on StoryScan' }; }
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