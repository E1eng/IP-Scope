// server/src/services/storyProtocol.service.js
// CommonJS style (require/module.exports)
// Dependency: axios
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
const STORYSCAN_RPS = parseInt(process.env.STORYSCAN_RPS || '10', 10);

// --- Simple in-memory cache to speed up repeated heavy aggregations ---
const CACHE_TTL_MS = parseInt(process.env.AGGREGATION_CACHE_TTL_MS || '300000', 10); // default 5 minutes
const TX_DETAIL_TTL_MS = parseInt(process.env.TX_DETAIL_TTL_MS || '86400000', 10); // default 24 hours
const TOKEN_PRICE_TTL_MS = parseInt(process.env.TOKEN_PRICE_TTL_MS || '1800000', 10); // default 30 minutes
const nowMs = () => Date.now();
const withTtl = (value) => ({ value, expiresAt: nowMs() + CACHE_TTL_MS });
const isFresh = (entry) => entry && entry.expiresAt && entry.expiresAt > nowMs();

const cache = {
    portfolioStatsByOwner: new Map(), // key: owner
    assetLeaderboardByOwner: new Map(), // key: owner
    licenseeLeaderboardByOwner: new Map(), // key: owner
    timeseriesByOwnerKey: new Map(), // key: `${owner}:${bucket}:${days}`
    txDetailByHash: new Map(), // key: txHash -> { value, expiresAt }
    tokenPriceBySymbol: new Map(), // key: symbol -> { value: Decimal, expiresAt }
};
// --- Global StoryScan rate limiter (token bucket, shared across all calls) ---
let scanTokens = STORYSCAN_RPS;
let scanLastRefill = Date.now();
const refillIntervalMs = 1000;
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
        await sleep(50);
    }
};
const limitedStoryScanGet = async (url, options = {}, retries = 3) => {
    await acquireScanToken();
    try {
        return await axios.get(url, options);
    } catch (e) {
        const status = e.response?.status;
        // On 429, backoff with jitter and retry
        if (status === 429 && retries > 0) {
            const backoffMs = 700 * (4 - retries) + Math.floor(Math.random() * 200);
            await sleep(backoffMs);
            return limitedStoryScanGet(url, options, retries - 1);
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
            const MAX_ASSET_LIMIT = 200;
            const assetResp = await getAssetsByOwner(ownerAddress, MAX_ASSET_LIMIT, 0);
            const allAssets = assetResp.data || [];
            const totalAssets = assetResp.pagination?.total || allAssets.length;
            updateProgress(ownerAddress, { totalAssets });

            const totalsByToken = new Map(); // symbol => { totalRaw: BigInt, decimals, usdt: Decimal }
            const BATCH_SIZE = 5;
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
        timeout: 20000,
    };

    const fetchWithRetry = async (opts, retries = 2, backoffMs = 600) => {
        let attempt = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                return await axios(opts);
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
            if (url.includes(STORY_ASSETS_API_BASE_URL)) return { data: [], pagination: { total: 0 } };
            if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) return { events: [] };
            if (typeof STORY_DISPUTES_API_BASE_URL !== 'undefined' && url.includes(STORY_DISPUTES_API_BASE_URL)) return { data: [] };
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
    const batchSize = Math.max(1, parseInt(rps, 10) || 10);
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        // eslint-disable-next-line no-await-in-loop
        const batchResults = await Promise.all(batch.map(mapper));
        results.push(...batchResults);
        if (i + batchSize < items.length) {
            // eslint-disable-next-line no-await-in-loop
            await sleep(1000);
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

    // Enrich disputes status and mediaType via IPFS
    const data = resp.data || [];
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
        }
    } catch (e) {
        // ignore disputes enrich failure
    }

    return { ...resp, data };
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

    // Use rate-limited mapper to respect StoryScan 10 rps
    const txHashes = events.map(ev => ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash).filter(Boolean);
    const detailed = await mapWithRpsLimit(txHashes, 10, async (txHash) => {
        const cached = getTxDetailCache(txHash);
        if (cached) return { txHash, detail: cached };
        const detail = await fetchTransactionDetailFromStoryScan(txHash);
        setTxDetailCache(txHash, detail);
        return { txHash, detail };
    });
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
    const BATCH_SIZE = 5;
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

        const detailed = await mapWithRpsLimit(txHashes, 10, async (txHash) => {
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

    const cacheKey = `${ownerAddress}:${finalBucket}:${lookbackDays}`;
    const cached = cache.timeseriesByOwnerKey.get(cacheKey);
    if (isFresh(cached)) return cached.value;

    const assetsResp = await getAssetsByOwner(ownerAddress, 200, 0);
    const assets = assetsResp.data || [];
    if (assets.length === 0) return { bucket: finalBucket, points: [] };

    const toBucketKey = (date) => {
        const d = new Date(date);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        if (finalBucket === 'daily') return `${y}-${m}-${day}`;
        if (finalBucket === 'monthly') return `${y}-${m}`;
        const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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
            const usdt = computeUsdtValue(tx.amount, tx.decimals || 18, tx.exchangeRateUsd || 0);
            if (usdt.lte(0)) continue;
            const key = toBucketKey(tsMs);
            const existing = bucketMap.get(key) || new Decimal(0);
            bucketMap.set(key, existing.add(usdt));
        }
    }

    const points = Array.from(bucketMap.entries())
        .map(([key, dec]) => ({ key, date: key, totalUsdt: Number(dec.toFixed(2)) }))
        .sort((a, b) => a.key.localeCompare(b.key));
    const result = { bucket: finalBucket, points };
    cache.timeseriesByOwnerKey.set(cacheKey, withTtl(result));
    return result;
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


module.exports = {
    getAssetsByOwner,
    getAssetDetails,
    getRoyaltyTransactions,
    getTopLicensees,
    fetchTransactionDetailFromStoryScan,
    getPortfolioStats,
    getAndAggregateRoyaltyEventsFromApi,
    formatWeiToEther,
    // internal helpers for other modules (optional export)
    formatTokenAmountWithDecimals,
    computeUsdtValue,
    formatUsdtCurrency,
    fetchRoyaltyTxDetailsForAsset,
    getPortfolioTimeSeries,
    getAssetLeaderboard,
    getPortfolioLicensees,
    getAssetsStatusSummary,
    // streaming/progress helpers
    startPortfolioAggregation,
    getProgress,
    // expose rate-limited StoryScan GET for other modules (routes)
    limitedStoryScanGet
};
