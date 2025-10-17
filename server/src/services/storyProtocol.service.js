// server/src/services/storyProtocol.service.js
// CommonJS style (require/module.exports)
// Dependency: axios
const axios = require('axios');
const Decimal = require('decimal.js');

// Configure axios for better performance with connection pooling
const http = require('http');
const https = require('https');

// Create agents with connection pooling
const httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000
});

// Configure axios defaults
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 5000; // 5 second default timeout

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
 * Generic formatter for BigInt token amounts with arbitrary decimals.
 * Returns a readable string with up to 6 fractional digits (trimmed).
 */
const formatTokenAmountWithDecimals = (rawAmount, decimals = 18, maxFractionDigits = 6) => {
    try {
        const amount = BigInt(String(rawAmount || 0n));
        const tokenDecimals = Number.isFinite(decimals) ? Math.max(0, parseInt(decimals, 10)) : 18;
        const scale = BigInt(10) ** BigInt(tokenDecimals);
        const integerPart = amount / scale;
        const remainder = amount % scale;
        if (remainder === 0n) return `${integerPart.toString()}.00`;
        const fractionRaw = remainder.toString().padStart(tokenDecimals, '0');
        const fractionTrimmed = fractionRaw.slice(0, Math.min(maxFractionDigits, fractionRaw.length)).replace(/0+$/, '');
        return `${integerPart.toString()}.${fractionTrimmed || '0'}`;
    } catch (e) {
        console.error('[FORMAT_ERROR] formatTokenAmountWithDecimals failed', e);
        return 'N/A';
    }
};

