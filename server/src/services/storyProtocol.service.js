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
    maxSockets: 200,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 200,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000
});

// Configure axios defaults
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 5000; // 5 second default timeout

// Royalty progress tracking removed for production; keep logs only

// ---------------------------------------------
// Royalty cache (TTL optional + simple pruning)
// ---------------------------------------------
const royaltyDataCache = global.__royaltyDataCache || new Map();
const royaltyDataTimestamps = global.__royaltyDataTimestamps || new Map();
global.__royaltyDataCache = royaltyDataCache;
global.__royaltyDataTimestamps = royaltyDataTimestamps;

const ROYALTY_CACHE_TTL_MS = (() => {
    const v = parseInt(process.env.ROYALTY_CACHE_TTL_MS || '0', 10);
    return Number.isFinite(v) && v > 0 ? v : 0; // 0 = no TTL
})();

const ROYALTY_CACHE_MAX = (() => {
    const v = parseInt(process.env.ROYALTY_CACHE_MAX || '0', 10);
    return Number.isFinite(v) && v > 0 ? v : 0; // 0 = no cap
})();

function setRoyaltyCache(key, value) {
    try {
        royaltyDataCache.set(key, value);
        royaltyDataTimestamps.set(key, Date.now());
        if (ROYALTY_CACHE_MAX && royaltyDataCache.size > ROYALTY_CACHE_MAX) {
            pruneRoyaltyCacheToMax();
        }
    } catch {}
}

function getRoyaltyCache(key) {
    try {
        if (!royaltyDataCache.has(key)) return undefined;
        if (ROYALTY_CACHE_TTL_MS) {
            const ts = royaltyDataTimestamps.get(key) || 0;
            if (ts && Date.now() - ts > ROYALTY_CACHE_TTL_MS) {
                royaltyDataCache.delete(key);
                royaltyDataTimestamps.delete(key);
                return undefined;
            }
        }
        return royaltyDataCache.get(key);
    } catch {
        return undefined;
    }
}

function touchRoyaltyCache(key) {
    try {
        if (royaltyDataCache.has(key)) {
            royaltyDataTimestamps.set(key, Date.now());
        }
    } catch {}
}

function pruneRoyaltyCacheToMax() {
    try {
        if (!ROYALTY_CACHE_MAX || royaltyDataCache.size <= ROYALTY_CACHE_MAX) return;
        // Evict oldest entries by timestamp
        const entries = [];
        for (const [k, t] of royaltyDataTimestamps.entries()) {
            entries.push([k, t || 0]);
        }
        entries.sort((a, b) => a[1] - b[1]);
        const needToRemove = royaltyDataCache.size - ROYALTY_CACHE_MAX;
        for (let i = 0; i < needToRemove && i < entries.length; i++) {
            const key = entries[i][0];
            royaltyDataCache.delete(key);
            royaltyDataTimestamps.delete(key);
        }
    } catch {}
}

function clearRoyaltyCache(olderThanMs = 0) {
    try {
        if (!olderThanMs) {
            royaltyDataCache.clear();
            royaltyDataTimestamps.clear();
            return;
        }
        const now = Date.now();
        for (const [k, t] of royaltyDataTimestamps.entries()) {
            if (!t || now - t >= olderThanMs) {
                royaltyDataTimestamps.delete(k);
                royaltyDataCache.delete(k);
            }
        }
    } catch {}
}

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
            timeout: options.timeout || 30000, // Use provided timeout or default 30 seconds
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

