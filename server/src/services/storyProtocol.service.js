// server/src/services/storyProtocol.service.js
// CommonJS style (require/module.exports)
// Dependency: axios
const axios = require('axios');

/**
 * Utility: Mengubah BigInt wei ke string readable (sesuai style kamu).
 * Tetap mengembalikan string untuk aman dikirim ke client.
 */
const formatWeiToEther = (weiAmount) => {
    try {
        const wei = BigInt(weiAmount);
        // At least 19 chars to safely slice integer/decimal for 18 decimals
        let weiStr = wei.toString().padStart(19, '0');
        const integerPart = weiStr.slice(0, -18) || '0';
        const decimalPart = weiStr.slice(-18);

        if (decimalPart.replace(/0/g, '') === '') {
            return `${integerPart}.00`;
        }

        let formattedDecimal = decimalPart.replace(/0+$/, '');
        // keep first 4 decimal digits for display
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

/**
 * Generic fetch wrapper for Story APIs (assets/transactions)
 * - returns normalized shape for assets and transactions
 */
const fetchStoryApi = async (url, apiKey, body = {}, method = 'POST') => {
    const options = {
        method,
        url,
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
        },
        data: body,
        timeout: 15000,
    };

    try {
        const response = await axios(options);
        // The Story API sometimes uses .data.data or .data.events
        const respData = response.data || {};
        if (url.includes(STORY_ASSETS_API_BASE_URL)) {
            // expected shape: { data: [...], pagination: {...} }
            return { data: respData.data || respData, pagination: respData.pagination || {} };
        }
        if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) {
            // expected shape may be { events: [...] } or { data: [...]}
            return { events: respData.events || respData.data || [] };
        }
        return respData;
    } catch (error) {
        // Graceful fallback for 400/404
        const status = error.response?.status;
        if (status === 404 || status === 400) {
            if (url.includes(STORY_ASSETS_API_BASE_URL)) return { data: [], pagination: { total: 0 } };
            if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) return { events: [] };
        }
        // Diagnostic logs
        console.error(`[SERVICE_ERROR] Failed calling ${url}. Status: ${status || 'N/A'}. Message: ${error.message}`);
        if (status === 429) console.error('>>> DIAGNOSTIC: Rate-limited by Story API (429)');
        // bubble up a user-friendly error
        throw new Error(error.response ? `API Error ${status}` : 'Network/API request failed');
    }
};

/**
 * Fetch transaction detail from StoryScan (per-tx detail)
 * returns { amount: BigInt, decimals: number, symbol: string, from, timestamp }
 */
const fetchTransactionDetailFromStoryScan = async (txHash) => {
    // If no API key, return default zero-value response (non-fatal)
    if (!storyScanApiKey) {
        return { amount: 0n, decimals: 18, symbol: 'ETH', from: null, timestamp: null };
    }

    try {
        const url = `${STORY_TRANSACTION_DETAIL_BASE_URL}/${txHash}`;
        const resp = await axios.get(url, { headers: { 'X-Api-Key': storyScanApiKey }, timeout: 10000 });
        const txData = resp.data || {};

        // prefer token_transfers first element if exists, else fallback to other fields
        let royaltyTransfer = null;
        if (Array.isArray(txData.token_transfers) && txData.token_transfers.length > 0) {
            royaltyTransfer = txData.token_transfers[0];
        }

        if (royaltyTransfer && royaltyTransfer.total && royaltyTransfer.total.value) {
            const amount = BigInt(String(royaltyTransfer.total.value));
            const decimals = parseInt(royaltyTransfer.token?.decimals || 18, 10) || 18;
            const symbol = royaltyTransfer.token?.symbol || 'UNKNOWN';
            const from = txData.from?.hash || null;
            const timestamp = txData.timestamp || null;
            return { amount, decimals, symbol, from, timestamp };
        }

        // Fallback: attempt to read native transfers if present
        if (txData.value) {
            try {
                const amount = BigInt(String(txData.value));
                return { amount, decimals: 18, symbol: 'ETH', from: txData.from?.hash || null, timestamp: txData.timestamp || null };
            } catch (e) {
                // ignore parse
            }
        }

        return { amount: 0n, decimals: 18, symbol: 'ETH', from: txData.from?.hash || null, timestamp: txData.timestamp || null };
    } catch (e) {
        const status = e.response?.status || 'Network Error';
        console.error(`[STORYSCAN ERROR] tx ${txHash} failed. Status: ${status}. Message: ${e.message}`);
        if (status === 429) console.error('>>> DIAGNOSTIC: StoryScan rate limit (429). Consider retry/backoff.');
        return { amount: 0n, decimals: 18, symbol: 'ETH', from: null, timestamp: null };
    }
};

/**
 * getAndAggregateRoyaltyEventsFromApi
 * - Query Story Transactions API with ipId AS-IS (checksum) first (as in your working playground example)
 * - If no results, try lowercase fallback (some APIs are case-sensitive)
 * - For each returned event, fetch detail from StoryScan to extract actual token transfer amount
 * Returns: { totalRoyaltiesByToken: Map(symbol => { total: BigInt, decimals: Number }), licenseeMap: Map(from => { address, count, totalWei: BigInt }) }
 */
