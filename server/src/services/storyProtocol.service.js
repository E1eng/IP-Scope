const axios = require('axios');
const { client, account } = require('../utils/storyClient');
const { formatUnits } = require("viem");

const STORY_API_BASE_URL = 'https://api.storyapis.com/api/v4';
const STORYSCAN_API_BASE_URL = 'https://www.storyscan.io/api/v2';
const TRANSACTIONS_URL = `${STORY_API_BASE_URL}/transactions`;
const ASSETS_DETAIL_URL = `${STORY_API_BASE_URL}/assets`;
const SEARCH_URL = `${STORY_API_BASE_URL}/search`;
const ASSETS_EDGES_URL = `${STORY_API_BASE_URL}/assets/edges`; 

const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;
const storyApiHeaders = { 'X-Api-Key': storyApiKey, 'Content-Type': 'application/json' };
const MAX_TREE_DEPTH = 10;

const storyScanApi = axios.create({
    baseURL: STORYSCAN_API_BASE_URL,
    headers: { 'accept': 'application/json' }
});


const checkApiKey = () => {
    if (!storyApiKey || storyApiKey === 'YOUR_STORY_PROTOCOL_API_KEY_HERE') {
        throw new Error("API Key Missing: Please ensure STORY_PROTOCOL_API_KEY is correctly set in your server/.env file.");
    }
};

const normalizeAssetData = (asset) => {
    if (!asset) return null;
    const nftMetadata = asset.nftMetadata || {};
    const rawMetadata = nftMetadata.raw?.metadata || {};
    const firstLicense = asset.licenses && asset.licenses.length > 0 ? asset.licenses[0] : null;
    return {
        ...asset,
        ipId: asset.ipId || 'N/A',
        title: asset.name || rawMetadata.name || 'Untitled Asset',
        description: asset.description || rawMetadata.description || 'No description available.',
        mediaType: nftMetadata.mediaType ? nftMetadata.mediaType.toUpperCase() : 'UNKNOWN',
        mediaUrl: nftMetadata.image?.url || nftMetadata.image?.thumbnailUrl || null, 
        parentsCount: asset.parentsCount !== undefined ? asset.parentsCount : (asset.parents?.length || 0),
        pilTerms: firstLicense ? firstLicense.terms : null, 
        royaltyPolicy: firstLicense ? firstLicense.licensingConfig : null,
        createdAt: asset.createdAt || null, 
        score: asset.score || 0,
        similarity: asset.similarity || 0,
    };
};

const getIpAsset = async (ipId) => {
    checkApiKey();
    const idToFetch = ipId.trim();
    try {
        const detailsBody = { 
            where: { ipIds: [idToFetch] },
            includeLicenses: true
        };
        const detailsResponse = await axios.post(ASSETS_DETAIL_URL, detailsBody, { headers: storyApiHeaders });
        const asset = detailsResponse.data.data?.[0];
        if (!asset) {
            throw new Error(`Asset with ID ${idToFetch} not found`);
        }
        return normalizeAssetData(asset);
    } catch (error) {
        const errorMessage = error.response ? `Status: ${error.response.status} - Data: ${JSON.stringify(error.response.data)}` : error.message;
        console.error(`AXIOS ERROR (getIpAsset): ${errorMessage}`);
        throw new Error(`Failed to fetch asset detail for ID ${idToFetch}: ${errorMessage}`);
    }
}

