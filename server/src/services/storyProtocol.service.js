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
    }
});

// Instance untuk StoryScan API (tidak memerlukan API key)
const storyScanApi = axios.create({
    baseURL: STORYSCAN_API_BASE_URL,
    headers: { 'accept': 'application/json' }
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
 * This function implements the correct two-step data fetching logic.
 */
const getAndAggregateRoyaltyEventsFromApi = async (ipId) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    
    // STEP 1: Fetch RoyaltyPaid event logs to get transaction hashes.
    console.log(`[SERVICE] Step 1: Fetching RoyaltyPaid event logs for IP ID: ${ipId}`);
    const eventLogBody = {
        where: { eventTypes: ["RoyaltyPaid"], ipIds: [ipId] },
        pagination: { limit: 200 }, // Fetch up to 200 events
        orderBy: "blockNumber",
        orderDirection: "desc"
    };

    let events;
    try {
        const response = await storyApi.post(STORY_TRANSACTIONS_API_BASE_URL, eventLogBody);
        events = response.data.data || [];
    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        console.error(`[SERVICE_ERROR] Step 1 failed for ${ipId}. Status: ${status}, Message: ${message}`);
        throw new Error(`Failed to fetch event logs for IP ID ${ipId}. Status: ${status}`);
    }

    if (events.length === 0) {
        return { transactions: [], totalWei: 0n, licenseeMap: new Map() };
    }

    // STEP 2: Fetch detailed transaction data from StoryScan for each transaction hash.
    const txHashes = events.map(event => event.transactionHash);
    console.log(`[SERVICE] Step 2: Found ${txHashes.length} events. Fetching details from StoryScan...`);

    const txDetailPromises = txHashes.map(hash =>
        storyScanApi.get(`/transactions/${hash}`).catch(err => {
            console.error(`Failed to fetch detail for tx ${hash}:`, err.message);
            return null; // Return null on failure to not break Promise.all
        })
    );
    const txDetailsResponses = await Promise.all(txDetailPromises);

    // STEP 3: Process and aggregate the detailed data from StoryScan.
    const licenseeMap = new Map();
    let totalWei = 0n;
    const transactions = [];

    txDetailsResponses.forEach(res => {
        if (!res || !res.data) return; // Skip failed fetches

        const txData = res.data;
        const royaltyTransfer = txData.token_transfers?.[0];

        if (royaltyTransfer && royaltyTransfer.total && royaltyTransfer.total.value) {
            const caller = txData.from.hash;
            const rawValue = BigInt(royaltyTransfer.total.value);
            const decimals = parseInt(royaltyTransfer.token.decimals, 10);
            const symbol = royaltyTransfer.token.symbol;

            // Normalize value to 18 decimals (Wei) for consistent total calculation
            const valueInWei = rawValue * (10n ** BigInt(18 - decimals));
            totalWei += valueInWei;

            // Update licensee map for "Top Licensees"
            const currentData = licenseeMap.get(caller) || { address: caller, count: 0, totalWei: 0n };
            currentData.count++;
            currentData.totalWei += valueInWei;
            licenseeMap.set(caller, currentData);

            // Prepare transaction object for the frontend ledger
            transactions.push({
                txHash: txData.hash,
                from: caller,
                value: `${formatTokenValue(rawValue, decimals)} ${symbol}`,
                timestamp: txData.timestamp ? new Date(txData.timestamp).toLocaleString('en-US') : `Block #${txData.block}`
            });
        }
    });
    
    console.log(`[SERVICE] Step 3: Successfully processed ${transactions.length} transactions.`);
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
 */
const getPortfolioStats = async (ownerAddress) => {
    if (!ownerAddress) {
        return { totalAssets: 0, totalRoyalties: '0.00 ETH', overallDisputeStatus: 'N/A' };
    }
    
    let allAssets = [];
    const assetResponse = await getAssetsByOwner(ownerAddress, 200, 0); // Cap at 200 assets for performance
    allAssets = assetResponse.data;
    const totalAssets = assetResponse.pagination?.total || 0;

    if (allAssets.length === 0) {
        return { totalAssets, totalRoyalties: '0.00 ETH', overallDisputeStatus: 'None' };
    }

    let globalTotalWei = 0n;
    let overallDisputeStatus = 'None';

    const royaltyPromises = allAssets.map(asset => 
        getAndAggregateRoyaltyEventsFromApi(asset.ipId.toLowerCase())
            .catch(e => {
                console.error(`Error processing IP ID ${asset.ipId}: ${e.message}`);
                return { totalWei: 0n }; // Return 0 on failure
            })
    );

    const royaltyResults = await Promise.all(royaltyPromises);
    royaltyResults.forEach(result => {
        globalTotalWei += result.totalWei;
    });

    // Simple dispute status aggregation
    for (const asset of allAssets) {
        if (asset.disputeStatus === 'Active') {
            overallDisputeStatus = 'Active';
            break;
        } else if (asset.disputeStatus === 'Pending' && overallDisputeStatus === 'None') {
            overallDisputeStatus = 'Pending';
        }
    }
    
    return { 
        totalAssets, 
        totalRoyalties: `${formatWeiToEther(globalTotalWei)} ETH`, 
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