/**
 * computeUsdtValue
 * Convert BigInt amount with decimals and a USD price into a Decimal USDT value.
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

// --- Timestamp helpers ---
const normalizeTimestampSec = (ts) => {
    try {
        if (ts === null || ts === undefined) return null;
        if (typeof ts === 'number') {
            if (!Number.isFinite(ts)) return null;
            // treat as seconds if looks like seconds, else ms
            return ts > 1e12 ? Math.floor(ts / 1000) : Math.floor(ts);
        }
        if (typeof ts === 'string') {
            const asInt = parseInt(ts, 10);
            if (Number.isFinite(asInt) && !isNaN(asInt)) {
                return asInt > 1e12 ? Math.floor(asInt / 1000) : asInt;
            }
            const parsed = Date.parse(ts); // milliseconds
            if (Number.isFinite(parsed)) return Math.floor(parsed / 1000);
        }
        return null;
    } catch {
        return null;
    }
};

const STORY_ASSETS_API_BASE_URL = 'https://api.storyapis.com/api/v4/assets';
const STORY_TRANSACTIONS_API_BASE_URL = 'https://api.storyapis.com/api/v4/transactions';
const STORY_DISPUTES_API_BASE_URL = 'https://api.storyapis.com/api/v4/disputes';
const STORYSCAN_API_BASE_URL = 'https://www.storyscan.io/api/v2';
const STORY_TRANSACTION_DETAIL_BASE_URL = `${STORYSCAN_API_BASE_URL}/transactions`;

const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;
const storyScanApiKey = process.env.STORYSCAN_API_KEY;
const DEBUG_AGGR_LOGS = process.env.DEBUG_AGGR_LOGS === '1';
// StoryScan: 10 RPS personal (not shared) - be conservative
const STORYSCAN_RPS = parseInt(process.env.STORYSCAN_RPS || '8', 10); // Conservative: 8 RPS instead of 10
// Story Protocol: 300 RPS (unknown if shared or personal) - be conservative
const STORYAPI_RPS = parseInt(process.env.STORYAPI_RPS || '250', 10); // Conservative: 250 RPS instead of 300

// StoryScan API base URL
const STORYSCAN_API_BASE = 'https://www.storyscan.io/api/v2';

// --- Optimized cache settings for faster loading ---
const CACHE_TTL_MS = parseInt(process.env.AGGREGATION_CACHE_TTL_MS || '600000', 10); // default 10 minutes (increased)
const TX_DETAIL_TTL_MS = parseInt(process.env.TX_DETAIL_TTL_MS || '172800000', 10); // default 48 hours (increased for StoryScan)
const TOKEN_PRICE_TTL_MS = parseInt(process.env.TOKEN_PRICE_TTL_MS || '1800000', 10); // default 30 minutes
const ASSETS_CACHE_TTL_MS = parseInt(process.env.ASSETS_CACHE_TTL_MS || '300000', 10); // default 5 minutes (increased)
const FAST_MODE = process.env.FAST_MODE === '1'; // Enable fast mode to skip heavy operations
const nowMs = () => Date.now();
const withTtl = (value) => ({ value, expiresAt: nowMs() + CACHE_TTL_MS });
const isFresh = (entry) => entry && entry.expiresAt && entry.expiresAt > nowMs();

const cache = {
    portfolioStatsByOwner: new Map(), // key: owner
    assetLeaderboardByOwner: new Map(), // key: owner
    licenseeLeaderboardByOwner: new Map(), // key: owner
    txDetailByHash: new Map(), // key: txHash -> { value, expiresAt }
    tokenPriceBySymbol: new Map(), // key: symbol -> { value: Decimal, expiresAt }
    assetsByKey: new Map(), // key: `${owner}|${contract}|${limit}|${offset}` -> { value, expiresAt }
};
const assetsCacheSet = (key, value) => cache.assetsByKey.set(key, { value, expiresAt: nowMs() + ASSETS_CACHE_TTL_MS });
const assetsCacheGet = (key) => {
    const entry = cache.assetsByKey.get(key);
    if (entry && entry.expiresAt > nowMs()) return entry.value;
    return null;
};
// Coalesce concurrent identical /assets calls
const assetsInFlightByKey = new Map(); // key -> Promise
// --- Global StoryScan rate limiter (token bucket, shared across all calls) ---
let scanTokens = STORYSCAN_RPS;
let scanLastRefill = Date.now();
const refillIntervalMs = 1000; // 1 second interval for more conservative rate limiting
const refillScanTokens = () => {
    const now = Date.now();
    const elapsed = now - scanLastRefill;
    if (elapsed >= refillIntervalMs) {
        const refillCount = Math.floor(elapsed / refillIntervalMs);
        scanTokens = Math.min(STORYSCAN_RPS, scanTokens + refillCount * STORYSCAN_RPS);
        scanLastRefill += refillCount * refillIntervalMs;
    }
};
const acquireScanToken = async () => {
    // wait until a token is available
    // eslint-disable-next-line no-constant-condition
    while (true) {
        refillScanTokens();
        if (scanTokens > 0) {
            scanTokens -= 1;
            return;
        }
        // sleep a short time before checking again
        // eslint-disable-next-line no-await-in-loop
        await sleep(25); // Reduced delay for better performance
    }
};
const limitedStoryScanGet = async (url, options = {}, retries = 2) => {
    await acquireScanToken();
    try {
        const response = await axios.get(url, {
            ...options,
            timeout: 10000, // Increased timeout for StoryScan
            headers: {
                ...options.headers,
                'User-Agent': 'RoyaltyFlow/1.0 (StoryScan Rate Limited)'
            }
        });
        
        // Log rate limit headers for monitoring
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        if (DEBUG_AGGR_LOGS && (remaining || reset)) {
            console.log(`[STORYSCAN] Rate limit - Remaining: ${remaining}, Reset: ${reset}`);
        }
        
        return response;
    } catch (e) {
        const status = e.response?.status;
        // On 429, backoff with jitter and retry
        if (status === 429 && retries > 0) {
            const retryAfter = e.response?.headers['retry-after'];
            const backoffMs = retryAfter ? parseInt(retryAfter) * 1000 : (500 * (3 - retries) + Math.floor(Math.random() * 200));
            console.log(`[STORYSCAN] Rate limited, waiting ${backoffMs}ms before retry`);
            await sleep(backoffMs);
            return limitedStoryScanGet(url, options, retries - 1);
        }
        throw e;
    }
};

// --- Global Story API rate limiter (token bucket) ---
let apiTokens = STORYAPI_RPS;
let apiLastRefill = Date.now();
const refillApiTokens = () => {
    const now = Date.now();
    const elapsed = now - apiLastRefill;
    if (elapsed >= refillIntervalMs) {
        const refillCount = Math.floor(elapsed / refillIntervalMs);
        apiTokens = Math.min(STORYAPI_RPS, apiTokens + refillCount * STORYAPI_RPS);
        apiLastRefill += refillCount * refillIntervalMs;
    }
};
const acquireApiToken = async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        refillApiTokens();
        if (apiTokens > 0) {
            apiTokens -= 1;
            return;
        }
        // eslint-disable-next-line no-await-in-loop
        await sleep(5); // Reduced delay for better performance
    }
};
const limitedStoryApiRequest = async (options, retries = 1) => {
    await acquireApiToken();
    try {
        const response = await axios({
            ...options,
            timeout: 20000, // Increased timeout for Story Protocol API
            headers: {
                ...options.headers,
                'User-Agent': 'RoyaltyFlow/1.0 (Story Protocol Rate Limited)'
            }
        });
        
        // Log rate limit headers for monitoring
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        if (DEBUG_AGGR_LOGS && (remaining || reset)) {
            console.log(`[STORYAPI] Rate limit - Remaining: ${remaining}, Reset: ${reset}`);
        }
        
        return response;
    } catch (e) {
        const status = e.response?.status;
        // Handle 429 from Story API with small backoff
        if (status === 429 && retries > 0) {
            const retryAfter = e.response?.headers['retry-after'];
            const backoffMs = retryAfter ? parseInt(retryAfter) * 1000 : (200 * (2 - retries) + Math.floor(Math.random() * 100));
            console.log(`[STORYAPI] Rate limited, waiting ${backoffMs}ms before retry`);
            await sleep(backoffMs);
            return limitedStoryApiRequest(options, retries - 1);
        }
        throw e;
    }
};

const setTxDetailCache = (txHash, detail) => {
    cache.txDetailByHash.set(txHash, { value: detail, expiresAt: nowMs() + TX_DETAIL_TTL_MS });
};
const getTxDetailCache = (txHash) => {
    const entry = cache.txDetailByHash.get(txHash);
    if (entry && entry.expiresAt > nowMs()) return entry.value;
    return null;
};
const setTokenPrice = (symbol, price) => {
    if (!symbol || price === null || price === undefined) return;
    try {
        const dec = new Decimal(price);
        cache.tokenPriceBySymbol.set(symbol, { value: dec, expiresAt: nowMs() + TOKEN_PRICE_TTL_MS });
    } catch {}
};
const getTokenPrice = (symbol) => {
    const entry = cache.tokenPriceBySymbol.get(symbol);
    if (entry && entry.expiresAt > nowMs()) return entry.value;
    return null;
};

// --- Disputes helpers with robust fallbacks ---
const normalizeDisputesResponse = (resp) => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.disputes)) return resp.disputes;
    return [];
};

// --- Dispute via Transactions fallback (recommended by docs example) ---
const fetchDisputeEventsForIpIdPaginated = async (ipId, pageSize = 200) => {
    const candidates = [ipId];
    const lc = ipId?.toLowerCase?.();
    if (lc && lc !== ipId) candidates.push(lc);
    for (const candidateId of candidates) {
        const allEvents = [];
        let offset = 0;
        // Loop until API returns empty
        for (;;) {
            const body = {
                where: { eventTypes: ["DisputeRaised", "DisputeResolved"], ipIds: [candidateId] },
                pagination: { limit: pageSize, offset }
            };
            try {
                // eslint-disable-next-line no-await-in-loop
                const resp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, body, 'POST');
                const events = resp.events || resp.data || [];
                if (!events || events.length === 0) break;
                allEvents.push(...events);
                if (events.length < pageSize) break;
                offset += events.length;
            } catch {
                break;
            }
        }
        if (allEvents.length > 0) return allEvents;
    }
    return [];
};

const parseIsoOrNull = (s) => {
    try { const t = Date.parse(s); return Number.isFinite(t) ? t : null; } catch { return null; }
};

const deriveDisputeStatusFromEvents = (events) => {
    if (!Array.isArray(events) || events.length === 0) return null;
    const sorted = [...events].sort((a, b) => {
        const ta = parseIsoOrNull(a.createdAt) ?? 0;
        const tb = parseIsoOrNull(b.createdAt) ?? 0;
        if (ta !== tb) return ta - tb;
        const ba = (a.blockNumber || 0) - (b.blockNumber || 0);
        if (ba !== 0) return ba;
        return (a.logIndex || 0) - (b.logIndex || 0);
    });
    const last = sorted[sorted.length - 1];
    if (!last || !last.eventType) return null;
    if (String(last.eventType).toLowerCase().includes('resolveres') || String(last.eventType).toLowerCase() === 'disputeresolved') return 'Resolved';
    if (String(last.eventType).toLowerCase().includes('raise') || String(last.eventType).toLowerCase() === 'disputeraised') return 'Active';
    return null;
};

const getDisputeStatusFromTransactions = async (ipId) => {
    try {
        if (!ipId) return null;
        const evs = await fetchDisputeEventsForIpIdPaginated(ipId, 200);
        return deriveDisputeStatusFromEvents(evs);
    } catch { return null; }
};

const getDisputesByWhere = async (where, limit = 10) => {
    const body = { where, pagination: { limit } };
    const resp = await fetchStoryApi(STORY_DISPUTES_API_BASE_URL, storyApiKey, body, 'POST');
    return normalizeDisputesResponse(resp);
};

const getDisputeStatusForIpId = async (ipId) => {
    if (!ipId) return null;
    // Prefer targetIpId as per docs examples
    try {
        const arr = await getDisputesByWhere({ targetIpId: ipId }, 1);
        if (arr.length > 0) return arr[0]?.status || arr[0]?.state || 'Active';
    } catch {}
    // Try ipIds array
    try {
        const arr = await getDisputesByWhere({ ipIds: [ipId] }, 1);
        if (arr.length > 0) return arr[0]?.status || arr[0]?.state || 'Active';
    } catch {}
    // Try ipId single
    try {
        const arr = await getDisputesByWhere({ ipId }, 1);
        if (arr.length > 0) return arr[0]?.status || arr[0]?.state || 'Active';
    } catch {}
    // Try lowercase
    try {
        const lc = ipId.toLowerCase();
        if (lc !== ipId) {
            const arr = await getDisputesByWhere({ ipIds: [lc] }, 1);
            if (arr.length > 0) return arr[0]?.status || arr[0]?.state || 'Active';
        }
    } catch {}
    // GET fallback with query param
    try {
        const url = `${STORY_DISPUTES_API_BASE_URL}?ipId=${encodeURIComponent(ipId)}`;
        const resp = await axios.get(url, { headers: { 'X-Api-Key': storyApiKey }, timeout: 10000 });
        const arr = normalizeDisputesResponse(resp.data);
        if (arr.length > 0) return arr[0]?.status || arr[0]?.state || 'Active';
    } catch {}
    return null;
};

// --- Progress tracking for streaming aggregation ---
const progressByOwner = new Map(); // owner => { running, totalAssets, processedAssets, percent, displayPartial, updatedAt }

const updateProgress = (owner, patch) => {
    const prev = progressByOwner.get(owner) || { running: false, totalAssets: 0, processedAssets: 0, percent: 0, displayPartial: '$0.00 USDT', updatedAt: Date.now() };
    const next = { ...prev, ...patch, updatedAt: Date.now() };
    progressByOwner.set(owner, next);
    return next;
};

const getProgress = (owner) => {
    return progressByOwner.get(owner) || { running: false, totalAssets: 0, processedAssets: 0, percent: 0, displayPartial: '$0.00 USDT', updatedAt: null };
};

const startPortfolioAggregation = async (ownerAddress) => {
    if (!storyApiKey) throw new Error('STORY_PROTOCOL_API_KEY is not set');
    if (!ownerAddress) throw new Error('ownerAddress required');

    const existing = progressByOwner.get(ownerAddress);
    if (existing && existing.running) {
        return { alreadyRunning: true };
    }

    // Initialize progress
    updateProgress(ownerAddress, { running: true, totalAssets: 0, processedAssets: 0, percent: 0, displayPartial: '$0.00 USDT' });

    // Kick off async task (fire-and-forget)
    (async () => {
        try {
            // Use smaller limit only for very large datasets
            const MAX_ASSET_LIMIT = 200;
            const assetResp = await getAssetsByOwner(ownerAddress, MAX_ASSET_LIMIT, 0);
            const allAssets = assetResp.data || [];
            const totalAssets = assetResp.pagination?.total || allAssets.length;
            updateProgress(ownerAddress, { totalAssets });

            const totalsByToken = new Map(); // symbol => { totalRaw: BigInt, decimals, usdt: Decimal }
            // Use smaller batch size only for very large datasets to avoid timeout
            const BATCH_SIZE = totalAssets > 200 ? 3 : (totalAssets > 100 ? 5 : 10);
            let processedAssets = 0;

            for (let i = 0; i < allAssets.length; i += BATCH_SIZE) {
                const slice = allAssets.slice(i, i + BATCH_SIZE);
                const details = await Promise.all(slice.map(async (asset) => {
                    try {
                        const txs = await fetchRoyaltyTxDetailsForAsset(asset.ipId);
                        return { asset, txs };
                    } catch {
                        return { asset, txs: [] };
                    }
                }));

                for (const { txs } of details) {
                    for (const tx of txs) {
                        const symbol = tx.symbol || 'UNKNOWN';
                        const decimals = tx.decimals || 18;
                        const usdt = computeUsdtValue(tx.amount, decimals, tx.exchangeRateUsd || 0);
                        const existingTok = totalsByToken.get(symbol) || { totalRaw: 0n, decimals, usdt: new Decimal(0) };
                        existingTok.totalRaw = (existingTok.totalRaw || 0n) + (tx.amount || 0n);
                        if (!existingTok.decimals) existingTok.decimals = decimals;
                        existingTok.usdt = existingTok.usdt.add(usdt);
                        totalsByToken.set(symbol, existingTok);
                    }
                }

                processedAssets += details.length;
                const percent = totalAssets > 0 ? Math.min(100, Math.round((processedAssets / totalAssets) * 100)) : 0;
                // Build partial display string (prefer WIP if present)
                let partialUsdt = new Decimal(0);
                let wipRaw = 0n; let wipDecimals = 18;
                for (const [sym, data] of totalsByToken.entries()) {
                    partialUsdt = partialUsdt.add(data.usdt || 0);
                    if (sym === 'WIP') { wipRaw = (data.totalRaw || 0n); wipDecimals = data.decimals || 18; }
                }
                const displayPartial = (wipRaw && wipRaw > 0n)
                    ? `${formatTokenAmountWithDecimals(wipRaw, wipDecimals, 4)} WIP (${formatUsdtCurrency(partialUsdt)})`
                    : `${formatUsdtCurrency(partialUsdt)}`;
                updateProgress(ownerAddress, { processedAssets, percent, displayPartial, running: true });
            }

            // Finalize: compute full result and populate cache
            let finalUsdt = new Decimal(0);
            for (const [, d] of totalsByToken.entries()) finalUsdt = finalUsdt.add(d.usdt || 0);
            // Compute dispute counts across loaded assets
            let activeDisputeCount = 0;
            for (const a of allAssets) {
                const s = String(a.disputeStatus || '').toLowerCase();
                if (s === 'active') activeDisputeCount++;
            }
            const overallDisputeStatus = activeDisputeCount > 0 ? String(activeDisputeCount) : '0';
            const result = {
                totalAssets,
                totalRoyalties: formatUsdtCurrency(finalUsdt),
                overallDisputeStatus,
                breakdownByToken: Array.from(totalsByToken.entries()).map(([symbol, d]) => ({
                    symbol,
                    address: null,
                    amountFormatted: formatTokenAmountWithDecimals(d.totalRaw || 0n, d.decimals || 18, 6),
                    rawAmount: (d.totalRaw || 0n).toString(),
                    decimals: d.decimals || 18,
                    usdtValue: Number((d.usdt || new Decimal(0)).toFixed(2))
                })),
                displayTotal: getProgress(ownerAddress).displayPartial
            };
            cache.portfolioStatsByOwner.set(ownerAddress, withTtl(result));
            updateProgress(ownerAddress, { running: false, percent: 100 });
        } catch (e) {
            console.error('[AGGREGATOR] Failed aggregation job', e);
            updateProgress(ownerAddress, { running: false });
        }
    })();

    return { started: true };
};

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
        timeout: 20000, // Increased timeout for better reliability with conservative rate limiting
    };

    const fetchWithRetry = async (opts, retries = 1, backoffMs = 300) => {
        let attempt = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                // Respect global Story API rate limit
                return await limitedStoryApiRequest(opts);
            } catch (err) {
                const status = err.response?.status;
                const retriable = !status || status >= 500 || err.code === 'ECONNABORTED';
                if (attempt >= retries || !retriable) throw err;
                // backoff
                // eslint-disable-next-line no-await-in-loop
                await sleep(backoffMs * Math.pow(2, attempt));
                attempt += 1;
            }
        }
    };

    try {
        const response = await fetchWithRetry(options);
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
        if (status === 404 || status === 400 || status === 422) {
            if (url.includes(STORY_ASSETS_API_BASE_URL)) return { data: [], pagination: { total: 0 } };
            if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) return { events: [] };
            if (typeof STORY_DISPUTES_API_BASE_URL !== 'undefined' && url.includes(STORY_DISPUTES_API_BASE_URL)) return { data: [] };
        }
        // For 5xx or timeouts/no-response: degrade to empty to keep UI responsive
        if (!status || status >= 500 || error.code === 'ECONNABORTED') {
            console.error(`[SERVICE_ERROR] Failed calling ${url}. Status: ${status || 'N/A'}. Message: ${error.message}`);
            if (url.includes(STORY_ASSETS_API_BASE_URL)) return { data: [], pagination: { total: 0 }, __degraded: true };
            if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) return { events: [], __degraded: true };
            if (typeof STORY_DISPUTES_API_BASE_URL !== 'undefined' && url.includes(STORY_DISPUTES_API_BASE_URL)) return { data: [], __degraded: true };
        }
        // Diagnostic logs for other cases
        console.error(`[SERVICE_ERROR] Failed calling ${url}. Status: ${status || 'N/A'}. Message: ${error.message}`);
        if (status === 429) console.error('>>> DIAGNOSTIC: Rate-limited by Story API (429)');
        // bubble up a user-friendly error
        throw new Error(error.response ? `API Error ${status}` : 'Network/API request failed');
    }
};

// --- Rate limit helpers ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process items with at most `rps` requests per second
 */
