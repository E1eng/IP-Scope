// server/src/services/storyProtocol.service.js
// CommonJS style (require/module.exports)
// Dependency: axios, decimal.js for precise currency math
const axios = require('axios');
const Decimal = require('decimal.js');

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

/**
 * formatTokenAmountWithDecimals
 * Generic formatter for BigInt amounts with arbitrary decimals (default 18).
 * Returns a readable string with up to 4 fractional digits.
 */
const formatTokenAmountWithDecimals = (rawAmount, decimals = 18, maxFractionDigits = 4) => {
    try {
        const amount = BigInt(String(rawAmount || 0n));
        const tokenDecimals = Number.isFinite(decimals) ? Math.max(0, parseInt(decimals, 10)) : 18;

        const scale = BigInt(10) ** BigInt(tokenDecimals);
        const integerPart = amount / scale;
        const remainder = amount % scale;

        if (remainder === 0n) {
            return `${integerPart.toString()}.00`;
        }

        // Build a zero-padded fraction then trim to maxFractionDigits without rounding
        const fractionRaw = remainder.toString().padStart(tokenDecimals, '0');
        const fractionTrimmed = fractionRaw.slice(0, Math.min(maxFractionDigits, fractionRaw.length)).replace(/0+$/, '');
        return `${integerPart.toString()}.${fractionTrimmed || '0'}`;
    } catch (e) {
        console.error(`[FORMAT_ERROR] Failed formatting token amount ${rawAmount} with decimals ${decimals}`, e);
        return 'N/A';
    }
};

/**
 * computeUsdtValue
 * Convert BigInt amount with decimals and a USD price into a Decimal USDT value.
 * Assumes USDT ~ USD 1:1.
 */
const computeUsdtValue = (rawAmount, decimals = 18, usdPrice) => {
    try {
        const amount = new Decimal(String(rawAmount || 0));
        const scale = new Decimal(10).pow(new Decimal(decimals || 18));
        const normalized = amount.div(scale);
        const price = new Decimal(usdPrice || 0);
        return normalized.mul(price);
    } catch (e) {
        return new Decimal(0);
    }
};

/**
 * formatUsdtCurrency
 * Format Decimal value to a compact currency string, e.g., "$1,234.56 USDT".
 */