// Simple deterministic hash for round-robin key selection
function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return h;
}

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
    const DBG = process.env.DEBUG_ROYALTY_FLOW === '1';
    const t0 = DBG ? Date.now() : 0;
    try {
        const response = await axios({
            ...options,
            timeout: options.timeout || 12000, // Use the timeout from options
            headers: {
                ...options.headers,
                'User-Agent': 'RoyaltyFlow/1.0 (Story Protocol Rate Limited)'
            }
        });
        if (DBG) {
            const url = options?.url || '';
            const kind = url.includes('transactions') ? 'STORY_API_TX' : (url.includes('assets') ? 'STORY_API_ASSETS' : 'STORY_API');
            console.log(`[ROYALTY][${kind}] OK in ${Date.now()-t0}ms url=${url}`);
        }
        
        // Log rate limit headers for monitoring
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        if (DEBUG_AGGR_LOGS && (remaining || reset)) {
            console.log(`[STORYAPI] Rate limit - Remaining: ${remaining}, Reset: ${reset}`);
        }
        
        return response;
    } catch (e) {
        if (DBG) {
            const url = options?.url || '';
            console.log(`[ROYALTY][STORY_API] FAIL in ${Date.now()-t0}ms url=${url} status=${e.response?.status||'N/A'} msg=${e.message}`);
        }
        const status = e.response?.status;
        // Handle 429 from Story API with small backoff
        if (status === 429 && retries > 0) {
            const retryAfter = e.response?.headers['retry-after'];
            const backoffMs = retryAfter ? parseInt(retryAfter) * 1000 : 120; // minimal backoff
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

// Batch fetch dispute events for multiple IP IDs
const fetchDisputeEventsForMultipleIpIds = async (ipIds) => {
    if (!ipIds || ipIds.length === 0) return [];
    
    try {
        const body = {
            where: { 
                eventTypes: ["DisputeRaised", "DisputeResolved"], 
                ipIds: ipIds.filter(Boolean) 
            },
            pagination: { limit: 200, offset: 0 }
        };
        
        const resp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, body, 'POST');
        return resp.events || resp.data || [];
    } catch (e) {
        console.log(`[SERVICE] BATCH_DISPUTE_EVENTS_ERROR: ${e.message}`);
        return [];
    }
};

// Quick check if asset has royalty events (first page only)
const quickCheckRoyaltyEvents = async (ipId) => {
    try {
        if (!ipId || !storyApiKey) return false;
        
        const body = {
            where: { eventTypes: ["RoyaltyPaid"], ipIds: [ipId] },
            pagination: { limit: 1, offset: 0 }
        };
        
        const resp = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, body, 'POST');
        const events = resp.events || resp.data || [];
        return events.length > 0;
    } catch (e) {
        return false;
    }
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
    const DBG = process.env.DEBUG_ROYALTY_FLOW === '1';
    // Increase assets timeout; keep transactions short
    const timeout = url.includes('transactions') ? 7000 : 15000;
    
    if (DBG) {
        const kind = url.includes('transactions') ? 'STORY_API_TX' : (url.includes('assets') ? 'STORY_API_ASSETS' : 'STORY_API');
        console.log(`[ROYALTY][${kind}] START url=${url} timeout=${timeout}ms`);
    }
    
    const options = {
        method,
        url,
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
        },
        data: body,
        timeout: timeout,
    };

    const fetchWithRetry = async (opts, retries = 1, backoffMs = 150) => {
        let attempt = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                // Respect global Story API rate limit
                return await limitedStoryApiRequest(opts);
            } catch (err) {
                const status = err.response?.status;
                const retriable = !status || status >= 500 || err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
                if (attempt >= retries || !retriable) throw err;
                // backoff
                // eslint-disable-next-line no-await-in-loop
                await sleep(backoffMs);
                attempt += 1;
            }
        }
    };

    try {
        const t0 = DBG ? Date.now() : 0;
        const response = await fetchWithRetry(options);
        if (DBG) {
            const kind = url.includes(STORY_TRANSACTIONS_API_BASE_URL) ? 'TX_PAGE' : (url.includes(STORY_ASSETS_API_BASE_URL) ? 'ASSETS' : 'OTHER');
            console.log(`[ROYALTY][STORY_API_${kind}] OK in ${Date.now()-t0}ms limit=${body?.pagination?.limit||'-'} offset=${body?.pagination?.offset||'-'}`);
        }
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
        // First page fetch
        try {
            const body0 = {
                where: { eventTypes: ["RoyaltyPaid"], ipIds: [candidateId] },
                pagination: { limit: pageSize, offset: 0 }
            };
            const resp0 = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, body0, 'POST');
            const firstPage = resp0.events || resp0.data || [];
            if (!firstPage || firstPage.length === 0) {
                // Early-exit: no events for this candidate, try next candidate
                continue;
            }
            allEvents.push(...firstPage);
            offset += firstPage.length;
        } catch (e) {
            console.error(`[PAGINATION] First page failed for ${candidateId}: ${e.message}`);
            continue;
        }

        // Next pages only if first page had data
        for (let page = 1; ; page++) {
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
        // Pilih API key secara round-robin berdasarkan hash (deterministik)
        const keys = Object.keys(process.env)
            .filter(k => k === 'STORYSCAN_API_KEY' || k.startsWith('STORYSCAN_API_KEY_'))
            .map(k => ({ name: k, value: (process.env[k] || '').trim() }))
            .filter(kv => kv.value.length > 0);
        const index = Math.abs(hashString(txHash)) % Math.max(keys.length, 1);
        const chosen = keys.length > 0 ? keys[index] : { name: 'STORYSCAN_API_KEY', value: storyScanApiKey };
        if (process.env.DEBUG_ROYALTY_FLOW === '1' || true) {
            console.log(`[ROYALTY] KEY_USE tx=${txHash.substring(0,10)} key=${chosen.name} idx=${index}/${Math.max(keys.length,1)}`);
        }
        const resp = await limitedStoryScanGet(url, { headers: { 'X-Api-Key': chosen.value }, timeout: 60000 });
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
        // Retry up to 2x for network/timeout
        const isTimeout = e.code === 'ECONNABORTED' || /timeout/i.test(e.message || '');
        const isNetwork = /Network Error/i.test(e.message || '') || !e.response;
        if (isTimeout || isNetwork) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    await sleep(500 * attempt);
                    const retryUrl = `${STORY_TRANSACTION_DETAIL_BASE_URL}/${txHash}`;
                    const retry = await limitedStoryScanGet(retryUrl, { headers: { 'X-Api-Key': chosen.value }, timeout: 60000 });
                    const txData2 = retry.data || {};
                    let royaltyTransfer2 = null;
                    if (Array.isArray(txData2.token_transfers) && txData2.token_transfers.length > 0) {
                        royaltyTransfer2 = txData2.token_transfers[0];
                    }
                    if (royaltyTransfer2 && royaltyTransfer2.total && royaltyTransfer2.total.value) {
                        const amount = BigInt(String(royaltyTransfer2.total.value));
                        const decimals = parseInt(royaltyTransfer2.token?.decimals || 18, 10) || 18;
                        const symbol = royaltyTransfer2.token?.symbol || 'UNKNOWN';
                        const tokenAddress = royaltyTransfer2.token?.address_hash || null;
                        const exchangeRateUsd = royaltyTransfer2.token?.exchange_rate ? String(royaltyTransfer2.token.exchange_rate) : null;
                        const from = txData2.from?.hash || null;
                        const timestamp = txData2.timestamp || null;
                        return { amount, decimals, symbol, tokenAddress, exchangeRateUsd, from, timestamp };
                    }
                } catch (e2) {
                    console.error(`[STORYSCAN RETRY ${attempt}] tx ${txHash} failed: ${e2.message}`);
                }
            }
        }
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

    const aggrStart = Date.now();
    const DEBUG_ROYALTY_FLOW = process.env.DEBUG_ROYALTY_FLOW === '1';
    if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] START ipId=${ipId}`);

    // Normalize ipId to checksum if possible, but still try AS-IS + lowercase fallback in loop below
    let idPrimary = ipId;
    try {
        const { ethers } = require('ethers');
        if (ethers?.utils?.getAddress) {
            idPrimary = ethers.utils.getAddress(String(ipId));
            if (DEBUG_ROYALTY_FLOW && idPrimary !== ipId) {
                console.log(`[ROYALTY] NORMALIZED ipId to checksum: ${idPrimary}`);
            }
        }
    } catch (_) {}

    // Full pagination to get ALL events, not just 200
    const buildRequest = (id, offset = 0, withEventTypes = true) => ({
        where: withEventTypes ? { eventTypes: ["RoyaltyPaid"], ipIds: [id] } : { ipIds: [id] },
        pagination: { limit: 100, offset },
        orderBy: "blockNumber",
        orderDirection: "desc"
    });

    let allEvents = [];
    let offset = 0;
    let hasMore = true;
    let totalFetched = 0;

    // Fetch all pages of events
    let pageIndex = 0;
    const inFlightPages = 3; // pipeline up to 3 pages concurrently
    while (hasMore) {
        const pageStartTs = Date.now();
        if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] PAGE_START ipId=${idPrimary} page=${pageIndex} offset=${offset} inFlight=${inFlightPages}`);
        const reqs = [];
        for (let i = 0; i < inFlightPages; i++) {
            reqs.push(fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, buildRequest(idPrimary, offset + (i * 100), true), 'POST'));
        }
        const resps = await Promise.allSettled(reqs);
        let batchedEvents = [];
        for (const r of resps) {
            if (r.status === 'fulfilled') {
                const ev = r.value?.events || r.value?.data || [];
                if (Array.isArray(ev) && ev.length > 0) batchedEvents = batchedEvents.concat(ev);
            }
        }
        let events = batchedEvents;
        if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] PAGE_RESULT ipId=${idPrimary} page=${pageIndex} events=${events.length} time=${Date.now()-pageStartTs}ms`);

        // If no events with original case, try lowercase
        if ((!events || events.length === 0) && idPrimary.toLowerCase() !== idPrimary && offset === 0) {
            if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] FALLBACK_LOWERCASE ipId=${idPrimary} trying lowercase`);
            const reqs2 = [];
            for (let i = 0; i < inFlightPages; i++) {
                reqs2.push(fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, buildRequest(idPrimary.toLowerCase(), offset + (i * 100), true), 'POST'));
            }
            const resps2 = await Promise.allSettled(reqs2);
            let be2 = [];
            for (const r of resps2) {
                if (r.status === 'fulfilled') {
                    const ev = r.value?.events || r.value?.data || [];
                    if (Array.isArray(ev) && ev.length > 0) be2 = be2.concat(ev);
                }
            }
            events = be2;
            if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] FALLBACK_RESULT ipId=${idPrimary} events=${events.length}`);
    }

    if (!events || events.length === 0) {
            hasMore = false;
        } else {
            allEvents = allEvents.concat(events);
            totalFetched += events.length;
            // Incremental cache write for events
            try {
                const existingPrimary = getRoyaltyCache(idPrimary) || { events: [], detailed: [] };
                setRoyaltyCache(idPrimary, { events: allEvents.slice(), detailed: existingPrimary.detailed || [] });
                const lowerKey = idPrimary.toLowerCase();
                const existingLower = getRoyaltyCache(lowerKey) || { events: [], detailed: [] };
                setRoyaltyCache(lowerKey, { events: allEvents.slice(), detailed: existingLower.detailed || [] });
            } catch {}
            if (DEBUG_ROYALTY_FLOW) {
                const elapsed = Date.now() - pageStartTs;
                console.log(`[ROYALTY] PAGE_DONE ipId=${idPrimary} page=${pageIndex} offset=${offset} fetched=${events.length} total=${allEvents.length} elapsedMs=${elapsed}`);
            }
            
            // If we got less than the limit, we've reached the end
            if (events.length < 100 * inFlightPages) {
                hasMore = false;
            } else {
                offset += 100 * inFlightPages;
            }
            pageIndex += 1;
        }
    }

    // Optional fallback DISABLED for small cases: do not widen when first page is empty
    if (false && allEvents.length === 0 && process.env.FALLBACK_NO_EVENTTYPES === '1') {
        if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] FALLBACK_NO_EVENTTYPES ipId=${idPrimary} enabled`);
        let offset2 = 0; let hasMore2 = true; let pageIndex2 = 0; let fetched2 = 0;
        while (hasMore2) {
            const pageStartTs2 = Date.now();
            const resp2 = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, storyApiKey, buildRequest(idPrimary, offset2, false), 'POST');
            const page2 = resp2.events || resp2.data || [];
            if (!page2 || page2.length === 0) {
                hasMore2 = false;
            } else {
                allEvents = allEvents.concat(page2);
                fetched2 += page2.length;
                if (DEBUG_ROYALTY_FLOW) {
                    const elapsed2 = Date.now() - pageStartTs2;
                    console.log(`[ROYALTY] PAGE2 ipId=${idPrimary} page=${pageIndex2} offset=${offset2} fetched=${page2.length} elapsedMs=${elapsed2}`);
                }
                if (page2.length < 100) hasMore2 = false; else offset2 += 100;
                pageIndex2 += 1;
            }
        }
        if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] PAGINATION2 ipId=${idPrimary} totalEvents=${fetched2} pages=${Math.ceil(fetched2 / 100)}`);
    }

    const events = allEvents;

    if (!events || events.length === 0) {
        if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] SKIP_NO_EVENTS ipId=${idPrimary} reason=No RoyaltyPaid events`);
        return { totalRoyaltiesByToken: new Map(), licenseeMap: new Map() };
    }

    // Fetch StoryScan details using worker pool + queue with 24 workers (8 per API key x 3)
    if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] SCAN_BEGIN ipId=${idPrimary} txCount=${events.length}`);
    const txHashes = events
        .map(ev => ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash)
        .filter(Boolean);

    // Hitung jumlah API key StoryScan yang tersedia untuk mengatur worker secara dinamis
    const scanKeysCount = Object.keys(process.env)
        .filter(k => k === 'STORYSCAN_API_KEY' || k.startsWith('STORYSCAN_API_KEY_'))
        .filter(k => (process.env[k] || '').trim().length > 0)
        .length || 1;
    // Target: 7 RPS per key => 7 worker per key (masing-masing 1 req/detik)
    const dynamicWorkerCount = Math.max(7, Math.min(scanKeysCount * 7, 100));
    if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] SCAN_CFG keys=${scanKeysCount} workers=${dynamicWorkerCount} pageSize=50 rps_per_key=7`);

    const detailed = await processTxHashesWithWorkerPool(txHashes, {
        pageSize: 100,
        workerCount: dynamicWorkerCount,
        perWorkerIntervalMs: 600, // turun jadi ~7rps per key, lebih responsif
        timeoutMs: 15000,
        onResult: (res) => {
            try {
                const keyA = idPrimary;
                const keyB = idPrimary.toLowerCase();
                const curA = getRoyaltyCache(keyA) || { events: allEvents.slice(), detailed: [] };
                curA.detailed = (curA.detailed || []).concat([res]);
                setRoyaltyCache(keyA, curA);
                const curB = getRoyaltyCache(keyB) || { events: allEvents.slice(), detailed: [] };
                curB.detailed = (curB.detailed || []).concat([res]);
                setRoyaltyCache(keyB, curB);
            } catch {}
        }
    });
    if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] SCAN_DONE ipId=${idPrimary} detailedCount=${detailed.length}`);
    // Cache data for reuse (ledger, quick summaries)
    try {
        royaltyDataCache.set(idPrimary, { events, detailed });
    } catch {}

    const totalRoyaltiesByToken = new Map();
    const licenseeMap = new Map();
    let totalEthWei = 0n;

    for (const d of detailed) {
        const txDetail = d?.detail || {};
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

    const aggrElapsed = Date.now() - aggrStart;
    if (totalEthWei > 0n) {
        if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] RESULT ipId=${ipId} SUCCESS totalEthWei=${totalEthWei.toString()} totalEvents=${allEvents.length} elapsedMs=${aggrElapsed}`);
    } else {
        if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] RESULT ipId=${ipId} EMPTY totalEvents=${allEvents.length} elapsedMs=${aggrElapsed}`);
    }

    return { totalRoyaltiesByToken, licenseeMap };
};


// Worker-pool + queue to process StoryScan tx hashes with controlled parallelism
// - Splits tasks into pages of 50
// - Uses 24 workers (8 per API key x 3)
// - Each worker processes max 1 task per second
// - Respects existing caches via getTxDetailCache/setTxDetailCache in fetch
const processTxHashesWithWorkerPool = async (
    txHashes,
    {
        pageSize = 50,
        workerCount = 24,
        perWorkerIntervalMs = 100, // Much faster for small batches
        timeoutMs = 8000 // Reduced timeout
    } = {}
) => {
    if (!Array.isArray(txHashes) || txHashes.length === 0) return [];

    // Dynamic configuration based on dataset size
    const totalTxHashes = txHashes.length;
    let optimizedConfig = { pageSize, workerCount, perWorkerIntervalMs, timeoutMs };
    
    // Count available API keys
    const availableKeys = Object.keys(process.env)
        .filter(k => k === 'STORYSCAN_API_KEY' || k.startsWith('STORYSCAN_API_KEY_'))
        .map(k => process.env[k])
        .filter(v => v && v.trim().length > 0).length;
    
    const maxWorkers = availableKeys * 8; // 8 workers per API key (aggressive)
    
    if (totalTxHashes > 500) {
        // Large dataset optimization - use all available workers
        optimizedConfig = {
            pageSize: 100,           // Larger pages for efficiency
            workerCount: Math.min(maxWorkers, totalTxHashes), // Use all available workers
            perWorkerIntervalMs: 100,  // Slower to avoid rate limiting with 8 workers per key
            timeoutMs: 10000         // Longer timeout for large datasets
        };
    } else if (totalTxHashes > 100) {
        // Medium dataset optimization
        optimizedConfig = {
            pageSize: 75,
            workerCount: Math.min(Math.max(16, maxWorkers * 0.8), totalTxHashes), // Use 80% of available workers
            perWorkerIntervalMs: 120,  // Slower to avoid rate limiting
            timeoutMs: 9000
        };
    } else {
        // Small dataset - use all available workers
        optimizedConfig = {
            pageSize: 50,
            workerCount: Math.min(maxWorkers, totalTxHashes),
            perWorkerIntervalMs: 150,  // Slower to avoid rate limiting
            timeoutMs: 8000
        };
    }

    const results = [];
    const DEBUG_ROYALTY_FLOW = process.env.DEBUG_ROYALTY_FLOW === '1';
    const startTime = DEBUG_ROYALTY_FLOW ? Date.now() : 0;
    console.log(`[ROYALTY] WORKER_START total=${totalTxHashes} workers=${optimizedConfig.workerCount} interval=${optimizedConfig.perWorkerIntervalMs}ms timeout=${optimizedConfig.timeoutMs}ms pageSize=${optimizedConfig.pageSize} apiKeys=${availableKeys} maxWorkers=${maxWorkers}`);

    // Process all txHashes in parallel with controlled concurrency
    console.log(`[ROYALTY] PROCESSING_ALL_TX total=${txHashes.length} concurrency=${optimizedConfig.workerCount}`);
    
    const processTxHash = async (txHash, index) => {
        const txStartTime = DEBUG_ROYALTY_FLOW ? Date.now() : 0;
        try {
            // Check cache first
            const cached = getTxDetailCache(txHash);
            if (cached) {
                if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] HIT_CACHE tx=${txHash.substring(0,10)} in ${Date.now()-txStartTime}ms`);
                return { txHash, detail: cached };
            } else {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), optimizedConfig.timeoutMs);
                try {
                    const detail = await fetchTransactionDetailFromStoryScan(txHash, { signal: controller.signal });
                    setTxDetailCache(txHash, detail);
                    if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] OK tx=${txHash.substring(0,10)} in ${Date.now()-txStartTime}ms`);
                    return { txHash, detail };
                } catch (e) {
                    if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] FAIL tx=${txHash.substring(0,10)} in ${Date.now()-txStartTime}ms err=${e?.message || 'unknown'}`);
                    return { txHash, detail: { amount: 0n, decimals: 18, symbol: 'ETH', tokenAddress: null, exchangeRateUsd: null, from: null } };
                } finally {
                    clearTimeout(timeout);
                }
            }
        } catch (e) {
            if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] ERROR tx=${txHash.substring(0,10)} in ${Date.now()-txStartTime}ms err=${e?.message || 'unknown'}`);
            return { txHash, detail: { amount: 0n, decimals: 18, symbol: 'ETH', tokenAddress: null, exchangeRateUsd: null, from: null } };
        }
    };

    // Process in batches with controlled concurrency
    const batchSize = optimizedConfig.workerCount;
    for (let i = 0; i < txHashes.length; i += batchSize) {
        const batch = txHashes.slice(i, i + batchSize);
        console.log(`[ROYALTY] BATCH_START start=${i} size=${batch.length} concurrency=${batch.length}`);
        const batchStartTime = Date.now();
        
        const batchPromises = batch.map((txHash, batchIndex) => 
            processTxHash(txHash, i + batchIndex)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        console.log(`[ROYALTY] BATCH_DONE start=${i} size=${batch.length} results=${batchResults.length} batchTime=${Date.now()-batchStartTime}ms totalResults=${results.length}`);
        
        // Small delay between batches to avoid overwhelming the API
        if (i + batchSize < txHashes.length) {
            await sleep(100);
        }
    }

    if (DEBUG_ROYALTY_FLOW) console.log(`[ROYALTY] WORKER_COMPLETE total=${results.length} totalTime=${Date.now()-startTime}ms`);
    return results;
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
    const serviceStart = Date.now();
    const DEBUG_ROYALTY_FLOW = process.env.DEBUG_ROYALTY_FLOW === '1';
    
    console.log(`[SERVICE] ENTRY owner=${ownerAddress} limit=${limit} offset=${offset} tokenContract=${tokenContract}`);
    
    if (!storyApiKey) {
        console.log(`[SERVICE] ERROR: STORY_PROTOCOL_API_KEY missing`);
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }
    const key = `${ownerAddress || ''}|${tokenContract || ''}|${limit}|${offset}`;
    console.log(`[SERVICE] CACHE_CHECK key=${key}`);
    const cached = assetsCacheGet(key);
    if (cached) {
        console.log(`[SERVICE] CACHE_HIT owner=${ownerAddress} time=${Date.now()-serviceStart}ms`);
        return cached;
    }
    console.log(`[SERVICE] CACHE_MISS checking inFlight`);
    if (assetsInFlightByKey.has(key)) {
        console.log(`[SERVICE] INFLIGHT_WAIT owner=${ownerAddress}`);
        return await assetsInFlightByKey.get(key);
    }
    console.log(`[SERVICE] NOT_INFLIGHT proceeding with API call`);
    const whereClause = {};
    if (ownerAddress) whereClause.ownerAddress = ownerAddress.trim();
    if (tokenContract) {
        const cleaned = tokenContract.trim();
        if (cleaned) whereClause.tokenContract = cleaned;
    }

    if (Object.keys(whereClause).length === 0) {
        console.log(`[SERVICE] EMPTY_WHERE_CLAUSE returning empty result`);
        return { data: [], pagination: { total: 0 } };
    }

    // Use maximum limit for better performance
    const optimizedLimit = Math.min(limit, 200);
    console.log(`[SERVICE] BUILDING_REQUEST optimizedLimit=${optimizedLimit} whereClause=`, whereClause);
    
    const requestBody = {
        includeLicenses: true,
        moderated: false,
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit: optimizedLimit, offset },
        where: whereClause
    };
    console.log(`[SERVICE] REQUEST_BODY ready, calling fetchStoryApi`);
    console.log(`[SERVICE] API_URL=${STORY_ASSETS_API_BASE_URL} API_KEY=${storyApiKey ? 'SET' : 'MISSING'}`);

    let resp;
    const promise = (async () => {
        if (DEBUG_ROYALTY_FLOW) console.log(`[SERVICE] ASSETS_FETCH_START owner=${ownerAddress} limit=${optimizedLimit} offset=${offset}`);
        console.log(`[SERVICE] CALLING_FETCH_STORY_API`);
        resp = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, requestBody, 'POST');
        console.log(`[SERVICE] FETCH_STORY_API_RETURNED`);

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
        console.log(`[SERVICE] PROCESSING_DATA assets=${data.length}`);
        try {
            const dispReq = {
                where: { ipIds: data.map(a => a.ipId).filter(Boolean) },
                pagination: { limit: data.length || 50 }
            };
            console.log(`[SERVICE] FETCHING_DISPUTES ipIds=${data.map(a => a.ipId).filter(Boolean).length}`);
            const dispResp = await fetchStoryApi(STORY_DISPUTES_API_BASE_URL, storyApiKey, dispReq, 'POST');
            console.log(`[SERVICE] DISPUTES_FETCHED`);
            const dispItems = dispResp.data || dispResp.disputes || [];
            const ipToStatus = new Map();
            for (const d of dispItems) {
                const ip = d?.ipId || d?.ip_id;
                const status = d?.status || d?.state || 'Active';
                if (ip) ipToStatus.set(ip, status);
            }
            // Batch process dispute events for all assets at once
            const assetsNeedingDisputeCheck = data.filter(a => !ipToStatus.has(a.ipId) || !a.disputeStatus || a.disputeStatus === 'None');
            if (assetsNeedingDisputeCheck.length > 0) {
                console.log(`[SERVICE] BATCH_DISPUTE_EVENTS assets=${assetsNeedingDisputeCheck.length}`);
                try {
                    // Fetch dispute events for all assets in one batch
                    const disputeEvents = await fetchDisputeEventsForMultipleIpIds(assetsNeedingDisputeCheck.map(a => a.ipId));
                    console.log(`[SERVICE] BATCH_DISPUTE_EVENTS_COMPLETE events=${disputeEvents.length}`);
                    
                    // Map dispute events to assets
                    const ipToDisputeStatus = new Map();
                    for (const event of disputeEvents) {
                        const ipId = event.ipId;
                        if (ipId && !ipToDisputeStatus.has(ipId)) {
                            const status = deriveDisputeStatusFromEvents([event]);
                            if (status) ipToDisputeStatus.set(ipId, status);
                        }
                    }
                    
                    // Apply dispute status to assets
                    for (const a of data) {
                        if (ipToStatus.has(a.ipId)) {
                            a.disputeStatus = ipToStatus.get(a.ipId);
                        } else if (ipToDisputeStatus.has(a.ipId)) {
                            a.disputeStatus = ipToDisputeStatus.get(a.ipId);
                        }
                    }
                } catch (e) {
                    console.log(`[SERVICE] BATCH_DISPUTE_ERROR: ${e.message}`);
                }
            } else {
                // Apply existing dispute status
                for (const a of data) {
                    if (ipToStatus.has(a.ipId)) a.disputeStatus = ipToStatus.get(a.ipId);
                }
            }
            
            // Process image URLs for all assets
            for (const a of data) {
                // Simple image URL normalization - ensure both imageUrl and nftMetadata.image.cachedUrl
                if (a.uri) {
                    // Always set imageUrl
                    a.imageUrl = a.uri.startsWith('ipfs://') 
                        ? a.uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                        : a.uri;
                    
                    // Only set nftMetadata.image.cachedUrl if it doesn't exist or is empty
                    if (!a.nftMetadata) {
                        a.nftMetadata = {};
                    }
                    if (!a.nftMetadata.image) {
                        a.nftMetadata.image = {};
                    }
                    // Only set cachedUrl if it doesn't exist or is empty
                    if (!a.nftMetadata.image.cachedUrl) {
                        a.nftMetadata.image.cachedUrl = a.imageUrl;
                    }
                }
                
                // Skip image processing for search results to improve performance
                // Image processing will be done in detail view if needed
                if (!a.mediaType || a.mediaType === 'UNKNOWN') {
                    a.mediaType = 'UNKNOWN'; // Keep as UNKNOWN for search results
                }
                
                // Set default royalty and analytics to 0, will be updated in batch processing
                a.totalRoyaltyCollected = '0.000000 WIP';
                a.analytics = { totalRoyaltiesPaid: {} };
            }
        } catch (e) {
            // ignore disputes enrich failure
        }

        // Use batch royalty processing for better performance
        if (data && data.length > 0) {
            console.log(`[SERVICE] STARTING_BATCH_ROYALTY_PROCESSING assets=${data.length}`);
            try {
                // Skip pre-filtering for now - process all assets with batch processing
                console.log(`[SERVICE] SKIPPING_PRE_FILTER assets=${data.length} - using batch processing for all`);
                const assetsWithRoyalty = data; // Process all assets
                const assetsWithoutRoyalty = []; // No assets to skip
                
                console.log(`[SERVICE] PRE_FILTER_RESULT withRoyalty=${assetsWithRoyalty.length} withoutRoyalty=${assetsWithoutRoyalty.length}`);
                
                // Set default values for assets without royalty
                for (const asset of assetsWithoutRoyalty) {
                    asset.totalRoyaltyCollected = '0.000000 WIP';
                    asset.analytics = { totalRoyaltiesPaid: {} };
                }
                
                // Process all assets with single optimized worker pool
                if (assetsWithRoyalty.length > 0) {
                    console.log(`[SERVICE] PROCESSING_ALL_ASSETS assets=${assetsWithRoyalty.length} with single worker pool`);
                    
                    // Process all assets in parallel with single worker pool
                    const assetPromises = assetsWithRoyalty.map(async (asset, assetIndex) => {
                        try {
                            console.log(`[SERVICE] CALLING_ROYALTY_API asset=${assetIndex+1}/${assetsWithRoyalty.length} ipId=${asset.ipId}`);
                            const { totalRoyaltiesByToken } = await getAndAggregateRoyaltyEventsFromApi(asset.ipId);
                            console.log(`[SERVICE] ROYALTY_COMPLETE asset=${assetIndex+1}/${assetsWithRoyalty.length} ipId=${asset.ipId}`);
                        
                        // Initialize analytics object
                        asset.analytics = asset.analytics || {};
                        asset.analytics.totalRoyaltiesPaid = {};
                        
                        if (totalRoyaltiesByToken && totalRoyaltiesByToken.size > 0) {
                            let hasRoyalty = false;
                            
                            // Populate analytics.totalRoyaltiesPaid for all currencies
                            for (const [symbol, data] of totalRoyaltiesByToken.entries()) {
                                if (data && data.total && data.total > 0n) {
                                    const amount = formatWeiToEther(data.total.toString());
                                    const displaySymbol = symbol === 'ETH' ? 'IP' : symbol;
                                    asset.analytics.totalRoyaltiesPaid[displaySymbol] = `${amount} ${displaySymbol}`;
                                    hasRoyalty = true;
                                }
                            }
                            
                            // Set totalRoyaltyCollected (display in card)
                            const wipData = totalRoyaltiesByToken.get('WIP');
                            if (wipData && wipData.total > 0n) {
                                const wipAmount = formatWeiToEther(wipData.total.toString());
                                asset.totalRoyaltyCollected = `${wipAmount} WIP`;
                            } else if (hasRoyalty) {
                                // If no WIP but has other currencies, show first currency
                                const firstEntry = Array.from(totalRoyaltiesByToken.entries())[0];
                                const amount = formatWeiToEther(firstEntry[1].total.toString());
                                const displaySymbol = firstEntry[0] === 'ETH' ? 'IP' : firstEntry[0];
                                asset.totalRoyaltyCollected = `${amount} ${displaySymbol}`;
                            } else {
                                asset.totalRoyaltyCollected = '0.000000 WIP';
                            }
                        } else {
                            asset.totalRoyaltyCollected = '0.000000 WIP';
                        }
                        } catch (e) {
                            console.log(`[SERVICE] Asset ${asset.ipId} - Error: ${e.message}`);
                            asset.totalRoyaltyCollected = '0.000000 WIP';
                            asset.analytics = { totalRoyaltiesPaid: {} };
                        }
                    });
                    
                    // Wait for all assets to complete
                    await Promise.all(assetPromises);
                    console.log(`[SERVICE] ALL_ASSETS_COMPLETE assets=${assetsWithRoyalty.length}`);
                }
            } catch (e) {
                console.error('[SERVICE] Error processing royalty data:', e.message);
            }
        }

        const result = { ...resp, data, __degraded: wasDegraded };
        assetsCacheSet(key, result);
        if (DEBUG_ROYALTY_FLOW) console.log(`[SERVICE] ASSETS_FETCH_COMPLETE owner=${ownerAddress} assets=${data.length} time=${Date.now()-serviceStart}ms`);
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
    
    // Set totalRoyaltyCollected from analytics data
    if (analytics.totalRoyaltiesPaid && Object.keys(analytics.totalRoyaltiesPaid).length > 0) {
        // Format as "X.XXXXXX WIP" for display consistency
        const wipAmount = analytics.totalRoyaltiesPaid.WIP || '0.000000';
        asset.totalRoyaltyCollected = wipAmount;
    } else {
        asset.totalRoyaltyCollected = '0.000000 WIP';
    }
    
    return asset;
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


// Get children assets using Story Protocol edges API
const getChildrenAssets = async (parentIpId, limit = 200, offset = 0) => {
    try {
        const url = `https://api.storyapis.com/api/v4/assets/edges`;
        const buildBody = (where) => ({
            orderBy: "blockNumber",
            orderDirection: "desc",
            pagination: { limit, offset },
            where
        });
        const headers = { 'X-Api-Key': storyApiKey, 'Content-Type': 'application/json' };

        // Try candidates: AS-IS, lowercase, checksum, and parentIpId_in
        const candidates = (() => {
            const arr = [String(parentIpId)];
            const low = String(parentIpId).toLowerCase();
            if (low !== parentIpId) arr.push(low);
            try {
                const { ethers } = require('ethers');
                if (ethers?.utils?.getAddress) arr.push(ethers.utils.getAddress(String(parentIpId)));
            } catch {}
            return Array.from(new Set(arr));
        })();

        let data = null;
        for (const cand of candidates) {
            // 1) parentIpId exact
            let resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(buildBody({ parentIpId: cand })) });
            if (resp.ok) {
                const json = await resp.json();
                const arr = json?.data || json?.edges || [];
                if (Array.isArray(arr) && arr.length > 0) { data = json; break; }
            }
            // 2) parentIpId_in
            resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(buildBody({ parentIpId_in: [cand] })) });
            if (resp.ok) {
                const json2 = await resp.json();
                const arr2 = json2?.data || json2?.edges || [];
                if (Array.isArray(arr2) && arr2.length > 0) { data = json2; break; }
            }
        }
        if (!data) {
            // If still no data, do a final attempt with AS-IS to capture empty state
            const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(buildBody({ parentIpId })) });
            if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
            data = await resp.json();
        }
        
        // Debug logging (can be removed in production)
        console.log('Story Protocol API Response:', {
            dataKeys: Object.keys(data),
            pagination: data?.pagination,
            childrenCount: (data?.data || data?.edges || []).length,
            hasMore: data?.pagination?.hasMore
        });
        
        // Extract children from edges data
        const children = data?.data || data?.edges || [];
        
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
            ipId: edge.childIpId || edge.child_ip_id || edge.child || edge.childIp || edge.childIpID,
            parentIpId: edge.parentIpId || edge.parent_ip_id || edge.parent,
            blockNumber: edge.blockNumber || edge.block_number,
            blockTimestamp: edge.blockTimestamp || edge.block_timestamp,
            txHash: edge.txHash || edge.transactionHash,
            caller: edge.caller,
            licenseTokenId: edge.licenseTokenId || edge.license_token_id,
            licenseTermsId: edge.licenseTermsId || edge.license_terms_id,
            licenseTemplate: edge.licenseTemplate || edge.license_template,
            processedAt: edge.processedAt,
            // Add some default values for display
            name: `Derivative Work #${edge.id}`,
            createdAt: edge.blockTimestamp || edge.block_timestamp,
            royaltyRate: null // Will be fetched separately if needed
        }));

        // Enrich children with real metadata (name, image) using where.ipIds
        try {
            const childIpIds = transformedChildren.map(c => c.ipId).filter(Boolean);
            if (childIpIds.length > 0) {
                const reqBody = {
                    includeLicenses: false,
                    moderated: false,
                    orderBy: "blockNumber",
                    orderDirection: "desc",
                    pagination: { limit: childIpIds.length, offset: 0 },
                    where: { ipIds: childIpIds }
                };
                const detailsResp = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, storyApiKey, reqBody, 'POST');
                const assets = detailsResp?.data || [];
                const byId = new Map(assets.map(a => [a.ipId, a]));
                for (const child of transformedChildren) {
                    const a = byId.get(child.ipId);
                    if (!a) continue;
                    // Set proper name/title
                    child.name = a.title || a.name || child.name;
                    // Copy nftMetadata for image usage
                    if (a.nftMetadata) child.nftMetadata = a.nftMetadata;
                    // Resolve imageUrl
                    if (!child.imageUrl) {
                        let img = a?.nftMetadata?.image?.cachedUrl || a?.nftMetadata?.raw?.metadata?.image || a?.nftMetadata?.image?.originalUrl || a?.uri;
                        if (typeof img === 'string' && img.startsWith('ipfs://')) {
                            img = img.replace('ipfs://', 'https://ipfs.io/ipfs/');
                        }
                        if (img) child.imageUrl = img;
                    }
                }
            }
        } catch {}
        
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