const mapWithRpsLimit = async (items, rps, mapper) => {
    // Optimized batch sizing for real data processing
    const isStoryScan = rps <= 10; // StoryScan has 10 RPS limit
    const batchSize = isStoryScan ? 1 : Math.max(1, Math.min(parseInt(rps, 10) || 10, 3)); // Smaller batches for StoryScan
    const results = [];
    const delayMs = isStoryScan ? 90 : 500; // Optimized delay for StoryScan (90ms for ~11 RPS)
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        // eslint-disable-next-line no-await-in-loop
        const batchResults = await Promise.all(batch.map(mapper));
        results.push(...batchResults);
        if (i + batchSize < items.length) {
            // eslint-disable-next-line no-await-in-loop
            await sleep(delayMs); // Conservative delay based on API type
        }
    }
    return results;
};

/**
 * Fetch all RoyaltyPaid events for an ipId with pagination (loop until exhausted) and lowercase fallback
 */
const fetchRoyaltyEventsPaginated = async (ipId, pageSize = 200) => {
    const candidates = [ipId];
    const lc = ipId?.toLowerCase?.();
    if (lc && lc !== ipId) candidates.push(lc);

    for (const candidateId of candidates) {
        const allEvents = [];
        let offset = 0;
        // Loop until API returns empty or less than pageSize
        for (let page = 0; ; page++) {
            const body = {
                where: { eventTypes: ["RoyaltyPaid"], ipIds: [candidateId] },
                pagination: { limit: pageSize, offset }
            };
            try {
                // eslint-disable-next-line no-await-in-loop
                const resp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, body, 'POST');
                const events = resp.events || resp.data || [];
                if (!events || events.length === 0) break;
                allEvents.push(...events);
                if (events.length < pageSize) break; // last page
                offset += events.length;
            } catch (e) {
                console.error(`[PAGINATION] Failed fetching events for ${candidateId}: ${e.message}`);
                break;
            }
        }
        if (allEvents.length > 0) return allEvents;
    }
    return [];
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
        const resp = await limitedStoryScanGet(url, { headers: { 'X-Api-Key': storyScanApiKey }, timeout: 10000 });
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
 * Returns: { totalRoyaltiesByToken: Map(symbol => { total: BigInt, decimals: Number }), licenseeMap: Map(from => { address, count, totalWei: BigInt }) }
 */
const getAndAggregateRoyaltyEventsFromApi = async (ipId) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    if (!ipId) {
        throw new Error("ipId is required");
    }

    // Original behavior: query AS-IS then lowercase fallback (no full pagination here)
    const buildRequest = (id) => ({
        where: { eventTypes: ["RoyaltyPaid"], ipIds: [id] },
        pagination: { limit: 200 },
        orderBy: "blockNumber",
        orderDirection: "desc"
    });

    let txResp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, buildRequest(ipId), 'POST');
    let events = txResp.events || txResp.data || [];

    if ((!events || events.length === 0) && ipId.toLowerCase() !== ipId) {
        txResp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, buildRequest(ipId.toLowerCase()), 'POST');
        events = txResp.events || txResp.data || [];
    }

    if (!events || events.length === 0) {
        if (DEBUG_AGGR_LOGS) console.log(`[AGGR RESULT] IP ID ${ipId}: No RoyaltyPaid events found.`);
        return { totalRoyaltiesByToken: new Map(), licenseeMap: new Map() };
    }

    // Fetch StoryScan details (rate limited via cache, still uses Promise.all for this limited set)
    const detailPromises = events.map(ev => {
        const txHash = ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash;
        const cached = getTxDetailCache(txHash);
        if (cached) return Promise.resolve({ txHash, detail: cached });
        return fetchTransactionDetailFromStoryScan(txHash)
            .then(detail => { setTxDetailCache(txHash, detail); return { txHash, detail }; })
            .catch(() => ({ txHash, detail: { amount: 0n, decimals: 18, symbol: 'ETH', tokenAddress: null, exchangeRateUsd: null, from: null } }));
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
        if (DEBUG_AGGR_LOGS) console.log(`[AGGR RESULT] IP ID ${ipId}: SUCCESS. Total ETH/WETH Wei: ${totalEthWei.toString()}`);
    } else {
        if (DEBUG_AGGR_LOGS) console.log(`[AGGR RESULT] IP ID ${ipId}: No valuable transfers found (Final Sum: 0).`);
    }

    return { totalRoyaltiesByToken, licenseeMap };
};


/**
 * getAssetsByOwner(owner, limit, offset, tokenContract)
 * - wrapper to call Story Assets API and return normalized shape
 */
const detectMediaTypeFromIpfs = async (uri) => {
    try {
        if (!uri || typeof uri !== 'string') return null;
        // Resolve IPFS to public gateway
        const url = uri.startsWith('ipfs://') ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/') : uri;
        const resp = await axios.head(url, { timeout: 8000 });
        const ct = resp.headers?.['content-type'] || resp.headers?.['Content-Type'];
        if (typeof ct === 'string' && ct.trim().length > 0) return ct.split(';')[0].trim();
    } catch (e) {
        // HEAD might be blocked; try GET minimal bytes
        try {
            const url = uri.startsWith('ipfs://') ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/') : uri;
            const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000, headers: { Range: 'bytes=0-64' } });
            const ct = resp.headers?.['content-type'] || resp.headers?.['Content-Type'];
            if (typeof ct === 'string' && ct.trim().length > 0) return ct.split(';')[0].trim();
        } catch {}
    }
    return null;
};

