// server/src/services/storyProtocol.service.js
// Clean version with only used functions
const axios = require('axios');
const Decimal = require('decimal.js');

// Configure axios for better performance with connection pooling
const http = require('http');
const https = require('https');

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

axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 5000;

// Utility functions
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

const formatTokenAmountWithDecimals = (amount, decimals, maxDecimals = 6) => {
    try {
        const amountBigInt = BigInt(amount);
        const divisor = BigInt(10 ** decimals);
        const integerPart = amountBigInt / divisor;
        const fractionalPart = amountBigInt % divisor;
        
        if (fractionalPart === 0n) {
            return integerPart.toString();
        }
        
        const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
        const trimmedFractional = fractionalStr.replace(/0+$/, '');
        const displayFractional = trimmedFractional.slice(0, maxDecimals);
        
        return `${integerPart}.${displayFractional}`;
    } catch (e) {
        console.error(`Error formatting token amount: ${amount}`, e);
        return '0';
    }
};

const computeUsdtValue = (amount, decimals, exchangeRateUsd) => {
    try {
        const amountBigInt = BigInt(amount);
        const divisor = BigInt(10 ** decimals);
        const amountDecimal = new Decimal(amountBigInt.toString()).div(divisor.toString());
        const rate = new Decimal(exchangeRateUsd || 0);
        return amountDecimal.mul(rate);
    } catch (e) {
        return new Decimal(0);
    }
};

const formatUsdtCurrency = (usdtValue) => {
    try {
        const value = new Decimal(usdtValue);
        return `$${value.toFixed(2)}`;
    } catch (e) {
        return '$0.00';
    }
};

const normalizeTimestampSec = (timestamp) => {
    try {
        if (typeof timestamp === 'number') {
            if (timestamp > 1e12) return Math.floor(timestamp / 1000);
            return Math.floor(timestamp);
        }
        if (typeof timestamp === 'string') {
            const parsed = parseInt(timestamp, 10);
            if (!isNaN(parsed)) {
                if (parsed > 1e12) return Math.floor(parsed / 1000);
                return Math.floor(parsed);
            }
        }
        return null;
    } catch {
        return null;
    }
};

// API Configuration
const STORY_ASSETS_API_BASE_URL = 'https://api.storyapis.com/api/v4/assets';
const STORY_TRANSACTIONS_API_BASE_URL = 'https://api.storyapis.com/api/v4/transactions';
const STORY_DISPUTES_API_BASE_URL = 'https://api.storyapis.com/api/v4/disputes';
const STORYSCAN_API_BASE_URL = 'https://www.storyscan.io/api/v2';
const STORY_TRANSACTION_DETAIL_BASE_URL = `${STORYSCAN_API_BASE_URL}/transactions`;

const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;
const storyScanApiKeys = [
    process.env.STORYSCAN_API_KEY,
    process.env.STORYSCAN_API_KEY_2,
    process.env.STORYSCAN_API_KEY_3
].filter(Boolean);

let storyScanApiKeyIndex = 0;

const getNextStoryScanApiKey = () => {
    if (storyScanApiKeys.length === 0) return process.env.STORYSCAN_API_KEY;
    const key = storyScanApiKeys[storyScanApiKeyIndex];
    storyScanApiKeyIndex = (storyScanApiKeyIndex + 1) % storyScanApiKeys.length;
    return key;
};

// Cache for transaction details
const txDetailCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getTxDetailCache = (txHash) => {
    const cached = txDetailCache.get(txHash);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
};

const setTxDetailCache = (txHash, data) => {
    txDetailCache.set(txHash, {
        data,
        timestamp: Date.now()
    });
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Rate limiting
const mapWithRpsLimit = async (items, rps, mapper) => {
    const isStoryScan = rps <= 10;
    const batchSize = isStoryScan ? 3 : Math.max(1, Math.min(parseInt(rps, 10) || 10, 3));
    const results = [];
    const delayMs = isStoryScan ? 5 : 500;
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(mapper));
        results.push(...batchResults);
        
        if (i + batchSize < items.length) {
            await sleep(delayMs);
        }
    }
    
    return results;
};

