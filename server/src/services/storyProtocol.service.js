const axios = require('axios');
const https = require('https');
const { formatUnits } = require("viem");
const cache = require('../utils/cache');

// --- Konfigurasi ---
const STORY_API_BASE_URL = 'https://api.storyapis.com/api/v4';
const STORYSCAN_API_BASE_URL = 'https://www.storyscan.io/api/v2';
const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;
const httpsAgent = new https.Agent({ keepAlive: true });

const storyApi = axios.create({
    baseURL: STORY_API_BASE_URL,
    headers: { 'X-Api-Key': storyApiKey, 'Content-Type': 'application/json' },
    httpsAgent: httpsAgent,
    timeout: 3000, // Timeout lebih panjang untuk permintaan berat
});

const storyScanApi = axios.create({
    baseURL: STORYSCAN_API_BASE_URL,
    headers: { 'accept': 'application/json' },
    httpsAgent: httpsAgent,
    timeout: 3000,
});

const CONCURRENCY_LIMIT = 500;
const DELAY_BETWEEN_BATCHES = 100;

// --- Helper & Normalisasi ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const processWithConcurrency = async (items, asyncFn) => {
    const results = [];
    for (let i = 0; i < items.length; i += CONCURRENCY_LIMIT) {
        const batch = items.slice(i, i + CONCURRENCY_LIMIT);
        const batchResults = await Promise.all(
            batch.map(item => asyncFn(item).catch(e => {
                console.error(`Error in batch processing for item: ${item}. Error: ${e.message}`);
                return null;
            }))
        );
        results.push(...batchResults.filter(Boolean));
        if (i + CONCURRENCY_LIMIT < items.length) await delay(DELAY_BETWEEN_BATCHES);
    }
    return results;
};

const normalizeAssetData = (asset) => {
    if (!asset) return null;
    const nftMetadata = asset.nftMetadata || {};
    const mediaUrl = nftMetadata.image?.url || nftMetadata.image?.thumbnailUrl || null;
    let mediaType = nftMetadata.mediaType ? nftMetadata.mediaType.toUpperCase() : 'UNKNOWN';
    if (mediaType === 'UNKNOWN' && mediaUrl) {
        if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(mediaUrl)) mediaType = 'IMAGE';
        else if (/\.(mp4|webm|mov)$/i.test(mediaUrl)) mediaType = 'VIDEO';
        else if (/\.(mp3|wav|ogg|flac)$/i.test(mediaUrl)) mediaType = 'AUDIO';
    }
    return {
        ipId: asset.ipId,
        title: asset.name || 'Untitled Asset',
        description: asset.description || 'No description.',
        mediaType: mediaType,
        mediaUrl: mediaUrl,
        nftMetadata: nftMetadata,
        pilTerms: asset.licenses?.[0]?.pilTerms,
        royaltyPolicy: asset.licenses?.[0]?.licensingConfig,
        createdAt: asset.createdAt,
        childrenCount: asset.childrenCount || 0,
    };
};

const getIpAssetsBatch = async (ipIds) => {
    const validIpIds = (ipIds || []).filter(id => id && typeof id === 'string' && id.trim() !== '').map(id => id.toLowerCase());
    if (validIpIds.length === 0) return [];
    
    const results = [], idsToFetch = [];
    for (const id of validIpIds) {
        const cached = cache.get(`asset-${id}`);
        if (cached) results.push(cached);
        else idsToFetch.push(id);
    }

    if (idsToFetch.length > 0) {
        try {
            const response = await storyApi.post('/assets', { where: { ipIds: idsToFetch }, includeLicenses: true });
            const assets = (response.data.data || []).map(normalizeAssetData).filter(Boolean);
            assets.forEach(asset => {
                cache.set(`asset-${asset.ipId}`, asset);
                results.push(asset);
            });
        } catch (error) {
            console.error(`Failed to fetch batch assets. Status: ${error.response?.status}. IDs:`, idsToFetch);
        }
    }
    return results;
};