const getAssetsByOwner = async (ownerAddress, limit = 200, offset = 0, tokenContract) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    const key = `${ownerAddress || ''}|${tokenContract || ''}|${limit}|${offset}`;
    const cached = assetsCacheGet(key);
    if (cached) return cached;
    if (assetsInFlightByKey.has(key)) return await assetsInFlightByKey.get(key);
    const whereClause = {};
    if (ownerAddress) whereClause.ownerAddress = ownerAddress.trim();
    if (tokenContract) {
        const cleaned = tokenContract.trim();
        if (cleaned) whereClause.tokenContract = cleaned;
    }

    if (Object.keys(whereClause).length === 0) return { data: [], pagination: { total: 0 } };

    // Use maximum limit for better performance
    const optimizedLimit = Math.min(limit, 200);
    
    const requestBody = {
        includeLicenses: true,
        moderated: false,
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit: optimizedLimit, offset },
        where: whereClause
    };

    let resp;
    const promise = (async () => {
        resp = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody, 'POST');

        // Fallbacks if empty: try lowercase variants and ipId direct lookup
        let data = resp.data || [];
        if (!Array.isArray(data) || data.length === 0) {
            // 1) lowercase ownerAddress
            if (ownerAddress && ownerAddress.toLowerCase() !== ownerAddress) {
                try {
                    const req2 = { ...requestBody, where: { ...whereClause, ownerAddress: ownerAddress.toLowerCase() } };
                    const resp2 = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, req2, 'POST');
                    data = resp2.data || [];
                    resp = resp2;
                } catch {}
            }
        }
        if (!Array.isArray(data) || data.length === 0) {
            // 2) lowercase tokenContract
            if (tokenContract && tokenContract.toLowerCase() !== tokenContract) {
                try {
                    const req3 = { ...requestBody, where: { ...whereClause, tokenContract: tokenContract.toLowerCase() } };
                    const resp3 = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, req3, 'POST');
                    data = resp3.data || [];
                    resp = resp3;
                } catch {}
            }
        }
        if (!Array.isArray(data) || data.length === 0) {
            // 3) Direct ipId lookup if input looks like address (user may have pasted IP ID)
            const candidate = ownerAddress || tokenContract;
            if (candidate && /^0x[a-fA-F0-9]{40}$/.test(candidate)) {
                const tryIds = [candidate];
                const lc = candidate.toLowerCase();
                if (lc !== candidate) tryIds.push(lc);
                for (const id of tryIds) {
                    try {
                        const req4 = { includeLicenses: true, moderated: false, pagination: { limit: 1 }, where: { ipIds: [id] } };
                        const resp4 = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, req4, 'POST');
                        const d4 = resp4.data || [];
                        if (Array.isArray(d4) && d4.length > 0) {
                            data = d4;
                            resp = { ...resp4, pagination: { total: 1, limit: 1, offset: 0 } };
                            break;
                        }
                    } catch {}
                }
            }
        }

        // If degraded empty due to timeout/5xx, do not treat as definitive not-found
        const wasDegraded = !!resp.__degraded;

        // Enrich disputes status and mediaType via IPFS
        data = data || [];
        try {
            const dispReq = {
                where: { ipIds: data.map(a => a.ipId).filter(Boolean) },
                pagination: { limit: data.length || 50 }
            };
            const dispResp = await fetchStoryApi(STORY_DISPUTES_API_BASE_URL, storyApiKey, dispReq, 'POST');
            const dispItems = dispResp.data || dispResp.disputes || [];
            const ipToStatus = new Map();
            for (const d of dispItems) {
                const ip = d?.ipId || d?.ip_id;
                const status = d?.status || d?.state || 'Active';
                if (ip) ipToStatus.set(ip, status);
            }
            for (const a of data) {
                if (ipToStatus.has(a.ipId)) a.disputeStatus = ipToStatus.get(a.ipId);
                if (!a.disputeStatus || a.disputeStatus === 'None') {
                    try {
                        const fb = await getDisputeStatusFromTransactions(a.ipId);
                        if (fb) a.disputeStatus = fb;
                    } catch {}
                }
                // If mediaType missing or UNKNOWN, try detect via nftMetadata.uri (ipfs)
                const currentMedia = (a.mediaType || '').toUpperCase();
                const uri = a?.nftMetadata?.image?.cachedUrl || a?.nftMetadata?.raw?.metadata?.image || a?.nftMetadata?.image?.originalUrl || a?.nftMetadata?.uri;
                if ((!currentMedia || currentMedia === 'UNKNOWN') && uri) {
                    try {
                        const ct = await detectMediaTypeFromIpfs(uri);
                        if (ct) {
                            if (ct.startsWith('image/')) a.mediaType = 'IMAGE';
                            else if (ct.startsWith('video/')) a.mediaType = 'VIDEO';
                            else if (ct.startsWith('audio/')) a.mediaType = 'AUDIO';
                            else a.mediaType = ct.toUpperCase();
                        }
                    } catch {}
                }
                
                // Set default royalty to 0, will be updated in batch processing
                a.totalRoyaltyCollected = 0;
            }
        } catch (e) {
            // ignore disputes enrich failure
        }

        // Batch process royalty data for better performance
        if (data && data.length > 0) {
            try {
                console.log(`[PERFORMANCE] Batch processing royalty data for ${data.length} assets`);
                
                // Process royalty data in parallel with maximum concurrency
                const batchSize = 50; // Process 50 assets at a time for maximum performance
                const batches = [];
                for (let i = 0; i < data.length; i += batchSize) {
                    batches.push(data.slice(i, i + batchSize));
                }
                
                // Process all batches concurrently for maximum speed
                const allPromises = batches.map(async (batch) => {
                    const promises = batch.map(async (asset) => {
                        try {
                            // Add timeout for individual asset processing
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Timeout')), 1000)
                            );
                            
                            const royaltyPromise = fetchRoyaltyTxDetailsForAsset(asset.ipId);
                            const txs = await Promise.race([royaltyPromise, timeoutPromise]);
                            
                            let totalRoyaltyUsdt = new Decimal(0);
                            for (const tx of txs) {
                                const symbol = tx.symbol || 'UNKNOWN';
                                const decimals = tx.decimals || 18;
                                const usdt = computeUsdtValue(tx.amount, decimals, tx.exchangeRateUsd || 0);
                                totalRoyaltyUsdt = totalRoyaltyUsdt.add(usdt);
                            }
                            asset.totalRoyaltyCollected = Number(totalRoyaltyUsdt.toFixed(2));
                        } catch (e) {
                            asset.totalRoyaltyCollected = 0;
                        }
                    });
                    
                    return Promise.allSettled(promises);
                });
                
                await Promise.allSettled(allPromises);
                
                console.log(`[PERFORMANCE] Completed batch processing royalty data`);
            } catch (e) {
                console.error('[PERFORMANCE] Error in batch processing royalty data:', e.message);
            }
        }

        const result = { ...resp, data, __degraded: wasDegraded };
        assetsCacheSet(key, result);
        return result;
    })();
    assetsInFlightByKey.set(key, promise);
    try {
        const out = await promise;
        return out;
    } finally {
        assetsInFlightByKey.delete(key);
    }
};

/**
 * Get asset count without loading all data - optimized for large datasets
 */
const getAssetCountOnly = async (ownerAddress, tokenContract = null) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return 0;

    const whereClause = {};
    if (ownerAddress) whereClause.ownerAddress = ownerAddress.trim();
    if (tokenContract) {
        const cleaned = tokenContract.trim();
        if (cleaned) whereClause.tokenContract = cleaned;
    }

    if (Object.keys(whereClause).length === 0) return 0;

    const requestBody = {
        includeLicenses: false, // Skip licenses for count-only request
        moderated: false,
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit: 1, offset: 0 }, // Only need 1 item to get total count
        where: whereClause
    };

    try {
        // Use shorter timeout for count-only requests
        const options = {
            method: 'POST',
            url: STORY_ASSETS_API_BASE_URL,
            headers: {
                'X-Api-Key': storyApiKey,
                'Content-Type': 'application/json',
            },
            data: requestBody,
            timeout: 5000, // Shorter timeout for count-only requests
        };
        
        const resp = await axios(options);
        return resp.data.pagination?.total || 0;
    } catch (e) {
        console.error('[SERVICE] getAssetCountOnly failed:', e.message);
        return 0;
    }
};


/**
 * Fast portfolio stats - optimized version that skips heavy StoryScan calls
 * Returns basic stats without detailed transaction analysis
 */