// API fetch functions
const fetchStoryApi = async (url, apiKey, body = {}, method = 'POST') => {
    const keyToUse = apiKey || storyApiKey;
    
    const options = {
        method,
        url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyToUse}`
        },
        data: body
    };

    try {
        const response = await axios(options);
        const respData = response.data || {};
        
        if (url.includes(STORY_ASSETS_API_BASE_URL)) {
            return { data: respData.data || respData, pagination: respData.pagination || {} };
        }
        if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) {
            return { events: respData.events || respData.data || [] };
        }
        return respData;
    } catch (error) {
        const status = error.response?.status;
        if (status === 404 || status === 400 || status === 422) {
            if (url.includes(STORY_ASSETS_API_BASE_URL)) return { data: [], pagination: { total: 0 } };
            if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) return { events: [] };
            if (url.includes(STORY_DISPUTES_API_BASE_URL)) return { data: [] };
        }
        
        if (!status || status >= 500 || error.code === 'ECONNABORTED') {
            console.error(`[SERVICE_ERROR] Failed calling ${url}. Status: ${status || 'N/A'}. Message: ${error.message}`);
            if (url.includes(STORY_ASSETS_API_BASE_URL)) return { data: [], pagination: { total: 0 }, __degraded: true };
            if (url.includes(STORY_TRANSACTIONS_API_BASE_URL)) return { events: [], __degraded: true };
            if (url.includes(STORY_DISPUTES_API_BASE_URL)) return { data: [], __degraded: true };
        }
        
        console.error(`[SERVICE_ERROR] Failed calling ${url}. Status: ${status || 'N/A'}. Message: ${error.message}`);
        throw error;
    }
};

const fetchTransactionDetailFromStoryScan = async (txHash) => {
    const apiKey = getNextStoryScanApiKey();
    
    try {
        const response = await axios.get(`${STORY_TRANSACTION_DETAIL_BASE_URL}/${txHash}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
        });
        
        const data = response.data?.data || response.data || {};
        return {
            amount: BigInt(data.amount || data.value || 0),
            decimals: data.decimals || 18,
            symbol: data.symbol || data.token_symbol || 'ETH',
            tokenAddress: data.token_address || data.contract_address || null,
            exchangeRateUsd: data.exchange_rate_usd || data.usd_value || null,
            from: data.from || data.sender || null,
            timestamp: data.timestamp || data.block_timestamp || null
        };
    } catch (error) {
        console.error(`[STORYSCAN] Error fetching transaction ${txHash}:`, error.message);
        return {
            amount: 0n,
            decimals: 18,
            symbol: 'UNKNOWN',
            tokenAddress: null,
            exchangeRateUsd: null,
            from: null,
            timestamp: null
        };
    }
};

// Main service functions
const getAssetsByOwner = async (ownerAddress, limit = 200, offset = 0) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }

    const requestBody = {
        where: { ownerAddress },
        pagination: { limit, offset },
        orderBy: "createdAt",
        orderDirection: "desc"
    };

    try {
        const response = await fetchStoryApi(STORY_ASSETS_API_BASE_URL, null, requestBody, 'POST');
        return response;
    } catch (error) {
        console.error('[SERVICE] getAssetsByOwner error:', error);
        return { data: [], pagination: { total: 0 } };
    }
};

const getAssetDetails = async (ipId) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }

    try {
        const response = await fetchStoryApi(`${STORY_ASSETS_API_BASE_URL}/${ipId}`, null, {}, 'GET');
        return response;
    } catch (error) {
        console.error('[SERVICE] getAssetDetails error:', error);
        throw error;
    }
};