const formatUsdtCurrency = (decimalValue) => {
    try {
        const num = Number(decimalValue.toFixed(2));
        return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
    } catch {
        return '$0.00 USDT';
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
 * returns { amount: BigInt, decimals: number, symbol: string, tokenAddress: string|null, exchangeRateUsd: string|null, from, timestamp }
 */
const fetchTransactionDetailFromStoryScan = async (txHash) => {
    // If no API key, return default zero-value response (non-fatal)
    if (!storyScanApiKey) {
        return { amount: 0n, decimals: 18, symbol: 'ETH', tokenAddress: null, exchangeRateUsd: null, from: null, timestamp: null };
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
            const tokenAddress = royaltyTransfer.token?.address_hash || null;
            const exchangeRateUsd = royaltyTransfer.token?.exchange_rate ? String(royaltyTransfer.token.exchange_rate) : null;
            const from = txData.from?.hash || null;
            const timestamp = txData.timestamp || null;
            return { amount, decimals, symbol, tokenAddress, exchangeRateUsd, from, timestamp };
        }

        // Fallback: attempt to read native transfers if present
        if (txData.value) {
            try {
                const amount = BigInt(String(txData.value));
                return { amount, decimals: 18, symbol: 'ETH', tokenAddress: null, exchangeRateUsd: null, from: txData.from?.hash || null, timestamp: txData.timestamp || null };
            } catch (e) {
                // ignore parse
            }
        }

        return { amount: 0n, decimals: 18, symbol: 'ETH', tokenAddress: null, exchangeRateUsd: null, from: txData.from?.hash || null, timestamp: txData.timestamp || null };
    } catch (e) {
        const status = e.response?.status || 'Network Error';
        console.error(`[STORYSCAN ERROR] tx ${txHash} failed. Status: ${status}. Message: ${e.message}`);
        if (status === 429) console.error('>>> DIAGNOSTIC: StoryScan rate limit (429). Consider retry/backoff.');
        return { amount: 0n, decimals: 18, symbol: 'ETH', tokenAddress: null, exchangeRateUsd: null, from: null, timestamp: null };
    }
};

/**
 * getAndAggregateRoyaltyEventsFromApi
 * - Query Story Transactions API with ipId AS-IS (checksum) first (as in your working playground example)
 * - If no results, try lowercase fallback (some APIs are case-sensitive)
 * - For each returned event, fetch detail from StoryScan to extract actual token transfer amount
 * Returns: {
 *   totalRoyaltiesByToken: Map(symbol => { total: BigInt, decimals: Number, address?: string|null, lastExchangeRateUsd?: string|null }),
 *   licenseeMap: Map(from => { address, count, totalWei: BigInt })
 * }
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
        const tokenAddress = txDetail.tokenAddress || null;
        const exchangeRateUsd = txDetail.exchangeRateUsd || null;

        if (amount > 0n) {
            // update token aggregate
            const existing = totalRoyaltiesByToken.get(symbol) || { total: 0n, decimals, address: tokenAddress || null, lastExchangeRateUsd: null };
            existing.total = existing.total + amount;
            // keep decimals from first seen token (if different, it's OK)
            existing.decimals = existing.decimals || decimals;
            if (tokenAddress && !existing.address) existing.address = tokenAddress;
            if (exchangeRateUsd) existing.lastExchangeRateUsd = String(exchangeRateUsd);
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
    if (!ownerAddress) return { totalAssets: 0, totalRoyalties: '$0.00 USDT', overallDisputeStatus: '0' };

    const MAX_ASSET_LIMIT = 200;
    const assetResp = await getAssetsByOwner(ownerAddress, MAX_ASSET_LIMIT, 0);
    const allAssets = assetResp.data || [];
    const totalAssets = assetResp.pagination?.total || allAssets.length;

    if (allAssets.length === 0) {
        return { totalAssets, totalRoyalties: '$0.00 USDT', overallDisputeStatus: '0' };
    }

    // Aggregates per token across the whole portfolio
    const portfolioTotalsByToken = new Map(); // symbol => { total: BigInt, decimals, address, lastExchangeRateUsd }
    let overallDisputeStatus = 'None';
    let activeDisputeCount = 0;

    for (const asset of allAssets) {
        try {
            const ipIdForAggregation = asset.ipId;
            const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(ipIdForAggregation);

            // Merge per-token totals into portfolioTotalsByToken
            for (const [symbol, data] of totalRoyaltiesByToken.entries()) {
                const existing = portfolioTotalsByToken.get(symbol) || { total: 0n, decimals: data.decimals, address: data.address || null, lastExchangeRateUsd: data.lastExchangeRateUsd || null };
                existing.total = (existing.total || 0n) + (data.total || 0n);
                if (!existing.decimals && data.decimals) existing.decimals = data.decimals;
                if (!existing.address && data.address) existing.address = data.address;
                if (!existing.lastExchangeRateUsd && data.lastExchangeRateUsd) existing.lastExchangeRateUsd = data.lastExchangeRateUsd;
                portfolioTotalsByToken.set(symbol, existing);
            }

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

    // Compute total USDT using last seen price per token
    let totalUsdt = new Decimal(0);
    for (const [, data] of portfolioTotalsByToken.entries()) {
        const usdt = computeUsdtValue(data.total || 0n, data.decimals || 18, data.lastExchangeRateUsd || 0);
        totalUsdt = totalUsdt.add(usdt);
    }

    return {
        totalAssets,
        totalRoyalties: formatUsdtCurrency(totalUsdt),
        overallDisputeStatus: activeDisputeCount > 0 ? String(activeDisputeCount) : '0',
        breakdownByToken: Array.from(portfolioTotalsByToken.entries()).map(([symbol, d]) => ({
            symbol,
            address: d.address || null,
            amountFormatted: formatTokenAmountWithDecimals(d.total || 0n, d.decimals || 18, 6),
            rawAmount: (d.total || 0n).toString(),
            decimals: d.decimals || 18,
            lastExchangeRateUsd: d.lastExchangeRateUsd || null,
            usdtValue: computeUsdtValue(d.total || 0n, d.decimals || 18, d.lastExchangeRateUsd || 0).toNumber()
        }))
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
        const formattedRoyalties = Array.from(totalRoyaltiesByToken.entries()).map(([symbol, data]) => {
            const amountFormatted = formatTokenAmountWithDecimals(data.total || 0n, data.decimals || 18, 6);
            const usdtVal = computeUsdtValue(data.total || 0n, data.decimals || 18, data.lastExchangeRateUsd || 0);
            return {
                currency: symbol,
                tokenAddress: data.address || null,
                totalValue: amountFormatted,
                rawTotal: data.total ? data.total.toString() : '0',
                decimals: data.decimals || 18,
                exchangeRateUsd: data.lastExchangeRateUsd || null,
                usdtValue: usdtVal.toNumber(),
                usdtFormatted: formatUsdtCurrency(usdtVal)
            };
        });
        analytics.totalRoyaltiesPaid = formattedRoyalties; // array of per-token objects
        analytics.disputeStatus = assetDisputeStatus;
    } catch (e) {
        analytics.errorMessage = e.message;
    }

    asset.analytics = analytics;
    asset.disputeStatus = assetDisputeStatus;
    return asset;
};


/**
 * Internal: fetch RoyaltyPaid events for an asset with StoryScan details
 * Returns array of { txHash, timestampSec, symbol, decimals, amount: BigInt, exchangeRateUsd, from }
 */
const fetchRoyaltyTxDetailsForAsset = async (ipId) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    const txResp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, {
        where: { ipIds: [ipId], eventTypes: ["RoyaltyPaid"] },
        pagination: { limit: 300 },
        orderBy: 'blockNumber',
        orderDirection: 'desc'
    }, 'POST');
    const events = txResp.events || txResp.data || [];
    if (!Array.isArray(events) || events.length === 0) return [];

    const detailPromises = events.map(ev => {
        const txHash = ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash;
        return fetchTransactionDetailFromStoryScan(txHash).then(detail => ({ txHash, detail }));
    });
    const detailed = await Promise.all(detailPromises);
    return detailed.map(d => ({
        txHash: d.txHash,
        timestampSec: d.detail?.timestamp || null,
        symbol: d.detail?.symbol || 'ETH',
        decimals: d.detail?.decimals || 18,
        amount: d.detail?.amount || 0n,
        exchangeRateUsd: d.detail?.exchangeRateUsd || null,
        from: d.detail?.from || null
    })).filter(x => x.amount && x.amount > 0n && x.timestampSec);
};

