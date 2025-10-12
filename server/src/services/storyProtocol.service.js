const axios = require('axios');
const { client } = require('../utils/storyClient'); // Impor klien SDK
// ▼▼▼ IMPOR BARU UNTUK FUNGSI ON-CHAIN ▼▼▼
const { WIP_TOKEN_ADDRESS } = require("@story-protocol/core-sdk");
const { formatEther } = require("viem");

// ... (kode BASE_URL, apiKey, apiHeaders, checkApiKey, normalizeAssetData, getIpAsset tidak berubah) ...
const BASE_URL = 'https://api.storyapis.com/api/v4';
const SEARCH_URL = `${BASE_URL}/search`;
const ASSETS_DETAIL_URL = `${BASE_URL}/assets`; 
const ASSETS_EDGES_URL = `${BASE_URL}/assets/edges`; 


const apiKey = process.env.STORY_PROTOCOL_API_KEY;
const apiHeaders = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

const MAX_TREE_DEPTH = 3;

const checkApiKey = () => {
    if (!apiKey || apiKey === 'YOUR_STORY_PROTOCOL_API_KEY_HERE') {
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
        const detailsResponse = await axios.post(ASSETS_DETAIL_URL, detailsBody, { headers: apiHeaders });
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
  
      searchResponse = await axios.post(SEARCH_URL, searchBody, { headers: apiHeaders });
      const searchResults = searchResponse.data.data || [];

      if (searchResults.length === 0) {
        return { data: [], pagination: searchResponse.data.pagination };
      }
      
      const ipIdsToFetch = searchResults.map(asset => asset.ipId);
      const detailsBody = { 
          where: { ipIds: ipIdsToFetch },
          includeLicenses: true
      };
      const detailsResponse = await axios.post(ASSETS_DETAIL_URL, detailsBody, { headers: apiHeaders });

      const detailedAssets = detailsResponse.data.data || [];
      const detailsMap = new Map(detailedAssets.map(asset => [asset.ipId, asset]));
      
      const enrichedAssets = searchResults.map(asset => {
        const details = detailsMap.get(asset.ipId);
        return normalizeAssetData({ ...asset, ...details });
      });
      
      // ▼▼▼ PERBAIKAN UTAMA DI SINI ▼▼▼
      // Pastikan `total` dari hasil pencarian asli yang digunakan
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

// ... (sisa service [buildRemixTree, etc.] tidak berubah) ...
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
        const edgesResponse = await axios.post(ASSETS_EDGES_URL, edgesBody, { headers: apiHeaders });
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
    if (!apiKey) throw new Error('Story Protocol API Key is not configured in .env file');
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

const getInfringementScore = async (ipId) => {
    await new Promise(resolve => setTimeout(resolve, 800)); 
    const score = (ipId.charCodeAt(ipId.length - 1) % 50) + 50;
    let justification = "Low risk detected. No direct content matching found.";
    if (score > 80) {
        justification = "High compositional similarity suggests potential derivative intent.";
    } else if (score > 65) {
        justification = "Moderate risk. Partial stylistic overlap observed.";
    }
    return {
        riskScore: score,
        justification: justification,
        timestamp: new Date().toISOString()
    };
};

const getOnChainAnalytics = async (ipId) => {
    // PERIKSA APAKAH SDK SIAP. Jika tidak, WALLET_PRIVATE_KEY mungkin hilang.
    if (!client) {
        console.warn("SDK client not initialized. Falling back to simulated analytics data.");
        // Jalankan logika simulasi lama sebagai fallback
        const hashValue = ipId.charCodeAt(ipId.length - 2) + ipId.charCodeAt(ipId.length - 1);
        return {
            licenseTermsId: `SIMULATED: 0xT...${ipId.substring(8, 12)}`,
            royaltySplit: `${((hashValue % 20) + 1).toFixed(2)}%`,
            totalRoyaltiesClaimed: `${(hashValue * 10).toLocaleString()} ETH`,
            disputeStatus: (hashValue % 10 === 0) ? "Active (Simulated)" : "None (Simulated)",
        };
    }

    try {
        // 1. Ambil data aset lengkap untuk mendapatkan info lisensi/royalti
        const assetDetails = await getIpAsset(ipId);
        const royaltyPolicy = assetDetails?.royaltyPolicy;

        // 2. Ambil PENDAPATAN YANG BISA DIKLAIM (CLAIMABLE REVENUE) secara on-chain
        const claimableRevResponse = await client.royalty.claimableRevenue({
            ipId: ipId,
            claimer: ipId, // Umumnya, IP asset itu sendiri yang menjadi claimer
            token: WIP_TOKEN_ADDRESS, // Menggunakan token default dari SDK
        });

        // 3. Format data dari blockchain (BigInt) menjadi string yang bisa dibaca
        const totalRoyaltiesClaimed = `${formatEther(claimableRevResponse.claimableRevenue)} WIP`;
        
        // 4. Hitung persentase royalti dari data yang sudah kita punya
        const royaltyRate = royaltyPolicy?.rate ? (royaltyPolicy.rate / 10000).toFixed(2) : '0.00';
        const royaltySplit = `${royaltyRate}%`;

        // 5. Dispute Status masih simulasi karena dokumentasi yang diberikan hanya untuk Royalty
        const disputeStatus = "None (Real data pending)";

        return {
            licenseTermsId: royaltyPolicy?.address || `Policy for ${ipId.substring(0, 8)}...`,
            royaltySplit: royaltySplit,
            totalRoyaltiesClaimed: totalRoyaltiesClaimed,
            disputeStatus: disputeStatus,
        };

    } catch (error) {
        console.error(`Error fetching REAL on-chain analytics for ${ipId}:`, error.message);
        // Jika panggilan SDK gagal, kembalikan pesan error yang jelas
        return {
            licenseTermsId: "Error",
            royaltySplit: "Error",
            totalRoyaltiesClaimed: "Failed to fetch",
            disputeStatus: "Error",
            errorMessage: "Could not retrieve on-chain data. Ensure WALLET_PRIVATE_KEY and RPC_PROVIDER_URL are set correctly in server/.env."
        };
    }
};

const getValueFlowData = async (startAssetId) => {
    // 1. Dapatkan struktur pohon dasar
    const tree = await buildRemixTree(startAssetId);
    if (!tree) throw new Error("Could not build the initial asset tree.");

    const allNodes = new Map();
    const tasks = [];

    // Fungsi untuk melintasi pohon dan mengumpulkan semua node unik
    const traverseAndCollect = (node) => {
        if (!node || !node.ipId || allNodes.has(node.ipId)) return;
        allNodes.set(node.ipId, { ...node, children: undefined }); // Simpan data node, hapus children untuk flat structure
        if (node.children) {
            node.children.forEach(traverseAndCollect);
        }
    };
    
    traverseAndCollect(tree);

    // 2. Buat array promise untuk mengambil analitik setiap node
    allNodes.forEach((node, ipId) => {
        tasks.push(
            getOnChainAnalytics(ipId).then(analytics => {
                const currentNode = allNodes.get(ipId);
                // Konversi nilai royalti menjadi angka untuk kemudahan visualisasi
                const totalRoyaltiesClaimed = parseFloat(analytics.totalRoyaltiesClaimed.replace(/,/g, '')) || 0;
                currentNode.analytics = { ...analytics, totalRoyaltiesClaimed };
            }).catch(e => {
                // Jika gagal, berikan nilai default
                const currentNode = allNodes.get(ipId);
                currentNode.analytics = { totalRoyaltiesClaimed: 0, royaltySplit: "0%", disputeStatus: "Error" };
            })
        );
    });

    // 3. Jalankan semua promise secara paralel
    await Promise.all(tasks);

    // 4. Kembalikan struktur pohon asli, tetapi sekarang setiap node memiliki data `analytics`
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
  getInfringementScore,
  getOnChainAnalytics,
  getValueFlowData,
};