const getIpAsset = async (ipId) => {
    if (!ipId) return null;
    const assets = await getIpAssetsBatch([ipId.toLowerCase()]);
    return assets[0] || null;
};
// --- Fungsi Analitik ---
const getAllRoyaltyEvents = async (ipId) => {
    if (!ipId) return [];
    const cacheKey = `royaltyEvents-${ipId}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;
    let allEvents = [], hasMore = true, offset = 0;
    while(hasMore) {
        const res = await storyApi.post('/transactions', { where: { ipIds: [ipId], eventTypes: ["RoyaltyPaid"]}, pagination: { limit: 50, offset }});
        const events = res.data.data || [];
        if (events.length > 0) allEvents.push(...events);
        hasMore = res.data.pagination?.hasMore || false;
        offset += 50;
    }
    cache.set(cacheKey, allEvents);
    return allEvents;
};

const getRoyaltyHistoryAndValue = async (ipId) => {
    const allEvents = await getAllRoyaltyEvents(ipId);
    if (allEvents.length === 0) return { totalValuesByToken: {}, eventCount: 0 };

    const txDetails = await processWithConcurrency(allEvents, async (event) => {
        try {
            const cacheKey = `txDetail-${event.txHash}`;
            const cached = cache.get(cacheKey);
            if(cached) return cached;
            const res = await storyScanApi.get(`/transactions/${event.txHash}`);
            cache.set(cacheKey, res.data);
            return res.data;
        } catch (e) { return null; }
    });

    const totals = {};
    txDetails.forEach(tx => {
        const transfer = tx?.token_transfers?.[0];
        if (transfer?.total?.value) {
            const { symbol, decimals } = transfer.token;
            if (!totals[symbol]) totals[symbol] = { total: BigInt(0), decimals: parseInt(decimals, 10) };
            totals[symbol].total += BigInt(transfer.total.value);
        }
    });

    for (const key in totals) {
        totals[key] = parseFloat(formatUnits(totals[key].total, totals[key].decimals)).toFixed(4);
    }
    return { totalValuesByToken: totals, eventCount: allEvents.length };
};

const getDisputeStatus = async (ipId) => {
    if (!ipId) return "N/A";
    const res = await storyApi.post('/transactions', { where: { ipIds: [ipId], eventTypes: ["DisputeRaised", "DisputeResolved", "DisputeCancelled"]}, orderBy: "blockNumber", orderDirection: "desc", pagination: { limit: 1 }});
    return res.data.data?.[0]?.eventType === 'DisputeRaised' ? "Active" : "None";
};

const getOnChainAnalytics = async (ipId) => {
    if (!ipId) return { errorMessage: "Invalid IP ID provided." };
    const lowerCaseIpId = ipId.toLowerCase();
    try {
        const [asset, royalty, dispute] = await Promise.all([
            getIpAsset(lowerCaseIpId),
            // Asumsikan fungsi-fungsi ini juga aman dengan lowercase ID
            getRoyaltyHistoryAndValue(lowerCaseIpId),
            getDisputeStatus(lowerCaseIpId),
        ]);
        if (!asset) return { errorMessage: "Asset not found." };
        const rate = asset.royaltyPolicy?.rate ? (asset.royaltyPolicy.rate / 10000).toFixed(2) : 'N/A';
        return {
            royaltySplit: `${rate}%`,
            totalRoyaltiesPaid: royalty.totalValuesByToken,
            disputeStatus: dispute,
        };
    } catch (e) {
        return { errorMessage: e.message };
    }
};

const getValueFlowData = async (startAssetId) => {
    const lowerCaseStartId = startAssetId.toLowerCase();
    console.log(`Fetching root asset and list of child IDs for ${lowerCaseStartId}...`);
    
    const rootAsset = await getIpAsset(lowerCaseStartId);
    if (!rootAsset) throw new Error("Root asset not found.");

    let childEdges = [], hasMore = true, offset = 0;
    while(hasMore) {
        try {
            const res = await storyApi.post('/assets/edges', { 
                where: { parentIpId: lowerCaseStartId }, 
                pagination: { limit: 200, offset } // 1. Mengurangi limit paginasi
            });
            const edges = res.data.data || [];
            if (edges.length > 0) childEdges.push(...edges);
            hasMore = res.data.pagination?.hasMore || false;
            offset += 200;
        } catch (error) {
            // 2. Logging lebih detail jika terjadi error
            console.error(`Error fetching edges for ${lowerCaseStartId} at offset ${offset}. Status: ${error.response?.status}`);
            if (error.response?.data) {
                console.error("API Error Body:", JSON.stringify(error.response.data, null, 2));
            }
            hasMore = false; // Hentikan loop jika terjadi error
        }
    }
    
    const childIds = childEdges.map(e => e.childIpId).filter(Boolean);

    console.log(`Found ${childIds.length} children. Sending list to frontend.`);
    
    return {
        rootNode: rootAsset,
        childIpIds: childIds
    };
};

module.exports = {
    getValueFlowData,
    getIpAssetsBatch,
    getIpAsset,
    getOnChainAnalytics,
};