/**
 * getPortfolioTimeSeries(ownerAddress, bucket = 'daily', days = 90)
 * Returns: { bucket: 'daily'|'weekly'|'monthly', points: [{ key, date, totalUsdt }] }
 */
const getPortfolioTimeSeries = async (ownerAddress, bucket = 'daily', days = 90) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return { bucket, points: [] };

    const clampBucket = (b) => (['daily', 'weekly', 'monthly'].includes(b) ? b : 'daily');
    const finalBucket = clampBucket(bucket);
    const lookbackDays = Number.isFinite(days) ? Math.max(1, Math.min(365, parseInt(days, 10))) : 90;
    const sinceEpochMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

    const assetsResp = await getAssetsByOwner(ownerAddress, 200, 0);
    const assets = assetsResp.data || [];
    if (assets.length === 0) return { bucket: finalBucket, points: [] };

    // Helper: bucket key builder
    const toBucketKey = (date) => {
        const d = new Date(date);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        if (finalBucket === 'daily') return `${y}-${m}-${day}`;
        if (finalBucket === 'monthly') return `${y}-${m}`;
        // weekly: ISO week number
        const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        // Thursday in current week decides the year
        tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
        return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const bucketMap = new Map(); // key => Decimal USDT

    for (const asset of assets) {
        const txs = await fetchRoyaltyTxDetailsForAsset(asset.ipId);
        for (const tx of txs) {
            const tsMs = (tx.timestampSec || 0) * 1000;
            if (tsMs < sinceEpochMs) continue;
            const usdt = computeUsdtValue(tx.amount, tx.decimals, tx.exchangeRateUsd || 0);
            if (usdt.lte(0)) continue;
            const key = toBucketKey(tsMs);
            const existing = bucketMap.get(key) || new Decimal(0);
            bucketMap.set(key, existing.add(usdt));
        }
    }

    // Convert to sorted points
    const points = Array.from(bucketMap.entries())
        .map(([key, dec]) => ({ key, date: key, totalUsdt: Number(dec.toFixed(2)) }))
        .sort((a, b) => a.key.localeCompare(b.key));

    return { bucket: finalBucket, points };
};