// --- FUNGSI INI SEPENUHNYA DIPERBARUI DENGAN AGREGASI PER TOKEN ---
const getRoyaltyHistoryAndValue = async (ipId) => {
    checkApiKey();
    try {
        let allTransactions = [];
        let hasMore = true;
        let offset = 0;
        const limit = 200;

        while (hasMore) {
            const body = {
                where: { ipIds: [ipId], eventTypes: ["RoyaltyPaid"] },
                pagination: { limit, offset }
            };
            const response = await axios.post(TRANSACTIONS_URL, body, { headers: storyApiHeaders });
            const fetched = response.data.data || [];
            if (fetched.length > 0) allTransactions.push(...fetched);
            hasMore = response.data.pagination?.hasMore || false;
            offset += limit;
        }

        if (allTransactions.length === 0) {
            return { totalValuesByToken: [], eventCount: 0 };
        }

        const txDetailPromises = allTransactions.map(tx => 
            storyScanApi.get(`/transactions/${tx.txHash}`).catch(() => null)
        );
        const txDetailsResponses = await Promise.all(txDetailPromises);

        // --- Logika Agregasi per Token ---
        const totalsByToken = new Map();
        
        txDetailsResponses.forEach(res => {
            if (!res || !res.data) return; 
            
            const txData = res.data;
            if (txData && txData.token_transfers && txData.token_transfers.length > 0) {
                const royaltyTransfer = txData.token_transfers[0];
                if (royaltyTransfer && royaltyTransfer.total && royaltyTransfer.total.value) {
                    const currency = royaltyTransfer.token.symbol;
                    const decimals = parseInt(royaltyTransfer.token.decimals, 10);
                    const value = BigInt(royaltyTransfer.total.value);

                    const currentTotal = totalsByToken.get(currency) || { total: BigInt(0), decimals };
                    currentTotal.total += value;
                    totalsByToken.set(currency, currentTotal);
                }
            }
        });

        // Format hasil akhir menjadi array yang mudah dibaca frontend
        const totalValuesByToken = Array.from(totalsByToken.entries()).map(([currency, data]) => ({
            currency,
            totalValue: parseFloat(formatUnits(data.total, data.decimals)).toFixed(4),
        }));

        return {
            totalValuesByToken,
            eventCount: allTransactions.length,
        };

    } catch (error) {
        const errorMessage = error.response ? `Status: ${error.response.status}` : error.message;
        console.error(`AXIOS ERROR (getRoyaltyHistoryAndValue): ${errorMessage}`);
        throw new Error(`Failed to fetch royalty history for ID ${ipId}: ${errorMessage}`);
    }
};