const getPortfolioStatsFast = async (ownerAddress) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return { totalAssets: 0, totalRoyalties: '$0.00 USDT', overallDisputeStatus: '0' };

    const cached = cache.portfolioStatsByOwner.get(ownerAddress);
    if (isFresh(cached)) return cached.value;

    // Get total count first without loading all data
    const totalAssets = await getAssetCountOnly(ownerAddress);
    
    if (totalAssets === 0) {
        const empty = { totalAssets: 0, totalRoyalties: '$0.00 USDT', overallDisputeStatus: '0' };
        cache.portfolioStatsByOwner.set(ownerAddress, withTtl(empty));
        return empty;
    }

    // For large datasets (>200 assets), skip dispute counting to avoid timeout
    let activeDisputeCount = 0;
    let totalRoyalties = '$0.00 USDT';
    let displayTotal = '$0.00 USDT';
    let breakdownByToken = [];
    
    if (totalAssets <= 200) {
        try {
            const assetResp = await getAssetsByOwner(ownerAddress, Math.min(100, totalAssets), 0);
            const allAssets = assetResp.data || [];
            for (const asset of allAssets) {
                if (asset.disputeStatus === 'Active') {
                    activeDisputeCount++;
                }
            }
            
            // Try to get basic royalty data for small datasets
            if (totalAssets <= 50) {
                try {
                    // Process all assets, not just sample, to get accurate WIP calculation
                    const portfolioTotalsByToken = new Map(); // symbol => { totalRaw: BigInt, decimals, usdt: Decimal }
                    
                    for (const asset of allAssets) {
                        try {
                            const txs = await fetchRoyaltyTxDetailsForAsset(asset.ipId);
                            for (const tx of txs) {
                                const symbol = tx.symbol || 'UNKNOWN';
                                const decimals = tx.decimals || 18;
                                const usdt = computeUsdtValue(tx.amount, decimals, tx.exchangeRateUsd || 0);
                                const existing = portfolioTotalsByToken.get(symbol) || { totalRaw: 0n, decimals, usdt: new Decimal(0) };
                                existing.totalRaw = (existing.totalRaw || 0n) + (tx.amount || 0n);
                                if (!existing.decimals) existing.decimals = decimals;
                                existing.usdt = existing.usdt.add(usdt);
                                portfolioTotalsByToken.set(symbol, existing);
                            }
                        } catch (e) {
                            // Skip individual asset errors
                            continue;
                        }
                    }
                    
                    // Sum total USDT and get WIP amount
                    let totalUsdt = new Decimal(0);
                    let wipRaw = 0n;
                    let wipDecimals = 18;
                    for (const [symbol, data] of portfolioTotalsByToken.entries()) {
                        totalUsdt = totalUsdt.add(data.usdt || 0);
                        if (symbol === 'WIP') {
                            wipRaw = (data.totalRaw || 0n);
                            wipDecimals = data.decimals || 18;
                        }
                    }
                    
                    if (totalUsdt.gt(0)) {
                        // Format with WIP if available, otherwise just USDT
                        if (wipRaw > 0n) {
                            totalRoyalties = `${formatTokenAmountWithDecimals(wipRaw, wipDecimals, 4)} WIP (${formatUsdtCurrency(totalUsdt)})`;
                            displayTotal = totalRoyalties;
                        } else {
                            totalRoyalties = formatUsdtCurrency(totalUsdt);
                            displayTotal = totalRoyalties;
                        }
                    }
                } catch (e) {
                    console.warn('[SERVICE] Failed to calculate royalties in fast mode:', e.message);
                }
            }
        } catch (e) {
            console.warn('[SERVICE] Failed to get dispute status, skipping:', e.message);
        }
    }

    const result = {
        totalAssets,
        totalRoyalties,
        overallDisputeStatus: activeDisputeCount > 0 ? String(activeDisputeCount) : '0',
        breakdownByToken,
        displayTotal,
        fastMode: true,
        largeDataset: totalAssets > 100
    };
    
    cache.portfolioStatsByOwner.set(ownerAddress, withTtl(result));
    return result;
};

/**
 * getPortfolioStats(ownerAddress)
 * - collects all assets (one page; can be extended to iterate pages)
 * - aggregates royalties only for ETH/WETH into globalTotalWei (uses BigInt)
 */
/**
 * Internal: fetch RoyaltyPaid events for an asset with StoryScan details
 * Returns array of { txHash, timestampSec, symbol, decimals, amount: BigInt, exchangeRateUsd, from }
 */
const fetchRoyaltyTxDetailsForAsset = async (ipId) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    const events = await fetchRoyaltyEventsPaginated(ipId, 200, 200);
    if (!Array.isArray(events) || events.length === 0) return [];

    // Process ALL transactions with real data - no sampling
    const txHashes = events.map(ev => ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash).filter(Boolean);
    
    console.log(`[PERFORMANCE] Processing ${txHashes.length} transactions with real data...`);
    const startTime = Date.now();
    
    // Use higher rate limit and better error handling for real data processing
    const detailed = await mapWithRpsLimit(txHashes, 9, async (txHash) => {
        try {
            const cached = getTxDetailCache(txHash);
            if (cached) return { txHash, detail: cached };
            
            // Add timeout for individual transaction detail fetch
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transaction detail timeout')), 3000)
            );
            
            const detailPromise = fetchTransactionDetailFromStoryScan(txHash);
            const detail = await Promise.race([detailPromise, timeoutPromise]);
            setTxDetailCache(txHash, detail);
            return { txHash, detail };
        } catch (error) {
            console.log(`[PERFORMANCE] Error fetching detail for ${txHash}: ${error.message}`);
            return { txHash, detail: { amount: 0n, decimals: 18, symbol: 'ETH', tokenAddress: null, exchangeRateUsd: null, from: null, timestamp: null } };
        }
    });
    
    const endTime = Date.now();
    console.log(`[PERFORMANCE] Completed processing ${txHashes.length} transactions in ${endTime - startTime}ms`);
    
    return detailed.map(d => ({
        txHash: d.txHash,
        timestampSec: d.detail?.timestamp || null,
        symbol: d.detail?.symbol || 'ETH',
        decimals: d.detail?.decimals || 18,
        amount: d.detail?.amount || 0n,
        exchangeRateUsd: d.detail?.exchangeRateUsd || null,
        from: d.detail?.from || null
    })).filter(x => x.amount && x.amount > 0n);
};

const getPortfolioStats = async (ownerAddress) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return { totalAssets: 0, totalRoyalties: '$0.00 USDT', overallDisputeStatus: '0' };

    const cached = cache.portfolioStatsByOwner.get(ownerAddress);
    if (isFresh(cached)) return cached.value;

    // Use fast mode if enabled to skip heavy StoryScan operations
    if (FAST_MODE) {
        return await getPortfolioStatsFast(ownerAddress);
    }

    // Use smaller limit only for very large datasets
    const MAX_ASSET_LIMIT = 200;
    const assetResp = await getAssetsByOwner(ownerAddress, MAX_ASSET_LIMIT, 0);
    const allAssets = assetResp.data || [];
    const totalAssets = assetResp.pagination?.total || allAssets.length;

    if (allAssets.length === 0) {
        const empty = { totalAssets, totalRoyalties: '$0.00 USDT', overallDisputeStatus: '0' };
        cache.portfolioStatsByOwner.set(ownerAddress, withTtl(empty));
        return empty;
    }

    // Aggregate per-token and total USDT by summing each transaction's price*amount
    const portfolioTotalsByToken = new Map(); // symbol => { totalRaw: BigInt, decimals, address: null, usdt: Decimal }
    let overallDisputeStatus = 'None';
    let activeDisputeCount = 0;

    // Concurrency control: process assets in small batches to keep UI responsive
    // Use smaller batch size only for very large datasets to avoid timeout
    const BATCH_SIZE = totalAssets > 200 ? 3 : (totalAssets > 100 ? 5 : 10);
    for (let i = 0; i < allAssets.length; i += BATCH_SIZE) {
        const slice = allAssets.slice(i, i + BATCH_SIZE);
        const details = await Promise.all(slice.map(async (asset) => {
            try {
                const txs = await fetchRoyaltyTxDetailsForAsset(asset.ipId);
                return { asset, txs };
            } catch (e) {
                console.error(`Error processing IP ID ${asset.ipId}: ${e.message}`);
                return { asset, txs: [] };
            }
        }));
        for (const { asset, txs } of details) {
            for (const tx of txs) {
                const symbol = tx.symbol || 'UNKNOWN';
                const decimals = tx.decimals || 18;
                const usdt = computeUsdtValue(tx.amount, decimals, tx.exchangeRateUsd || 0);
                const existing = portfolioTotalsByToken.get(symbol) || { totalRaw: 0n, decimals, address: null, usdt: new Decimal(0) };
                existing.totalRaw = (existing.totalRaw || 0n) + (tx.amount || 0n);
                if (!existing.decimals) existing.decimals = decimals;
                existing.usdt = existing.usdt.add(usdt);
                portfolioTotalsByToken.set(symbol, existing);
            }
            if (asset.disputeStatus === 'Active') {
                overallDisputeStatus = 'Active';
                activeDisputeCount++;
            } else if (asset.disputeStatus === 'Pending' && overallDisputeStatus === 'None') {
                overallDisputeStatus = 'Pending';
            }
        }
    }

    // Sum total USDT and cache WIP amount if present
    let totalUsdt = new Decimal(0);
    let wipRaw = 0n;
    let wipDecimals = 18;
    for (const [symbol, data] of portfolioTotalsByToken.entries()) {
        totalUsdt = totalUsdt.add(data.usdt || 0);
        if (symbol === 'WIP') {
            wipRaw = (data.totalRaw || 0n);
            wipDecimals = data.decimals || 18;
        }
    }

    const result = {
        totalAssets,
        totalRoyalties: formatUsdtCurrency(totalUsdt),
        overallDisputeStatus: activeDisputeCount > 0 ? String(activeDisputeCount) : '0',
        breakdownByToken: Array.from(portfolioTotalsByToken.entries()).map(([symbol, d]) => ({
            symbol,
            address: d.address || null,
            amountFormatted: formatTokenAmountWithDecimals(d.totalRaw || 0n, d.decimals || 18, 6),
            rawAmount: (d.totalRaw || 0n).toString(),
            decimals: d.decimals || 18,
            usdtValue: Number((d.usdt || new Decimal(0)).toFixed(2))
        })),
        displayTotal: (wipRaw && wipRaw > 0n)
            ? `${formatTokenAmountWithDecimals(wipRaw, wipDecimals, 4)} WIP (${formatUsdtCurrency(totalUsdt)})`
            : `${formatUsdtCurrency(totalUsdt)}`
    };
    cache.portfolioStatsByOwner.set(ownerAddress, withTtl(result));
    return result;
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

    // Fetch dispute status via disputes API; fallback to transactions-based derivation
    let assetDisputeStatus = asset.disputeStatus || 'None';
    try {
        const dispReq = {
            where: { ipIds: [ipId] },
            pagination: { limit: 1 },
            orderBy: 'blockNumber',
            orderDirection: 'desc'
        };
        const dispResp = await fetchStoryApi(STORY_DISPUTES_API_BASE_URL, storyApiKey, dispReq, 'POST');
        const dispItems = dispResp.data || dispResp.disputes || [];
        if (Array.isArray(dispItems) && dispItems.length > 0) {
            const status = dispItems[0]?.status || dispItems[0]?.state || 'Active';
            assetDisputeStatus = status;
        }
    } catch (e) {
        // ignore; will try transactions fallback below
    }
    if (!assetDisputeStatus || assetDisputeStatus === 'None') {
        try {
            const fallback = await getDisputeStatusFromTransactions(ipId);
            if (fallback) assetDisputeStatus = fallback;
        } catch {}
    }
    const analytics = {};

    try {
        const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(ipId);
        // Convert to object mapping currency => "<amount> (<usdt>)"
        const royaltiesObj = {};
        for (const [symbol, data] of totalRoyaltiesByToken.entries()) {
            const amountFormatted = formatTokenAmountWithDecimals(data.total || 0n, data.decimals || 18, 6);
            const usdtVal = computeUsdtValue(data.total || 0n, data.decimals || 18, data.lastExchangeRateUsd || 0);
            royaltiesObj[symbol] = `${amountFormatted} ${symbol} (${formatUsdtCurrency(usdtVal)})`;
        }
        analytics.totalRoyaltiesPaid = royaltiesObj;
        analytics.disputeStatus = assetDisputeStatus;
    } catch (e) {
        analytics.errorMessage = e.message;
    }

    // Enrich mediaType via IPFS if missing
    try {
        const currentMedia = (asset.mediaType || '').toUpperCase();
        const uri = asset?.nftMetadata?.image?.cachedUrl || asset?.nftMetadata?.raw?.metadata?.image || asset?.nftMetadata?.image?.originalUrl || asset?.nftMetadata?.uri;
        if ((!currentMedia || currentMedia === 'UNKNOWN') && uri) {
            const ct = await detectMediaTypeFromIpfs(uri);
            if (ct) {
                if (ct.startsWith('image/')) asset.mediaType = 'IMAGE';
                else if (ct.startsWith('video/')) asset.mediaType = 'VIDEO';
                else if (ct.startsWith('audio/')) asset.mediaType = 'AUDIO';
                else asset.mediaType = ct.toUpperCase();
            }
        }
    } catch (e) {
        // ignore mediaType enrichment failure
    }

    // Get children count for this asset
    try {
        const childrenResponse = await getChildrenAssets(ipId, 200, 0);
        if (childrenResponse.success) {
            asset.childrenCount = childrenResponse.data.total || 0;
            // For now, descendants count is same as children count
            // In the future, this could be calculated recursively
            asset.descendantsCount = asset.childrenCount;
        } else {
            asset.childrenCount = 0;
            asset.descendantsCount = 0;
        }
    } catch (e) {
        console.error(`[SERVICE] Error getting children count for ${ipId}:`, e.message);
        asset.childrenCount = 0;
        asset.descendantsCount = 0;
    }

    asset.analytics = analytics;
    asset.disputeStatus = assetDisputeStatus;
    return asset;
};