/**
 * getAssetLeaderboard(ownerAddress, limit = 10)
 * Returns: [{ ipId, title, usdtValue }]
 */
const getAssetLeaderboard = async (ownerAddress, limit = 10) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return [];
    const assetsResp = await getAssetsByOwner(ownerAddress, 200, 0);
    const assets = assetsResp.data || [];
    const rows = [];
    for (const asset of assets) {
        const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(asset.ipId);
        let usdt = new Decimal(0);
        for (const [, d] of totalRoyaltiesByToken.entries()) {
            usdt = usdt.add(computeUsdtValue(d.total || 0n, d.decimals || 18, d.lastExchangeRateUsd || 0));
        }
        rows.push({ ipId: asset.ipId, title: asset.title || 'Untitled', usdtValue: Number(usdt.toFixed(2)) });
    }
    rows.sort((a, b) => b.usdtValue - a.usdtValue);
    return rows.slice(0, Math.max(1, parseInt(limit, 10) || 10));
};

/**
 * getPortfolioLicensees(ownerAddress, limit = 10)
 * Returns: [{ address, count, usdtValue }]
 */
const getPortfolioLicensees = async (ownerAddress, limit = 10) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return [];
    const assetsResp = await getAssetsByOwner(ownerAddress, 200, 0);
    const assets = assetsResp.data || [];
    const licenseeTotals = new Map(); // address => { count, usdt: Decimal }

    for (const asset of assets) {
        const txs = await fetchRoyaltyTxDetailsForAsset(asset.ipId);
        for (const tx of txs) {
            if (!tx.from) continue;
            const usdt = computeUsdtValue(tx.amount, tx.decimals || 18, tx.exchangeRateUsd || 0);
            if (usdt.lte(0)) continue;
            const existing = licenseeTotals.get(tx.from) || { address: tx.from, count: 0, usdt: new Decimal(0) };
            existing.count += 1;
            existing.usdt = existing.usdt.add(usdt);
            licenseeTotals.set(tx.from, existing);
        }
    }

    const rows = Array.from(licenseeTotals.values()).map(x => ({ address: x.address, count: x.count, usdtValue: Number(x.usdt.toFixed(2)) }));
    rows.sort((a, b) => b.usdtValue - a.usdtValue);
    return rows.slice(0, Math.max(1, parseInt(limit, 10) || 10));
};

/**
 * getAssetsStatusSummary(ownerAddress)
 * Returns: { counts: { clear, active, resolved, pending }, assets: [{ ipId, title, disputeStatusMapped }] }
 */
const getAssetsStatusSummary = async (ownerAddress) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return { counts: { clear: 0, active: 0, resolved: 0, pending: 0 }, assets: [] };
    const assetsResp = await getAssetsByOwner(ownerAddress, 200, 0);
    const assets = assetsResp.data || [];
    const mapStatus = (status) => {
        const s = (status || 'None').toLowerCase();
        if (s === 'active') return 'Active Dispute';
        if (s === 'resolved') return 'Resolved Dispute';
        if (s === 'pending') return 'Pending';
        return 'Clear';
    };
    const counts = { clear: 0, active: 0, resolved: 0, pending: 0 };
    const list = assets.map(a => {
        const mapped = mapStatus(a.disputeStatus);
        if (mapped === 'Active Dispute') counts.active++;
        else if (mapped === 'Resolved Dispute') counts.resolved++;
        else if (mapped === 'Pending') counts.pending++;
        else counts.clear++;
        return { ipId: a.ipId, title: a.title || 'Untitled', disputeStatusMapped: mapped };
    });
    return { counts, assets: list };
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
    formatWeiToEther,
    // New analytics exports
    getPortfolioTimeSeries,
    getAssetLeaderboard,
    getPortfolioLicensees,
    getAssetsStatusSummary
};
