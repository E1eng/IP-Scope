const axios = require('axios');
const https = require('https');
const { formatUnits } = require("viem");

// --- Konfigurasi disederhanakan ---
const STORY_API_BASE_URL = 'https://api.storyapis.com/api/v4';
const STORYSCAN_API_BASE_URL = 'https://www.storyscan.io/api/v2';

const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;
const httpsAgent = new https.Agent({ keepAlive: true });

const storyApi = axios.create({
    baseURL: STORY_API_BASE_URL,
    headers: { 'X-Api-Key': storyApiKey, 'Content-Type': 'application/json' },
    httpsAgent: httpsAgent,
});

const storyScanApi = axios.create({
    baseURL: STORYSCAN_API_BASE_URL,
    headers: { 'accept': 'application/json' },
    httpsAgent: httpsAgent,
});

const MAX_TREE_DEPTH = 10;

// Fungsi normalizeAssetData dan getIpAsset (tetap dibutuhkan)
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
        royaltyPolicy: asset.licenses?.[0]?.licensingConfig,
        createdAt: asset.createdAt,
        childrenCount: asset.childrenCount || 0,
    };
};

const getIpAsset = async (ipId) => {
    const detailsResponse = await storyApi.post('/assets', { where: { ipIds: [ipId.trim()] }, includeLicenses: true });
    const asset = detailsResponse.data.data?.[0];
    if (!asset) throw new Error(`Asset with ID ${ipId.trim()} not found`);
    return normalizeAssetData(asset);
};

// --- Fungsi buildRemixTree yang Asli dan Stabil ---
const buildRemixTree = async (ipId, currentDepth = 0, visited = new Set()) => {
    if (currentDepth >= MAX_TREE_DEPTH || visited.has(ipId)) {
        const leafAsset = await getIpAsset(ipId).catch(() => ({ ipId, title: "Loading failed", mediaType: "ERROR" }));
        return { ...leafAsset, children: [] };
    }
    visited.add(ipId);

    const currentAsset = await getIpAsset(ipId);
    
    let allChildren = [];
    let hasMore = true;
    let offset = 0;
    while (hasMore) {
        const res = await storyApi.post('/assets/edges', { where: { parentIpId: ipId }, pagination: { limit: 200, offset } });
        const edges = res.data.data || [];
        if (edges.length > 0) allChildren.push(...edges);
        hasMore = res.data.pagination?.hasMore || false;
        offset += 200;
    }

    if (allChildren.length > 0) {
        const childrenPromises = allChildren.map(edge => buildRemixTree(edge.childIpId, currentDepth + 1, visited));
        currentAsset.children = await Promise.all(childrenPromises);
    } else {
        currentAsset.children = [];
    }

    return currentAsset;
};


// --- Fungsi getValueFlowData yang Asli ---
// Ini akan menjadi satu-satunya fungsi yang dipanggil untuk membuat grafik.
const getValueFlowData = async (startAssetId) => {
    // 1. Bangun seluruh pohon dengan detail dasar
    const tree = await buildRemixTree(startAssetId);
    if (!tree) throw new Error("Could not build the initial asset tree.");

    // 2. Kumpulkan semua ID unik
    const allIpIds = new Set();
    const traverseAndCollect = (node) => {
        if (!node?.ipId) return;
        allIpIds.add(node.ipId);
        node.children?.forEach(traverseAndCollect);
    };
    traverseAndCollect(tree);

    // 3. Ambil semua data analitik dalam satu batch besar
    const analyticsPromises = Array.from(allIpIds).map(id => getOnChainAnalytics(id));
    const allAnalytics = await Promise.all(analyticsPromises);
    const analyticsMap = new Map(allAnalytics.map((analytics, i) => [Array.from(allIpIds)[i], analytics]));

    // 4. Gabungkan data analitik ke dalam pohon
    const enrichTree = (node) => {
        if (!node?.ipId) return null;
        const analytics = analyticsMap.get(node.ipId);
        const firstToken = Object.keys(analytics.totalRoyaltiesPaid)[0];
        const numericRoyalties = parseFloat(analytics.totalRoyaltiesPaid[firstToken]) || 0;
        
        return {
            ...node,
            analytics: { ...analytics, totalRoyaltiesClaimed: numericRoyalties },
            children: node.children.map(enrichTree).filter(Boolean)
        };
    };

    return enrichTree(tree);
};