const getRoyaltyTransactions = async (ipId) => {
    let allTransactions = [];
    let hasMore = true;
    let offset = 0;
    const limit = 200;

    while (hasMore) {
        const body = {
            where: { ipIds: [ipId], eventTypes: ["RoyaltyPaid"] },
            pagination: { limit, offset }
        };
        const response = await axios.post(TRANSACTIONS_URL, body, { headers: storyApiHeaders });
        const fetched = response.data.data || [];
        if (fetched.length > 0) allTransactions.push(...fetched);
        hasMore = response.data.pagination?.hasMore || false;
        offset += limit;
    }

    const txDetailPromises = allTransactions.map(tx => 
        storyScanApi.get(`/transactions/${tx.txHash}`).catch(() => null)
    );
    const txDetailsResponses = await Promise.all(txDetailPromises);

    return txDetailsResponses
        .filter(res => res && res.data)
        .map(res => {
            const txData = res.data;
            const royaltyTransfer = txData.token_transfers?.[0];
            const value = royaltyTransfer?.total?.value ? formatUnits(BigInt(royaltyTransfer.total.value), parseInt(royaltyTransfer.token.decimals, 10)) : "0";
            
            return {
                txHash: txData.hash,
                timestamp: txData.timestamp,
                from: txData.from.hash,
                value: `${parseFloat(value).toFixed(4)} ${royaltyTransfer?.token.symbol || 'N/A'}`,
            };
        });
};
const getTopLicensees = async (ipId) => {
    // Langkah 1: Dapatkan semua event dari API Story Protocol yang andal
    let allEvents = [];
    let hasMore = true;
    let offset = 0;
    const limit = 200;

    while (hasMore) {
        const body = {
            where: { ipIds: [ipId], eventTypes: ["RoyaltyPaid"] },
            pagination: { limit, offset }
        };
        const response = await axios.post(TRANSACTIONS_URL, body, { headers: storyApiHeaders });
        const fetched = response.data.data || [];
        if (fetched.length > 0) allEvents.push(...fetched);
        hasMore = response.data.pagination?.hasMore || false;
        offset += limit;
    }
    
    if (allEvents.length === 0) {
        return [];
    }

    // Langkah 2: Agregasi data yang andal (initiator/from address dan txHashes)
    const licenseeData = new Map();
    allEvents.forEach(event => {
        const data = licenseeData.get(event.initiator) || { count: 0, txHashes: [] };
        data.count++;
        data.txHashes.push(event.txHash);
        licenseeData.set(event.initiator, data);
    });

    // Langkah 3: Urutkan berdasarkan 'count' untuk mendapatkan 5 teratas yang stabil
    const sortedLicensees = Array.from(licenseeData.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

    // Langkah 4: Lakukan 'enrichment' (panggil StoryScan) HANYA untuk 5 teratas
    const enrichedLicenseesPromises = sortedLicensees.map(async ([address, data]) => {
        const txDetailPromises = data.txHashes.map(hash => 
            storyScanApi.get(`/transactions/${hash}`).catch(() => null)
        );
        const txDetailsResponses = await Promise.all(txDetailPromises);

        const totalsByToken = {};
        txDetailsResponses.forEach(res => {
            if (!res || !res.data) return;
            const txData = res.data;
            if (txData && txData.token_transfers && txData.token_transfers.length > 0) {
                const royaltyTransfer = txData.token_transfers[0];
                if (royaltyTransfer && royaltyTransfer.total && royaltyTransfer.total.value) {
                    const currency = royaltyTransfer.token.symbol;
                    const decimals = parseInt(royaltyTransfer.token.decimals, 10);
                    const value = BigInt(royaltyTransfer.total.value);

                    if (!totalsByToken[currency]) {
                        totalsByToken[currency] = { total: BigInt(0), decimals };
                    }
                    totalsByToken[currency].total += value;
                }
            }
        });
        
        // Format nilai total menjadi string
        const displayValues = Object.entries(totalsByToken).map(([currency, tokenData]) => 
            `${parseFloat(formatUnits(tokenData.total, tokenData.decimals)).toFixed(4)} ${currency}`
        ).join(', ');

        return {
            address,
            count: data.count,
            totalValue: displayValues || "N/A",
        };
    });

    return Promise.all(enrichedLicenseesPromises);
};
const getDisputeStatus = async (ipId) => {
    const body = {
        where: { 
            ipIds: [ipId],
            eventTypes: ["DisputeRaised", "DisputeResolved", "DisputeCancelled"]
        },
        orderBy: "blockNumber",
        orderDirection: "desc", // Ambil yang terbaru dulu
        pagination: { limit: 1 }
    };
    const response = await axios.post(TRANSACTIONS_URL, body, { headers: storyApiHeaders });
    const lastEvent = response.data.data?.[0];

    if (lastEvent?.eventType === 'DisputeRaised') {
        return "Active";
    }
    return "None";
};

const searchIpAssets = async (query, mediaType, sortBy = 'default', limit = 20, offset = 0) => {
    checkApiKey();
  
    let searchResponse;

    try {
      const searchBody = {
        query: query,
        pagination: {
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10)
        }
      };
  
      if (mediaType && mediaType !== 'all') {
        searchBody.mediaType = mediaType;
      }

      if (sortBy && sortBy !== 'default') {
          const [field, direction] = sortBy.split('_');
          searchBody.orderBy = field;
          searchBody.orderDirection = direction;
      }
  
      searchResponse = await axios.post(SEARCH_URL, searchBody, { headers: storyApiHeaders });
      const searchResults = searchResponse.data.data || [];

      if (searchResults.length === 0) {
        return { data: [], pagination: searchResponse.data.pagination };
      }
      
      const ipIdsToFetch = searchResults.map(asset => asset.ipId);
      const detailsBody = { 
          where: { ipIds: ipIdsToFetch },
          includeLicenses: true
      };
      const detailsResponse = await axios.post(ASSETS_DETAIL_URL, detailsBody, { headers: storyApiHeaders });

      const detailedAssets = detailsResponse.data.data || [];
      const detailsMap = new Map(detailedAssets.map(asset => [asset.ipId, asset]));
      
      const enrichedAssets = searchResults.map(asset => {
        const details = detailsMap.get(asset.ipId);
        return normalizeAssetData({ ...asset, ...details });
      });
      
      const finalPagination = {
          ...searchResponse.data.pagination,
          total: searchResponse.data.total || 0
      };

      return { 
          data: enrichedAssets, 
          pagination: finalPagination 
      };

    } catch (error) {
        const errorMessage = error.response ? `Status: ${error.response.status} - Data: ${JSON.stringify(error.response.data)}` : error.message;
        console.error(`AXIOS ERROR (Search): ${errorMessage}`);
        throw new Error(`Search API Failed: ${errorMessage}`);
    }
};
const fetchDerivativesRecursively = async (ipId, currentDepth) => {
    const currentAsset = await getIpAsset(ipId).catch(e => ({ 
        ipId, 
        title: `Error fetching details: ${e.message.substring(0, 50)}...`, 
        mediaType: 'ERROR', 
        children: [] 
    }));
    currentAsset.children = [];
    if (currentDepth >= MAX_TREE_DEPTH) {
        currentAsset.title += ' (Depth Limit Reached)';
        return currentAsset;
    }
    const MAX_DERIVATIVES = 10; 
    const edgesBody = {
        where: { parentIpId: ipId }, 
        pagination: { limit: MAX_DERIVATIVES, offset: 0 }
    };
    try {
        const edgesResponse = await axios.post(ASSETS_EDGES_URL, edgesBody, { headers: storyApiHeaders });
        const derivativeEdges = edgesResponse.data.data || [];
        if (derivativeEdges.length > 0) {
            currentAsset.children = await Promise.all(
                derivativeEdges.map(edge => 
                    fetchDerivativesRecursively(edge.childIpId, currentDepth + 1)
                )
            );
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error(`Error fetching derivatives for ${ipId} at depth ${currentDepth}: ${errorMessage}`);
        currentAsset.title += ` (Derivative Error: ${errorMessage.substring(0, 50)}...)`;
    }
    return currentAsset;
};

const buildRemixTree = async (startAssetId) => { 
    if (!storyApiKey) throw new Error('Story Protocol API Key is not configured in .env file');
    const idToFetch = startAssetId.trim();
    if (!idToFetch) throw new Error('IP Asset ID cannot be empty.');
    const tree = await fetchDerivativesRecursively(idToFetch, 0);
    const rootAssetDetails = await getIpAsset(idToFetch);
    const parent = rootAssetDetails.parents?.[0]?.ipId;
    if (parent && parent !== '0x0000000000000000000000000000000000000000') {
        const parentAsset = await getIpAsset(parent).catch(e => ({ ipId: parent, title: "Parent Asset (Loading Failed)", mediaType: "Unknown" }));
        return {
            ...parentAsset,
            children: [tree]
        };
    }
    return tree;
};
// --- getOnChainAnalytics DIPERBARUI UNTUK MENGGUNAKAN HASIL AGREGRASI ---
const getOnChainAnalytics = async (ipId) => {
    try {
        const [assetDetails, royaltyData, disputeStatus] = await Promise.all([
            getIpAsset(ipId),
            getRoyaltyHistoryAndValue(ipId),
            getDisputeStatus(ipId)
        ]);

        const royaltyPolicy = assetDetails?.royaltyPolicy;
        const royaltyRate = royaltyPolicy?.rate ? (royaltyPolicy.rate / 10000).toFixed(2) : 'N/A';

        return {
            licenseTermsId: royaltyPolicy?.address || `Policy for ${ipId.substring(0, 8)}...`,
            royaltySplit: `${royaltyRate}%`,
            // Kirim array dari total ke frontend
            totalRoyaltiesPaid: royaltyData.totalValuesByToken,
            disputeStatus: disputeStatus,
        };
    } catch (error) {
        console.error(`Error fetching combined analytics for ${ipId}:`, error.message);
        return {
            licenseTermsId: "Error",
            royaltySplit: "Error",
            totalRoyaltiesPaid: "Failed to fetch value",
            disputeStatus: "Error",
            errorMessage: error.message
        };
    }
};
const getValueFlowData = async (startAssetId) => {
    const tree = await buildRemixTree(startAssetId);
    if (!tree) throw new Error("Could not build the initial asset tree.");

    const allNodes = new Map();
    const tasks = [];

    const traverseAndCollect = (node) => {
        if (!node || !node.ipId || allNodes.has(node.ipId)) return;
        allNodes.set(node.ipId, { ...node, children: undefined }); 
        if (node.children) {
            node.children.forEach(traverseAndCollect);
        }
    };
    
    traverseAndCollect(tree);

    allNodes.forEach((node, ipId) => {
        tasks.push(
            getOnChainAnalytics(ipId).then(analytics => {
                const currentNode = allNodes.get(ipId);
                // Untuk grafik, kita bisa ambil nilai dari token pertama saja sebagai representasi
                const numericRoyalties = parseFloat(analytics.totalRoyaltiesPaid?.[0]?.totalValue) || 0;
                currentNode.analytics = { ...analytics, totalRoyaltiesClaimed: numericRoyalties };
            }).catch(e => {
                const currentNode = allNodes.get(ipId);
                currentNode.analytics = { totalRoyaltiesClaimed: 0, royaltySplit: "0%", disputeStatus: "Error", errorMessage: e.message };
            })
        );
    });

    await Promise.all(tasks);

    const enrichTreeWithAnalytics = (node) => {
        if (!node || !node.ipId) return null;
        const analyticsData = allNodes.get(node.ipId)?.analytics;
        const children = node.children ? node.children.map(enrichTreeWithAnalytics).filter(Boolean) : [];
        return {
            ...node,
            analytics: analyticsData,
            children: children
        };
    };
    
    const enrichedTree = enrichTreeWithAnalytics(tree);

    return enrichedTree;
};
module.exports = {
  searchIpAssets,
  buildRemixTree,
  getIpAsset,
  getOnChainAnalytics,
  getValueFlowData,
  getRoyaltyTransactions,
  getTopLicensees,
};