/**
 * getRoyaltyTransactions(ipId)
 * - returns array of transactions with formatted value & timestamp
 * - robust: lowercase fallback + pagination + StoryScan rate-limit + caching
 */
const getRoyaltyTransactions = async (ipId) => {
    try {
        if (!storyApiKey) {
            // Gracefully degrade: without Story API key we cannot list events
            return [];
        }

        // Use the same robust pagination used elsewhere (handles lowercase fallback internally)
        const events = await fetchRoyaltyEventsPaginated(ipId, 200);
        if (!Array.isArray(events) || events.length === 0) return [];

        // Respect StoryScan 10 RPS and use cache
        const txHashes = events
            .map(ev => ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash)
            .filter(Boolean);

        // Process ALL transactions for UI display - no limits
        const detailed = await mapWithRpsLimit(txHashes, 9, async (txHash) => {
            const cached = getTxDetailCache(txHash);
            if (cached) return { txHash, detail: cached };
            const detail = await fetchTransactionDetailFromStoryScan(txHash);
            setTxDetailCache(txHash, detail);
            return { txHash, detail };
        });

        // map to UI shape, filter >0
        const mapped = detailed
            .filter(d => d.detail && d.detail.amount && d.detail.amount > 0n)
            .map(d => {
                const amount = d.detail.amount;
                const symbol = d.detail.symbol || 'ETH';
                const decimals = d.detail.decimals || 18;
                const from = d.detail.from || 'N/A';
                const tsSec = normalizeTimestampSec(d.detail.timestamp);
                const timestamp = tsSec ? (new Date(tsSec * 1000)).toISOString() : null;
                return {
                    txHash: d.txHash,
                    from,
                    value: `${formatTokenAmountWithDecimals(amount, decimals)} ${symbol}`,
                    timestamp,
                    rawAmount: amount.toString()
                };
            });

        return mapped;
    } catch (e) {
        // Never throw to the controller; return empty list to avoid 500s in modal
        console.error('[SERVICE] getRoyaltyTransactions failed', e.message);
        return [];
    }
};



/**
 * getAssetLeaderboard(ownerAddress, limit = 10)
 * Returns: [{ ipId, title, usdtValue }]
 */
const getAssetLeaderboard = async (ownerAddress, limit = 10) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return [];
    const cached = cache.assetLeaderboardByOwner.get(ownerAddress);
    if (isFresh(cached)) return cached.value.slice(0, Math.max(1, parseInt(limit, 10) || 10));
    const assetsResp = await getAssetsByOwner(ownerAddress, 200, 0);
    const assets = assetsResp.data || [];
    const rows = [];
    for (const asset of assets) {
        const txs = await fetchRoyaltyTxDetailsForAsset(asset.ipId);
        let usdt = new Decimal(0);
        for (const tx of txs) {
            usdt = usdt.add(computeUsdtValue(tx.amount, tx.decimals || 18, tx.exchangeRateUsd || 0));
        }
        rows.push({ ipId: asset.ipId, title: asset.title || 'Untitled', usdtValue: Number(usdt.toFixed(2)) });
    }
    rows.sort((a, b) => b.usdtValue - a.usdtValue);
    cache.assetLeaderboardByOwner.set(ownerAddress, withTtl(rows));
    return rows.slice(0, Math.max(1, parseInt(limit, 10) || 10));
};

/**
 * getPortfolioLicensees(ownerAddress, limit = 10)
 * Returns: [{ address, count, usdtValue }]
 */