const getAndAggregateRoyaltyEventsFromApi = async (ipId) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    if (!ipId) {
        throw new Error("ipId is required");
    }

    // build request body using ipId AS-IS (checksum) per your working example
    const buildRequest = (id) => ({
        where: { eventTypes: ["RoyaltyPaid"], ipIds: [id] },
        pagination: { limit: 200 },
        orderBy: "blockNumber",
        orderDirection: "desc"
    });

    console.log(`[AGGR DEBUG] Querying transactions for IP ID ${ipId} (using AS-IS ID)...`);

    let txResp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, buildRequest(ipId), 'POST');
    let events = txResp.events || txResp.data || [];

    // fallback: try lowercase ipId if no events (some backends are inconsistent)
    if ((!events || events.length === 0) && ipId.toLowerCase() !== ipId) {
        console.log(`[AGGR DEBUG] No events for AS-IS IP ID; trying lowercase fallback ${ipId.toLowerCase()}`);
        txResp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, buildRequest(ipId.toLowerCase()), 'POST');
        events = txResp.events || txResp.data || [];
    }

    if (!events || events.length === 0) {
        console.log(`[AGGR RESULT] IP ID ${ipId}: No RoyaltyPaid events found.`);
        return { totalRoyaltiesByToken: new Map(), licenseeMap: new Map() };
    }

    // fetch details from StoryScan in parallel (but guard concurrency if necessary)
    const detailPromises = events.map(ev => {
        // some event shapes use txHash or transactionHash
        const txHash = ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash;
        return fetchTransactionDetailFromStoryScan(txHash).then(detail => ({ txHash, detail })).catch(err => ({ txHash, detail: { amount: 0n, decimals: 18, symbol: 'ETH', from: null } }));
    });

    const detailed = await Promise.all(detailPromises);

    const totalRoyaltiesByToken = new Map();
    const licenseeMap = new Map();
    let totalEthWei = 0n;

    for (const d of detailed) {
        const txDetail = d.detail || {};
        const amount = txDetail.amount || 0n;
        const symbol = txDetail.symbol || 'ETH';
        const from = txDetail.from || null;
        const decimals = txDetail.decimals || 18;

        if (amount > 0n) {
            // update token aggregate
            const existing = totalRoyaltiesByToken.get(symbol) || { total: 0n, decimals };
            existing.total = existing.total + amount;
            // keep decimals from first seen token (if different, it's OK)
            existing.decimals = existing.decimals || decimals;
            totalRoyaltiesByToken.set(symbol, existing);

            // track ETH total separately
            if (symbol === 'ETH' || symbol === 'WETH') {
                totalEthWei += amount;
            }
        }

        // licensee aggregation (by 'from')
        if (from) {
            const existingL = licenseeMap.get(from) || { address: from, count: 0, totalWei: 0n };
            existingL.count += 1;
            existingL.totalWei = existingL.totalWei + amount;
            licenseeMap.set(from, existingL);
        }
    }

    if (totalEthWei > 0n) {
        console.log(`[AGGR RESULT] IP ID ${ipId}: SUCCESS. Total ETH/WETH Wei: ${totalEthWei.toString()}`);
    } else {
        console.log(`[AGGR RESULT] IP ID ${ipId}: No valuable transfers found (Final Sum: 0).`);
    }

    return { totalRoyaltiesByToken, licenseeMap };
};


/**
 * getAssetsByOwner(owner, limit, offset, tokenContract)
 * - wrapper to call Story Assets API and return normalized shape
 */
const getAssetsByOwner = async (ownerAddress, limit = 20, offset = 0, tokenContract) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    const whereClause = {};
    if (ownerAddress) whereClause.ownerAddress = ownerAddress.trim();
    if (tokenContract) {
        const cleaned = tokenContract.trim();
        if (cleaned) whereClause.tokenContract = cleaned;
    }

    if (Object.keys(whereClause).length === 0) return { data: [], pagination: { total: 0 } };

    const requestBody = {
        includeLicenses: true,
        moderated: false,
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit, offset },
        where: whereClause
    };

    const resp = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody, 'POST');
    return resp;
};

/**
 * getPortfolioStats(ownerAddress)
 * - collects all assets (one page; can be extended to iterate pages)
 * - aggregates royalties only for ETH/WETH into globalTotalWei (uses BigInt)
 */
