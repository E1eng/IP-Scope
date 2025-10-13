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
    timeout: 60000,
});

const storyScanApi = axios.create({
    baseURL: STORYSCAN_API_BASE_URL,
    headers: { 'accept': 'application/json' },
    httpsAgent: httpsAgent,
    timeout: 60000,
});

const CONCURRENCY_LIMIT = 10;
const DELAY_BETWEEN_BATCHES = 200;

// --- Helper & Normalisasi ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const processWithConcurrency = async (items, asyncFn) => {
    const results = [];
    for (let i = 0; i < items.length; i += CONCURRENCY_LIMIT) {
        const batch = items.slice(i, i + CONCURRENCY_LIMIT);
        const batchResults = await Promise.all(
            batch.map(item => asyncFn(item).catch(e => {
                console.error(`Error in batch processing for item: ${JSON.stringify(item)}. Error: ${e.message}`);
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
    const firstLicense = asset.licenses && asset.licenses.length > 0 ? asset.licenses[0] : null;
    let mediaType = nftMetadata.mediaType ? nftMetadata.mediaType.toUpperCase() : 'UNKNOWN';
    if (mediaType === 'UNKNOWN' && (nftMetadata.image?.url || nftMetadata.image?.thumbnailUrl)) {
        const mediaUrl = nftMetadata.image.url || nftMetadata.image.thumbnailUrl;
        if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(mediaUrl)) mediaType = 'IMAGE';
        else if (/\.(mp4|webm|mov)$/i.test(mediaUrl)) mediaType = 'VIDEO';
        else if (/\.(mp3|wav|ogg|flac)$/i.test(mediaUrl)) mediaType = 'AUDIO';
    }
    return {
        ipId: asset.ipId,
        title: asset.name || 'Untitled Asset',
        description: asset.description || 'No description.',
        mediaType: mediaType,
        mediaUrl: nftMetadata.image?.url || nftMetadata.image?.thumbnailUrl || null,
        nftMetadata: asset.nftMetadata,
        pilTerms: firstLicense?.pilTerms,
        royaltyPolicy: firstLicense?.licensingConfig,
        createdAt: asset.createdAt,
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
            assets.forEach(asset => { cache.set(`asset-${asset.ipId}`, asset); results.push(asset); });
        } catch (error) { console.error(`Failed to fetch batch assets: ${error.message}`); }
    }
    return results;
};

const getIpAsset = async (ipId) => {
    if (!ipId) return null;
    const assets = await getIpAssetsBatch([ipId]);
    return assets[0] || null;
};

const getAssetsByOwner = async (ownerAddress) => {
    if (!ownerAddress) return [];
    const lowerCaseOwner = ownerAddress.toLowerCase();
    
    console.log(`Fetching 'AssetRegistered' events for owner: ${lowerCaseOwner}`);
    
    let allRegistrationEvents = [], hasMore = true, offset = 0;
    while(hasMore) {
        try {
            const res = await storyApi.post('/transactions', { 
                where: { 
                    initiator: lowerCaseOwner,
                    eventTypes: ["AssetRegistered"] // Kita mencari riwayat pendaftaran aset
                },
                pagination: { limit: 200, offset },
            });
            const events = res.data.data || [];
            if (events.length > 0) allRegistrationEvents.push(...events);
            hasMore = res.data.pagination?.hasMore || false;
            offset += 200;
        } catch(e) { 
            console.error(`Error fetching registration events for owner ${lowerCaseOwner}: ${e.message}`);
            if (e.response?.status === 422) {
                 console.error("API Error 422: The filter 'initiator' or eventType 'AssetRegistered' might be unsupported on the /transactions endpoint.");
            }
            hasMore = false;
            return [];
        }
    }

    if (allRegistrationEvents.length === 0) {
        console.log(`No 'AssetRegistered' events found for owner: ${lowerCaseOwner}`);
        return [];
    }

    // Ekstrak IP ID unik dari semua transaksi pendaftaran
    const ipIds = [...new Set(allRegistrationEvents.map(event => event.ipId).filter(Boolean))];
    
    console.log(`Found ${ipIds.length} unique IP IDs. Fetching asset details...`);

    // Gunakan fungsi batch yang sudah ada untuk mengambil detail dari semua ID yang ditemukan
    return getIpAssetsBatch(ipIds);
};

const getAllRoyaltyEvents = async (ipId) => {
    if (!ipId) return [];
    const lowerCaseIpId = ipId.toLowerCase();
    let allEvents = [], hasMore = true, offset = 0;
    while(hasMore) {
        try {
            const res = await storyApi.post('/transactions', { where: { ipIds: [lowerCaseIpId], eventTypes: ["RoyaltyPaid"]}, pagination: { limit: 200, offset }});
            const events = res.data.data || [];
            if (events.length > 0) allEvents.push(...events);
            hasMore = res.data.pagination?.hasMore || false;
            offset += 200;
        } catch(e){ hasMore = false; }
    }
    return allEvents;
};

const getRoyaltyHistoryAndValue = async (ipId) => {
    const allEvents = await getAllRoyaltyEvents(ipId);
    if (allEvents.length === 0) return { totalValuesByToken: {}, eventCount: 0 };
    const txDetails = await processWithConcurrency(allEvents, async (event) => {
        try { return (await storyScanApi.get(`/transactions/${event.txHash}`)).data; } catch (e) { return null; }
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
    const res = await storyApi.post('/transactions', { where: { ipIds: [ipId.toLowerCase()], eventTypes: ["DisputeRaised", "DisputeResolved", "DisputeCancelled"]}, orderBy: "blockNumber", orderDirection: "desc", pagination: { limit: 1 }});
    return res.data.data?.[0]?.eventType === 'DisputeRaised' ? "Active" : "None";
};

const getOnChainAnalytics = async (ipId) => {
    if (!ipId) return { errorMessage: "Invalid IP ID provided." };
    try {
        const [asset, royalty, dispute] = await Promise.all([ getIpAsset(ipId), getRoyaltyHistoryAndValue(ipId), getDisputeStatus(ipId) ]);
        if (!asset) return { errorMessage: "Asset not found." };
        const rate = asset.royaltyPolicy?.rate ? (asset.royaltyPolicy.rate / 10000).toFixed(2) : 'N/A';
        return { royaltySplit: `${rate}%`, totalRoyaltiesPaid: royalty.totalValuesByToken, disputeStatus: dispute };
    } catch (e) { return { errorMessage: e.message }; }
};

const getAssetDetailsForModal = async (ipId) => {
    if (!ipId) return null;
    const [assetDetails, onChainAnalytics] = await Promise.all([ getIpAsset(ipId), getOnChainAnalytics(ipId) ]);
    if (!assetDetails) return null;
    return { ...assetDetails, analytics: onChainAnalytics };
};

const getRoyaltyTransactions = async (ipId) => {
    const allEvents = await getAllRoyaltyEvents(ipId);
    if (allEvents.length === 0) return [];
    return processWithConcurrency(allEvents, async (event) => {
        try {
            const res = await storyScanApi.get(`/transactions/${event.txHash}`);
            const tx = res.data;
            const transfer = tx.token_transfers?.[0];
            const value = transfer?.total?.value ? formatUnits(BigInt(transfer.total.value), parseInt(transfer.token.decimals, 10)) : "0";
            return {
                txHash: tx.hash,
                timestamp: tx.timestamp,
                from: tx.from.hash,
                value: `${parseFloat(value).toFixed(4)} ${transfer?.token.symbol || 'N/A'}`,
            };
        } catch (e) { return null; }
    });
};

const getTopLicensees = async (ipId) => {
    const allEvents = await getAllRoyaltyEvents(ipId);
    if (allEvents.length === 0) return [];
    const licenseeData = new Map();
    allEvents.forEach(event => {
        const data = licenseeData.get(event.initiator) || { count: 0, txHashes: [] };
        data.count++;
        data.txHashes.push(event.txHash);
        licenseeData.set(event.initiator, data);
    });
    const sortedLicensees = Array.from(licenseeData.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    return processWithConcurrency(sortedLicensees, async ([address, data]) => {
        const txDetails = await processWithConcurrency(data.txHashes, async (hash) => {
            try { return (await storyScanApi.get(`/transactions/${hash}`)).data; }
            catch (e) { return null; }
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
        const displayValues = Object.entries(totals).map(([c, d]) => `${parseFloat(formatUnits(d.total, d.decimals)).toFixed(4)} ${c}`).join(', ');
        return { address, count: data.count, totalValue: displayValues || "N/A" };
    });
};

module.exports = {
    getAssetsByOwner,
    getIpAsset,
    getOnChainAnalytics,
    getAssetDetailsForModal,
    getRoyaltyTransactions,
    getTopLicensees,
};