const getPortfolioLicensees = async (ownerAddress, limit = 10) => {
    if (!storyApiKey) throw new Error("STORY_PROTOCOL_API_KEY is not set");
    if (!ownerAddress) return [];
    const cached = cache.licenseeLeaderboardByOwner.get(ownerAddress);
    if (isFresh(cached)) return cached.value.slice(0, Math.max(1, parseInt(limit, 10) || 10));
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
    cache.licenseeLeaderboardByOwner.set(ownerAddress, withTtl(rows));
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

/**
 * ========================================
 * STORYSCAN ANALYTICS FUNCTIONS
 * ========================================
 */

/**
 * getAssetAnalytics(ipId)
 * Comprehensive on-chain analytics for a specific IP asset
 */
const getAssetAnalytics = async (ipId) => {
    try {
        console.log(`[ANALYTICS] Fetching analytics for IP: ${ipId}`);
        
        // Fetch multiple analytics data in parallel
        const [
            transactionHistory,
            gasAnalytics,
            contractInteractions,
            assetMetrics
        ] = await Promise.allSettled([
            getAssetTransactionHistory(ipId),
            getAssetGasAnalytics(ipId),
            getAssetContractInteractions(ipId),
            getAssetPerformanceMetrics(ipId)
        ]);

        const analytics = {
            ipId,
            timestamp: new Date().toISOString(),
            transactionHistory: transactionHistory.status === 'fulfilled' ? transactionHistory.value : null,
            gasAnalytics: gasAnalytics.status === 'fulfilled' ? gasAnalytics.value : null,
            contractInteractions: contractInteractions.status === 'fulfilled' ? contractInteractions.value : null,
            assetMetrics: assetMetrics.status === 'fulfilled' ? assetMetrics.value : null,
            errors: []
        };

        // Collect any errors
        [transactionHistory, gasAnalytics, contractInteractions, assetMetrics].forEach((result, index) => {
            if (result.status === 'rejected') {
                analytics.errors.push({
                    type: ['transactionHistory', 'gasAnalytics', 'contractInteractions', 'assetMetrics'][index],
                    error: result.reason.message
                });
            }
        });

        return {
            success: true,
            data: analytics
        };
    } catch (error) {
        console.error('[ANALYTICS] Error fetching asset analytics:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
};

/**
 * getAssetTransactionHistory(ipId)
 * Get transaction history for an IP asset
 */
const getAssetTransactionHistory = async (ipId) => {
    try {
        // Get transactions related to this IP asset
        const response = await limitedStoryScanGet(`/transactions`, {
            params: {
                ip_id: ipId,
                limit: 50,
                sort: 'desc'
            }
        });

        const transactions = response.data?.data || [];
        
        return {
            total: transactions.length,
            transactions: transactions.map(tx => ({
                hash: tx.hash,
                blockNumber: tx.block_number,
                timestamp: tx.timestamp,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                gasUsed: tx.gas_used,
                gasPrice: tx.gas_price,
                status: tx.status,
                method: tx.method,
                type: tx.type
            })),
            summary: {
                totalTransactions: transactions.length,
                successfulTransactions: transactions.filter(tx => tx.status === 'success').length,
                failedTransactions: transactions.filter(tx => tx.status === 'failed').length,
                totalValue: transactions.reduce((sum, tx) => sum + (parseFloat(tx.value) || 0), 0),
                averageGasUsed: transactions.reduce((sum, tx) => sum + (parseInt(tx.gas_used) || 0), 0) / transactions.length || 0
            }
        };
    } catch (error) {
        console.error('[ANALYTICS] Error fetching transaction history:', error);
        throw error;
    }
};

/**
 * getAssetGasAnalytics(ipId)
 * Analyze gas usage patterns for an IP asset
 */
const getAssetGasAnalytics = async (ipId) => {
    try {
        // Gas price trends not available (network stats removed)
        const gasPrices = null;

        // Get recent transactions for gas analysis
        const response = await limitedStoryScanGet(`/transactions`, {
            params: {
                ip_id: ipId,
                limit: 100,
                sort: 'desc'
            }
        });

        const transactions = response.data?.data || [];
        const gasData = transactions.map(tx => ({
            gasUsed: parseInt(tx.gas_used) || 0,
            gasPrice: parseInt(tx.gas_price) || 0,
            gasCost: (parseInt(tx.gas_used) || 0) * (parseInt(tx.gas_price) || 0),
            timestamp: tx.timestamp,
            blockNumber: tx.block_number
        }));

        const totalGasUsed = gasData.reduce((sum, tx) => sum + tx.gasUsed, 0);
        const totalGasCost = gasData.reduce((sum, tx) => sum + tx.gasCost, 0);
        const averageGasUsed = totalGasUsed / gasData.length || 0;
        const averageGasPrice = gasData.reduce((sum, tx) => sum + tx.gasPrice, 0) / gasData.length || 0;

        return {
            currentGasPrices: gasPrices,
            assetGasStats: {
                totalGasUsed,
                totalGasCost: formatWeiToEther(totalGasCost),
                averageGasUsed: Math.round(averageGasUsed),
                averageGasPrice: Math.round(averageGasPrice),
                transactionCount: gasData.length
            },
            gasTrends: gasData.slice(0, 20).map(tx => ({
                timestamp: tx.timestamp,
                gasUsed: tx.gasUsed,
                gasPrice: tx.gasPrice,
                gasCost: formatWeiToEther(tx.gasCost)
            }))
        };
    } catch (error) {
        console.error('[ANALYTICS] Error fetching gas analytics:', error);
        throw error;
    }
};

/**
 * getAssetContractInteractions(ipId)
 * Analyze smart contract interactions for an IP asset
 */
const getAssetContractInteractions = async (ipId) => {
    try {
        // Get contract events and interactions
        const response = await limitedStoryScanGet(`/events`, {
            params: {
                ip_id: ipId,
                limit: 100,
                sort: 'desc'
            }
        });

        const events = response.data?.data || [];
        
        // Group events by type
        const eventsByType = events.reduce((acc, event) => {
            const type = event.event_name || 'Unknown';
            if (!acc[type]) acc[type] = [];
            acc[type].push({
                transactionHash: event.transaction_hash,
                blockNumber: event.block_number,
                timestamp: event.timestamp,
                data: event.data,
                topics: event.topics
            });
            return acc;
        }, {});

        // Get function calls
        const functionCalls = events.filter(event => event.event_name === 'FunctionCall');
        const mostCalledFunctions = functionCalls.reduce((acc, call) => {
            const method = call.data?.method || 'Unknown';
            acc[method] = (acc[method] || 0) + 1;
            return acc;
        }, {});

        return {
            totalEvents: events.length,
            eventsByType: Object.keys(eventsByType).map(type => ({
                type,
                count: eventsByType[type].length,
                events: eventsByType[type].slice(0, 10) // Limit to 10 most recent
            })),
            functionCalls: {
                total: functionCalls.length,
                mostCalled: Object.entries(mostCalledFunctions)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([method, count]) => ({ method, count }))
            },
            recentActivity: events.slice(0, 20).map(event => ({
                type: event.event_name,
                transactionHash: event.transaction_hash,
                timestamp: event.timestamp,
                blockNumber: event.block_number
            }))
        };
    } catch (error) {
        console.error('[ANALYTICS] Error fetching contract interactions:', error);
        throw error;
    }
};

/**
 * getAssetPerformanceMetrics(ipId)
 * Get performance and usage metrics for an IP asset
 */
const getAssetPerformanceMetrics = async (ipId) => {
    try {
        // Get royalty data for performance analysis
        const royaltyData = await getAndAggregateRoyaltyEventsFromApi(ipId);
        const { licenseeMap, totalWei } = royaltyData;

        // Calculate metrics
        const totalLicensees = licenseeMap.size;
        const totalRoyalties = formatWeiToEther(totalWei);
        const averageRoyaltyPerLicensee = totalLicensees > 0 ? formatWeiToEther(totalWei / BigInt(totalLicensees)) : '0';

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentTransactions = await limitedStoryScanGet(`/transactions`, {
            params: {
                ip_id: ipId,
                from_date: thirtyDaysAgo.toISOString(),
                limit: 1000
            }
        });

        const recentTxs = recentTransactions.data?.data || [];
        const dailyActivity = recentTxs.reduce((acc, tx) => {
            const date = new Date(tx.timestamp).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        return {
            royaltyMetrics: {
                totalRoyalties,
                totalLicensees,
                averageRoyaltyPerLicensee,
                topLicensees: Array.from(licenseeMap.values())
                    .sort((a, b) => b.totalWei - a.totalWei)
                    .slice(0, 5)
                    .map(licensee => ({
                        address: licensee.address,
                        count: licensee.count,
                        totalValue: formatWeiToEther(licensee.totalWei)
                    }))
            },
            activityMetrics: {
                totalTransactions: recentTxs.length,
                dailyActivity: Object.entries(dailyActivity)
                    .sort(([a], [b]) => new Date(a) - new Date(b))
                    .map(([date, count]) => ({ date, count })),
                averageDailyTransactions: recentTxs.length / 30,
                lastActivity: recentTxs.length > 0 ? recentTxs[0].timestamp : null
            },
            performanceScore: calculatePerformanceScore(licenseeMap.size, recentTxs.length, totalWei)
        };
    } catch (error) {
        console.error('[ANALYTICS] Error fetching performance metrics:', error);
        throw error;
    }
};

/**
 * calculatePerformanceScore(totalLicensees, recentTxs, totalWei)
 * Calculate a performance score for the asset (0-100)
 */
const calculatePerformanceScore = (totalLicensees, recentTxs, totalWei) => {
    try {
        let score = 0;
        
        // Licensee count score (0-30 points)
        if (totalLicensees > 0) score += Math.min(30, totalLicensees * 2);
        
        // Recent activity score (0-30 points)
        if (recentTxs > 0) score += Math.min(30, recentTxs / 10);
        
        // Royalty value score (0-40 points)
        const weiValue = Number(totalWei);
        if (weiValue > 0) {
            const ethValue = weiValue / 1e18;
            score += Math.min(40, Math.log10(ethValue + 1) * 10);
        }
        
        return Math.min(100, Math.round(score));
    } catch (error) {
        console.error('[ANALYTICS] Error calculating performance score:', error);
        return 0;
    }
};

/**
 * getNetworkAnalytics()
 * Get comprehensive network analytics
 */
const getNetworkAnalytics = async () => {
    try {
        // Network stats not available (feature removed)
        const stats = {
            averageBlockTime: null,
            coinPrice: null,
            gasPrices: null,
            marketCap: null,
            totalTransactions: null,
            transactionsToday: null
        };
        
        return {
            success: true,
            data: {
                networkHealth: {
                    utilization: stats.networkUtilizationPercentage,
                    averageBlockTime: stats.averageBlockTime,
                    totalBlocks: stats.totalBlocks,
                    totalAddresses: stats.totalAddresses
                },
                gasMetrics: {
                    currentPrices: stats.gasPrices,
                    gasUsedToday: stats.gasUsedToday,
                    averageBlockTime: stats.averageBlockTime
                },
                activityMetrics: {
                    totalTransactions: stats.totalTransactions,
                    transactionsToday: stats.transactionsToday,
                    totalAddresses: stats.totalAddresses
                },
                marketMetrics: {
                    coinPrice: stats.coinPrice,
                    priceChange: stats.coinPriceChangePercentage,
                    marketCap: stats.marketCap,
                    tvl: stats.tvl
                },
                lastUpdated: stats.lastUpdated
            }
        };
    } catch (error) {
        console.error('[ANALYTICS] Error fetching network analytics:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
};

/**
 * ========================================
 * ROYALTY ANALYTICS FUNCTIONS
 * ========================================
 */

/**
 * getAssetRelationships(ipId)
 * Get parent/child relationships for a specific IP asset
 */
const getAssetRelationships = async (ipId) => {
    try {
        console.log(`[SERVICE] getAssetRelationships called for IP ID: ${ipId}`);
        
        // Get asset details first
        const assetResponse = await limitedStoryApiRequest(`/assets/${ipId}`);
        if (!assetResponse.success || !assetResponse.data) {
            return {
                success: false,
                error: 'Asset not found',
                data: { parents: [], children: [] }
            };
        }

        const asset = assetResponse.data;
        const relationships = {
            parents: [],
            children: []
        };

        // Get parent assets (assets this one is derived from)
        if (asset.parentIpId) {
            try {
                const parentResponse = await limitedStoryApiRequest(`/assets/${asset.parentIpId}`);
                if (parentResponse.success && parentResponse.data) {
                    relationships.parents.push(parentResponse.data);
                }
            } catch (err) {
                console.error('[SERVICE] Error fetching parent asset:', err.message);
            }
        }

        // Get child assets (derivative works based on this asset)
        try {
            const childrenResponse = await limitedStoryApiRequest(`/assets?parentIpId=${ipId}&limit=50`);
            if (childrenResponse.success && childrenResponse.data?.assets) {
                relationships.children = childrenResponse.data.assets;
            }
        } catch (err) {
            console.error('[SERVICE] Error fetching child assets:', err.message);
        }

        return {
            success: true,
            data: relationships
        };
    } catch (error) {
        console.error('[SERVICE] getAssetRelationships error:', error);
        return {
            success: false,
            error: error.message,
            data: { parents: [], children: [] }
        };
    }
};

/**
 * getRoyaltyAnalytics(ownerAddress)
 * Comprehensive royalty analytics for a specific owner
 */
const getRoyaltyAnalytics = async (ownerAddress) => {
    try {
        console.log(`[ANALYTICS] Fetching royalty analytics for owner: ${ownerAddress}`);
        
        // Get ALL assets for the owner (no pagination limit)
        const assetsResponse = await getAssetsByOwner(ownerAddress, 1000, 0);
        const assets = assetsResponse.data || [];
        
        if (assets.length === 0) {
            return {
                success: true,
                data: {
                    metrics: {
                        totalEarnings: 0,
                        totalAssets: 0,
                        avgEarningsPerAsset: 0,
                        totalTransactions: 0
                    },
                    topAssets: [],
                    topLicensees: [],
                    royaltyTrends: []
                }
            };
        }

        // Analyze each asset for royalty data using the existing royalty system
        const assetAnalytics = [];
        const licenseeMap = new Map();
        const dailyEarnings = new Map();
        let totalEarnings = new Decimal(0);
        let totalTransactions = 0;

        for (const asset of assets) {
            try {
                // Use the existing royalty transaction system with sampling for large datasets
                const txs = await fetchRoyaltyTxDetailsForAsset(asset.ipId);
                let assetEarnings = new Decimal(0);
                let transactionCount = txs.length;
                
                // Calculate earnings from real royalty transactions
                for (const tx of txs) {
                    const symbol = tx.symbol || 'UNKNOWN';
                    const decimals = tx.decimals || 18;
                    const usdt = computeUsdtValue(tx.amount, decimals, tx.exchangeRateUsd || 0);
                    assetEarnings = assetEarnings.add(usdt);
                    
                    // Track licensees
                    if (tx.from) {
                        const licenseeAddress = tx.from;
                        if (!licenseeMap.has(licenseeAddress)) {
                            licenseeMap.set(licenseeAddress, {
                                address: licenseeAddress,
                                transactionCount: 0,
                                totalPaid: new Decimal(0)
                            });
                        }
                        const licensee = licenseeMap.get(licenseeAddress);
                        licensee.transactionCount++;
                        licensee.totalPaid = licensee.totalPaid.add(usdt);
                    }
                }
                
                totalEarnings = totalEarnings.add(assetEarnings);
                totalTransactions += transactionCount;

                assetAnalytics.push({
                    ipId: asset.ipId,
                    name: asset.nftMetadata?.name || 'Unnamed Asset',
                    royaltyEarnings: Number(assetEarnings.toFixed(2)),
                    transactionCount: transactionCount,
                    licenseeCount: licenseeMap.size,
                    avgRoyaltyPerTransaction: transactionCount > 0 ? Number(assetEarnings.div(transactionCount).toFixed(2)) : 0,
                    lastTransaction: asset.lastUpdatedAt || null
                });

                // Track licensees - simplified for now
                // No licensee data available yet
                
                // Track daily earnings - simplified for now
                // No daily earnings data available yet
            } catch (error) {
                console.warn(`[ANALYTICS] Failed to analyze asset ${asset.ipId}:`, error.message);
                continue;
            }
        }

        // Sort assets by earnings
        const topAssets = assetAnalytics
            .sort((a, b) => b.royaltyEarnings - a.royaltyEarnings)
            .slice(0, 10);

        // Sort licensees by total paid
        const topLicensees = Array.from(licenseeMap.values())
            .map(licensee => ({
                address: licensee.address,
                transactionCount: licensee.transactionCount,
                totalPaid: Number(licensee.totalPaid.toFixed(2)),
                avgPaymentPerTransaction: licensee.transactionCount > 0 ? Number(licensee.totalPaid.div(licensee.transactionCount).toFixed(2)) : 0
            }))
            .sort((a, b) => b.totalPaid - a.totalPaid)
            .slice(0, 10);

        // Generate royalty trends for last 7 days
        const royaltyTrends = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const amount = dailyEarnings.get(dateStr) || 0;
            
            royaltyTrends.push({
                date: date.toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' }),
                amount: amount
            });
        }

        const analytics = {
            metrics: {
                totalEarnings: Number(totalEarnings.toFixed(2)), // Already converted to USDT
                totalAssets: assets.length,
                avgEarningsPerAsset: assets.length > 0 ? Number(totalEarnings.div(assets.length).toFixed(2)) : 0,
                totalTransactions: totalTransactions,
                currency: 'USDT'
            },
            topAssets: topAssets,
            topLicensees: topLicensees,
            royaltyTrends: royaltyTrends
        };

        console.log(`[ANALYTICS] Successfully generated analytics for ${assets.length} assets`);
        return {
            success: true,
            data: analytics
        };

    } catch (error) {
        console.error('[ANALYTICS] Failed to generate royalty analytics:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
};

// Get children assets using Story Protocol edges API
const getChildrenAssets = async (parentIpId, limit = 200, offset = 0) => {
    try {
        const url = `https://api.storyapis.com/api/v4/assets/edges`;
        const options = {
            method: 'POST',
            headers: {
                'X-Api-Key': storyApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderBy: "blockNumber",
                orderDirection: "desc",
                pagination: {
                    limit: limit,
                    offset: offset
                },
                where: {
                    parentIpId: parentIpId
                }
            })
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Debug logging (can be removed in production)
        console.log('Story Protocol API Response:', {
            dataKeys: Object.keys(data),
            pagination: data?.pagination,
            childrenCount: data?.data?.length,
            hasMore: data?.pagination?.hasMore
        });
        
        // Extract children from edges data
        const children = data?.data || [];
        
        // Try to get total from different possible locations
        let total = 0;
        if (data?.pagination?.total && data.pagination.total > 0) {
            total = data.pagination.total;
        } else if (data?.total && data.total > 0) {
            total = data.total;
        } else {
            // If no accurate total from API, estimate based on current data and hasMore
            total = children.length;
            if (data?.pagination?.hasMore === true) {
                // If hasMore is true, we know there are more children
                // Make a reasonable estimate: at least one more page
                total = Math.max(children.length, offset + limit );
            }
        }
        
        // Transform edges data to asset-like format for frontend
        const transformedChildren = children.map(edge => ({
            ipId: edge.childIpId,
            parentIpId: edge.parentIpId,
            blockNumber: edge.blockNumber,
            blockTimestamp: edge.blockTimestamp,
            txHash: edge.txHash,
            caller: edge.caller,
            licenseTokenId: edge.licenseTokenId,
            licenseTermsId: edge.licenseTermsId,
            licenseTemplate: edge.licenseTemplate,
            processedAt: edge.processedAt,
            // Add some default values for display
            name: `Derivative Work #${edge.id}`,
            createdAt: edge.blockTimestamp,
            royaltyRate: null // Will be fetched separately if needed
        }));
        
        // Determine hasMore based on available data
        let hasMore = false;
        if (data?.pagination?.hasMore !== undefined) {
            hasMore = data.pagination.hasMore;
        } else {
            hasMore = (offset + limit) < total;
        }
        
        return {
            success: true,
            data: {
                children: transformedChildren,
                total: total,
                hasMore: hasMore
            }
        };
    } catch (error) {
        console.error('Error fetching children assets:', error);
        throw error;
    }
};

module.exports = {
    getAssetsByOwner,
    getAssetDetails,
    getRoyaltyTransactions,
    getTopLicensees,
    fetchTransactionDetailFromStoryScan,
    getPortfolioStats,
    getPortfolioStatsFast, // Export fast mode function
    getAssetCountOnly, // Export count-only function
    getAndAggregateRoyaltyEventsFromApi,
    formatWeiToEther,
    // internal helpers for other modules (optional export)
    formatTokenAmountWithDecimals,
    computeUsdtValue,
    formatUsdtCurrency,
    fetchRoyaltyTxDetailsForAsset,
    getAssetLeaderboard,
    getPortfolioLicensees,
    getAssetsStatusSummary,
    // streaming/progress helpers
    startPortfolioAggregation,
    getProgress,
    // expose rate-limited StoryScan GET for other modules (routes)
    limitedStoryScanGet,
    // Analytics functions
    getAssetAnalytics,
    getAssetTransactionHistory,
    getAssetGasAnalytics,
    getAssetContractInteractions,
    getAssetPerformanceMetrics,
    getNetworkAnalytics,
    
    // Asset Relationships functions
    getAssetRelationships,
    
    // Royalty Analytics functions
    getRoyaltyAnalytics,
    
    // Children Assets functions
    getChildrenAssets
};