const fetchRoyaltyEventsPaginated = async (ipId, pageSize = 200) => {
    const allEvents = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const requestBody = {
            where: { eventTypes: ["RoyaltyPaid"], ipIds: [ipId] },
            pagination: { limit: pageSize, offset },
            orderBy: "blockNumber",
            orderDirection: "desc"
        };

        try {
            const response = await fetchStoryApi(STORY_TRANSACTIONS_API_BASE_URL, null, requestBody, 'POST');
            const events = response.events || [];
            allEvents.push(...events);
            
            hasMore = events.length === pageSize;
            offset += pageSize;
        } catch (error) {
            console.error(`[SERVICE] Error fetching royalty events for ${ipId}:`, error);
            break;
        }
    }

    return allEvents;
};

const getRoyaltyTransactionsFast = async (ipId, limit = 20) => {
    try {
        if (!storyApiKey) {
            return [];
        }

        const events = await fetchRoyaltyEventsPaginated(ipId, limit);
        if (!Array.isArray(events) || events.length === 0) {
            return [];
        }

        const txHashes = events
            .map(ev => ev.transactionHash || ev.txHash || ev.hash || ev.transaction?.hash)
            .filter(Boolean);

        if (txHashes.length === 0) {
            return [];
        }

        const storyScanApiKeysLocal = [
            process.env.STORYSCAN_API_KEY,
            process.env.STORYSCAN_API_KEY_2,
            process.env.STORYSCAN_API_KEY_3
        ].filter(Boolean);
        const storyScanRps = parseInt(process.env.STORYSCAN_RPS || '10', 10) * Math.max(1, storyScanApiKeysLocal.length);

        const detailed = await mapWithRpsLimit(txHashes, storyScanRps, async (txHash) => {
            try {
                const cached = getTxDetailCache(txHash);
                if (cached) {
                    return { txHash, detail: cached };
                }
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transaction detail timeout')), 10000)
                );
                
                const detailPromise = fetchTransactionDetailFromStoryScan(txHash);
                const detail = await Promise.race([detailPromise, timeoutPromise]);
                
                setTxDetailCache(txHash, detail);
                return { txHash, detail };
            } catch (error) {
                return { txHash, detail: { amount: 0n, decimals: 18, symbol: 'UNKNOWN', tokenAddress: null, exchangeRateUsd: null, from: null, timestamp: null } };
            }
        });

        const mapped = detailed
            .filter(d => d && d.detail && d.detail.amount && d.detail.amount > 0n)
            .map(d => {
                const amount = d.detail.amount;
                const symbol = d.detail.symbol || 'ETH';
                const decimals = d.detail.decimals || 18;
                const from = d.detail.from || 'N/A';
                const exchangeRateUsd = d.detail.exchangeRateUsd || null;
                const tsSec = normalizeTimestampSec(d.detail.timestamp);
                const timestamp = tsSec ? (new Date(tsSec * 1000)).toISOString() : null;

                return {
                    txHash: d.txHash,
                    from: from,
                    value: `${formatTokenAmountWithDecimals(amount, decimals)} ${symbol}`,
                    timestamp: timestamp,
                    rawAmount: amount.toString(),
                    symbol: symbol,
                    amount: formatTokenAmountWithDecimals(amount, decimals),
                    exchangeRateUsd: exchangeRateUsd
                };
            });

        return mapped;
        
    } catch (e) {
        console.error('[SERVICE] getRoyaltyTransactionsFast failed', e.message);
        return [];
    }
};

const getChildrenAssets = async (ipId, limit = 20, offset = 0) => {
    if (!storyApiKey) {
        throw new Error("STORY_PROTOCOL_API_KEY is not set in environment variables.");
    }

    try {
        const response = await fetchStoryApi(`${STORY_ASSETS_API_BASE_URL}/${ipId}/children`, null, {
            pagination: { limit, offset }
        }, 'GET');
        
        return {
            data: response.data || [],
            pagination: response.pagination || { total: 0, hasMore: false }
        };
    } catch (error) {
        console.error('Error fetching children assets:', error);
        throw error;
    }
};

module.exports = {
    getAssetsByOwner,
    getAssetDetails,
    getRoyaltyTransactionsFast,
    getChildrenAssets,
    formatWeiToEther,
    formatTokenAmountWithDecimals,
    computeUsdtValue,
    formatUsdtCurrency,
    fetchTransactionDetailFromStoryScan
};