/**
 * getRoyaltyTransactions(ipId)
 * - returns array of royalty transactions using cached data
 * - NO additional API calls - uses data already calculated and cached
 */
const getRoyaltyTransactions = async (ipId) => {
    try {
        console.log(`[SERVICE] Getting royalty transactions for ${ipId} using cached data`);
        
        // Normalize cache keys: try AS-IS, checksum, and lowercase
        const candidates = (() => {
            const arr = [String(ipId)];
            try {
                const { ethers } = require('ethers');
                if (ethers?.utils?.getAddress) arr.push(ethers.utils.getAddress(String(ipId)));
            } catch {}
            arr.push(String(ipId).toLowerCase());
            return Array.from(new Set(arr));
        })();

        for (const key of candidates) {
            const cachedData = getRoyaltyCache(key);
            if (!cachedData) continue;
            touchRoyaltyCache(key);
            console.log(`[SERVICE] Found cached royalty data for ${ipId}:`, cachedData);
            
            // Prefer detailed per-tx cache if available (more accurate ledger)
            if (Array.isArray(cachedData.detailed) && cachedData.detailed.length > 0) {
                const txs = cachedData.detailed.map(d => {
                    const sym = d?.detail?.symbol || 'ETH';
                    const displaySymbol = sym === 'ETH' ? 'IP' : sym;
                    const decimals = d?.detail?.decimals || 18;
                    const amt = d?.detail?.amount || 0n;
                    const formattedAmount = formatTokenAmountWithDecimals(amt, decimals, 6);
                    return {
                        txHash: d.txHash,
                        from: d?.detail?.from || 'N/A',
                        to: 'N/A',
                        value: `${formattedAmount} ${displaySymbol}`,
                        timestamp: d?.detail?.timestamp || null,
                        rawAmount: amt.toString(),
                        currency: displaySymbol
                    };
                }).filter(x => !!x);
                console.log(`[SERVICE] Generated ${txs.length} transactions for ${ipId} from cached detailed data`);
                return txs;
            }

            // Fallback to aggregate-by-token (less detailed)
            const transactions = [];
            if (cachedData.totalRoyaltiesByToken && cachedData.totalRoyaltiesByToken.size > 0) {
                for (const [symbol, data] of cachedData.totalRoyaltiesByToken.entries()) {
                    if (!data || !data.total || data.total === 0n) continue;
                    const formattedAmount = formatTokenAmountWithDecimals(data.total, data.decimals || 18, 6);
                    const displaySymbol = symbol === 'ETH' ? 'IP' : symbol;
                    transactions.push({
                        txHash: `royalty-${ipId}-${symbol}-0`,
                        from: 'N/A',
                        to: 'N/A',
                        value: `${formattedAmount} ${displaySymbol}`,
                        timestamp: new Date().toISOString(),
                        rawAmount: (data.total || 0n).toString(),
                        currency: displaySymbol
                    });
                }
            }
            console.log(`[SERVICE] Generated ${transactions.length} transactions for ${ipId} from cached aggregates`);
            return transactions;
        }
        
        // If no cached data, return empty array (no API calls)
        console.log(`[SERVICE] No cached royalty data found for ${ipId}`);
        return [];
    } catch (e) {
        // Never throw to the controller; return empty list to avoid 500s in modal
        console.error('[SERVICE] getRoyaltyTransactions failed', e.message);
        return [];
    }
};

module.exports = {
    getAssetsByOwner,
    getAssetDetails,
    getRoyaltyTransactions,
    getTopLicensees,
    getPortfolioStats,
    getPortfolioStatsFast, // Export fast mode function
    getAssetCountOnly, // Export count-only function
    getAndAggregateRoyaltyEventsFromApi,
    // keep analytics/leaderboard exports used by controllers/routes
    getAssetLeaderboard,
    getPortfolioLicensees,
    getAssetsStatusSummary,
    // streaming/progress helpers (routes use these)
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
    
    // Children Assets functions
    getChildrenAssets
};