const getPortfolioStats = async (ownerAddress) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return { totalAssets: 0, totalRoyalties: '0.00 ETH', overallDisputeStatus: '0' };

    const MAX_ASSET_LIMIT = 200;
    const assetResp = await getAssetsByOwner(ownerAddress, MAX_ASSET_LIMIT, 0);
    const allAssets = assetResp.data || [];
    const totalAssets = assetResp.pagination?.total || allAssets.length;

    if (allAssets.length === 0) {
        return { totalAssets, totalRoyalties: '0.00 ETH', overallDisputeStatus: '0' };
    }

    let globalTotalWei = 0n;
    let overallDisputeStatus = 'None';
    let activeDisputeCount = 0;

    for (const asset of allAssets) {
        try {
            const ipIdForAggregation = asset.ipId;
            const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(ipIdForAggregation);

            // Add ETH/WETH totals if present
            if (totalRoyaltiesByToken.get('ETH')) globalTotalWei += totalRoyaltiesByToken.get('ETH').total || 0n;
            if (totalRoyaltiesByToken.get('WETH')) globalTotalWei += totalRoyaltiesByToken.get('WETH').total || 0n;

            // Dispute logic
            if (asset.disputeStatus === 'Active') {
                overallDisputeStatus = 'Active';
                activeDisputeCount++;
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
        overallDisputeStatus: activeDisputeCount > 0 ? String(activeDisputeCount) : '0'
    };
};


/**
 * getAssetDetails(ipId)
 * - calls assets API then aggregates royalties for that asset
 */
const getAssetDetails = async (ipId) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ipId) return null;

    // query both AS-IS and lowercase to be more tolerant
    const searchIpIds = [ipId];
    const lc = ipId.toLowerCase();
    if (lc !== ipId) searchIpIds.push(lc);

    const requestBody = {
        includeLicenses: true,
        moderated: false,
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit: 1 },
        where: { ipIds: searchIpIds }
    };

    const resp = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody, 'POST');
    const asset = (resp.data && resp.data.length > 0) ? resp.data[0] : null;
    if (!asset) return null;

    const assetDisputeStatus = asset.disputeStatus || 'None';
    const analytics = {};

    try {
        const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(ipId);
        const formattedRoyalties = Array.from(totalRoyaltiesByToken.entries()).map(([symbol, data]) => ({
            currency: symbol,
            totalValue: formatWeiToEther(data.total || 0n),
            rawTotal: data.total ? data.total.toString() : '0'
        }));
        analytics.totalRoyaltiesPaid = formattedRoyalties;
        analytics.disputeStatus = assetDisputeStatus;
    } catch (e) {
        analytics.errorMessage = e.message;
    }

    asset.analytics = analytics;
    asset.disputeStatus = assetDisputeStatus;
    return asset;
};


/**
 * getRoyaltyTransactions(ipId)
 * - returns array of transactions with formatted value & timestamp
 */
const getRoyaltyTransactions = async (ipId) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");

    // first aggregate (to ensure licensee map etc)
    const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(ipId);

    // fetch transaction list
    const txResp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, {
        where: { ipIds: [ipId], eventTypes: ["RoyaltyPaid"] },
        pagination: { limit: 200 },
    }, 'POST');
    const events = txResp.events || txResp.data || [];

    const detailPromises = events.map(ev => {
        const txHash = ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash;
        return fetchTransactionDetailFromStoryScan(txHash).then(detail => ({ txHash, detail }));
    });

    const detailed = await Promise.all(detailPromises);

    // map to UI shape, filter >0
    const mapped = detailed
        .filter(d => d.detail && d.detail.amount && d.detail.amount > 0n)
        .map(d => {
            const amount = d.detail.amount;
            const symbol = d.detail.symbol || 'ETH';
            const from = d.detail.from || 'N/A';
            const timestamp = d.detail.timestamp ? (new Date(d.detail.timestamp * 1000)).toISOString() : null;
            return {
                txHash: d.txHash,
                from,
                value: `${formatWeiToEther(amount)} ${symbol}`,
                timestamp,
                rawAmount: amount.toString()
            };
        });

    return mapped;
};


/**
 * getTopLicensees(ipId)
 * - returns top 3 licensees by totalWei descending
 */
const getTopLicensees = async (ipId) => {
    const { licenseeMap } = await getAndAggregateRoyaltyEventsFromApi(ipId);
    const arr = Array.from(licenseeMap.values()).map(item => ({
        address: item.address,
        count: item.count,
        totalWei: item.totalWei, // BigInt
        totalValueFormatted: formatWeiToEther(item.totalWei)
    }));

    // sort by BigInt totalWei desc
    arr.sort((a, b) => {
        if (a.totalWei === undefined || b.totalWei === undefined) return 0;
        if (a.totalWei > b.totalWei) return -1;
        if (a.totalWei < b.totalWei) return 1;
        return 0;
    });

    // convert totalWei to string-safe representation for JSON
    return arr.slice(0, 3).map(x => ({
        address: x.address,
        count: x.count,
        totalWei: x.totalWei.toString(),
        totalValueFormatted: x.totalValueFormatted
    }));
};


module.exports = {
    getAssetsByOwner,
    getAssetDetails,
    getRoyaltyTransactions,
    getTopLicensees,
    fetchTransactionDetailFromStoryScan,
    getPortfolioStats,
    getAndAggregateRoyaltyEventsFromApi,
    formatWeiToEther
};