const getAssetChildren = async (ipId) => {
    let allEdges = [], hasMore = true, offset = 0;
    while (hasMore) {
        const res = await storyApi.post('/assets/edges', { where: { parentIpId: ipId }, pagination: { limit: 200, offset } });
        const edges = res.data.data || [];
        if (edges.length > 0) allEdges.push(...edges);
        hasMore = res.data.pagination?.hasMore || false;
        offset += 200;
    }

    if (allEdges.length === 0) return [];

    // Ambil detail dasar untuk setiap anak secara bersamaan
    const childrenDetails = await processWithConcurrency(allEdges, edge => getIpAsset(edge.childIpId).catch(() => null));
    return childrenDetails.filter(Boolean); // Hapus anak yang gagal diambil
};

const getAllRoyaltyEvents = async (ipId) => {
    const cacheKey = `royaltyEvents-${ipId}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    let allEvents = [];
    let hasMore = true;
    let offset = 0;
    const limit = 200;

    while (hasMore) {
        const body = {
            where: { ipIds: [ipId], eventTypes: ["RoyaltyPaid"] },
            pagination: { limit, offset }
        };
        const response = await storyApi.post('/transactions', body);
        const fetched = response.data.data || [];
        if (fetched.length > 0) allEvents.push(...fetched);
        hasMore = response.data.pagination?.hasMore || false;
        offset += limit;
    }
    
    cache.set(cacheKey, allEvents);
    return allEvents;
};

const getRoyaltyHistoryAndValue = async (ipId) => {
    const allEvents = await getAllRoyaltyEvents(ipId);
    if (allEvents.length === 0) return { totalValuesByToken: {}, eventCount: 0 };

    const txDetailsResponses = await processWithConcurrency(allEvents, async (event) => {
        const cacheKey = `txDetail-${event.txHash}`;
        const cachedTx = cache.get(cacheKey);
        if (cachedTx) return { data: cachedTx };
        try {
            const res = await storyScanApi.get(`/transactions/${event.txHash}`);
            cache.set(cacheKey, res.data);
            return res;
        } catch (e) { return null; }
    });
    
    const totalsByToken = {};
    txDetailsResponses.forEach(res => {
        if (!res || !res.data) return; 
        const txData = res.data;
        if (txData?.token_transfers?.[0]?.total?.value) {
            const transfer = txData.token_transfers[0];
            const currency = transfer.token.symbol;
            const decimals = parseInt(transfer.token.decimals, 10);
            const value = BigInt(transfer.total.value);

            if (!totalsByToken[currency]) totalsByToken[currency] = { total: BigInt(0), decimals };
            totalsByToken[currency].total += value;
        }
    });

    for (const currency in totalsByToken) {
        const data = totalsByToken[currency];
        totalsByToken[currency] = parseFloat(formatUnits(data.total, data.decimals)).toFixed(4);
    }

    return { totalValuesByToken: totalsByToken, eventCount: allEvents.length };
};

const getDisputeStatus = async (ipId) => {
    const response = await storyApi.post('/transactions', { where: { ipIds: [ipId], eventTypes: ["DisputeRaised", "DisputeResolved", "DisputeCancelled"] }, orderBy: "blockNumber", orderDirection: "desc", pagination: { limit: 1 } });
    return response.data.data?.[0]?.eventType === 'DisputeRaised' ? "Active" : "None";
};

const getOnChainAnalytics = async (ipId) => {
    try {
        const [assetDetails, royaltyData, disputeStatus] = await Promise.all([
            getIpAsset(ipId),
            getRoyaltyHistoryAndValue(ipId),
            getDisputeStatus(ipId),
        ]);

        const royaltyRate = assetDetails.royaltyPolicy?.rate ? (assetDetails.royaltyPolicy.rate / 10000).toFixed(2) : 'N/A';

        return {
            licenseTermsId: assetDetails.royaltyPolicy?.address || `Policy for ${ipId.substring(0, 8)}...`,
            royaltySplit: `${royaltyRate}%`,
            totalRoyaltiesPaid: royaltyData.totalValuesByToken,
            disputeStatus: disputeStatus,
        };
    } catch (error) {
        console.error(`Error fetching combined analytics for ${ipId}:`, error.message);
        return {
            licenseTermsId: "Error", royaltySplit: "Error", totalRoyaltiesPaid: {}, disputeStatus: "Error",
            errorMessage: error.message
        };
    }
};

const fetchDerivativesIdTree = async (ipId, currentDepth, visited) => {
    if (currentDepth >= MAX_TREE_DEPTH || visited.has(ipId)) return { ipId, children: [] };
    visited.add(ipId);
    const node = { ipId, children: [] };
    try {
        let allEdges = [], hasMore = true, offset = 0;
        while (hasMore) {
            const res = await storyApi.post('/assets/edges', { where: { parentIpId: ipId }, pagination: { limit: 10, offset } });
            const edges = res.data.data || [];
            if (edges.length > 0) allEdges.push(...edges);
            hasMore = res.data.pagination?.hasMore || false;
            offset += 200;
        }
        if (allEdges.length > 0) {
            node.children = await processWithConcurrency(allEdges, edge => fetchDerivativesIdTree(edge.childIpId, currentDepth + 1, visited));
        }
    } catch (error) { console.error(`Error fetching derivatives for ${ipId}:`, error.message); }
    return node;
};

const getGraphLayout = async (startAssetId) => {
    const idTree = await fetchDerivativesIdTree(startAssetId, 0, new Set());
    const allIpIds = new Set();
    const traverse = (node) => { allIpIds.add(node.ipId); node.children?.forEach(traverse); };
    traverse(idTree);

    const ipIdArray = Array.from(allIpIds);
    const [assetDetails, disputeStatuses] = await Promise.all([
        processWithConcurrency(ipIdArray, id => getIpAsset(id).catch(() => null)),
        processWithConcurrency(ipIdArray, id => getDisputeStatus(id).catch(() => 'Error'))
    ]);
    
    const detailsMap = new Map(assetDetails.map(a => a ? [a.ipId, a] : null).filter(Boolean));
    const disputeMap = new Map(disputeStatuses.map((s, i) => [ipIdArray[i], s]));

    const buildTree = (node) => {
        const details = detailsMap.get(node.ipId);
        if (!details) return null;
        return {
            ipId: details.ipId,
            title: details.title,
            mediaType: details.mediaType,
            analytics: { disputeStatus: disputeMap.get(node.ipId) },
            children: node.children.map(buildTree).filter(Boolean)
        };
    };
    return buildTree(idTree);
};

const getRoyaltyTransactions = async (ipId) => {
    const allEvents = await getAllRoyaltyEvents(ipId);
    const txDetailsResponses = await processWithConcurrency(allEvents, async (event) => {
        const cacheKey = `txDetail-${event.txHash}`;
        const cachedTx = cache.get(cacheKey);
        if (cachedTx) return { data: cachedTx };
        try {
            const res = await storyScanApi.get(`/transactions/${event.txHash}`);
            cache.set(cacheKey, res.data);
            return res;
        } catch (e) { return null; }
    });
    
    return txDetailsResponses.filter(res => res && res.data).map(res => {
        const txData = res.data;
        const transfer = txData.token_transfers?.[0];
        const value = transfer?.total?.value ? formatUnits(BigInt(transfer.total.value), parseInt(transfer.token.decimals, 10)) : "0";
        return {
            txHash: txData.hash,
            timestamp: txData.timestamp,
            from: txData.from.hash,
            value: `${parseFloat(value).toFixed(4)} ${transfer?.token.symbol || 'N/A'}`,
        };
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

    const sortedLicensees = Array.from(licenseeData.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

    const enrichedLicenseesPromises = sortedLicensees.map(async ([address, data]) => {
        const txDetailsResponses = await processWithConcurrency(data.txHashes, async (hash) => {
            const cacheKey = `txDetail-${hash}`;
            const cachedTx = cache.get(cacheKey);
            if(cachedTx) return { data: cachedTx };
            try {
                const res = await storyScanApi.get(`/transactions/${hash}`);
                cache.set(cacheKey, res.data);
                return res;
            } catch(e) { return null; }
        });

        const totalsByToken = {};
        txDetailsResponses.forEach(res => {
            if (!res?.data?.token_transfers?.[0]?.total?.value) return;
            const transfer = res.data.token_transfers[0];
            const currency = transfer.token.symbol;
            const decimals = parseInt(transfer.token.decimals, 10);
            const value = BigInt(transfer.total.value);
            if (!totalsByToken[currency]) totalsByToken[currency] = { total: BigInt(0), decimals };
            totalsByToken[currency].total += value;
        });
        const displayValues = Object.entries(totalsByToken).map(([currency, tokenData]) => 
            `${parseFloat(formatUnits(tokenData.total, tokenData.decimals)).toFixed(4)} ${currency}`
        ).join(', ');
        return { address, count: data.count, totalValue: displayValues || "N/A" };
    });

    return Promise.all(enrichedLicenseesPromises);
};

module.exports = {
  getGraphLayout,
  getIpAsset, 
  getValueFlowData,
  buildRemixTree,
  getAssetChildren,
  getOnChainAnalytics, 
  getRoyaltyTransactions,
  getTopLicensees,
  getAssetChildren,
};