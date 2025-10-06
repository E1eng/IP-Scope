const axios = require('axios');

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

/**
 * Utility function to normalize and clean up asset data.
 */
const normalizeAssetData = (asset) => {
    if (!asset) return null;
    
    const nftMetadata = asset.nftMetadata || {};
    const rawMetadata = nftMetadata.raw?.metadata || {};
    
    // Ambil objek lisensi pertama dari array licenses
    const firstLicense = asset.licenses && asset.licenses.length > 0 ? asset.licenses[0] : null;
    
    // Normalisasi semua bidang penting
    return {
        ...asset,
        ipId: asset.ipId || 'N/A',
        title: asset.name || rawMetadata.name || 'Untitled Asset',
        description: asset.description || rawMetadata.description || 'No description available.',
        // Pastikan mediaType selalu uppercase
        mediaType: nftMetadata.mediaType ? nftMetadata.mediaType.toUpperCase() : 'UNKNOWN',
        // FIX Gambar 400: Prioritaskan URL gambar mentah (.url)
        mediaUrl: nftMetadata.image?.url || nftMetadata.image?.thumbnailUrl || null, 
        parentsCount: asset.parentsCount !== undefined ? asset.parentsCount : (asset.parents?.length || 0),
        
        // FIX LISENSI: Ekstrak data terms dan royalty dari array licenses[0]
        pilTerms: firstLicense ? firstLicense.terms : null, 
        royaltyPolicy: firstLicense ? firstLicense.licensingConfig : null,
        
        // Pastikan createdAt selalu ada untuk sorting
        createdAt: asset.createdAt || null, 
        score: asset.score || 0,
        similarity: asset.similarity || 0,
    };
};


/**
 * Mendapatkan satu aset IP berdasarkan ID dan memperkaya datanya.
 */
const getIpAsset = async (ipId) => {
    checkApiKey();
    const idToFetch = ipId.trim();

    try {
        const detailsBody = { 
            where: { ipIds: [idToFetch] },
            includeLicenses: true // FIX LISENSI: Meminta detail lisensi
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


/**
 * Mencari aset IP dan memperkaya data dengan URL media.
 */
const searchIpAssets = async (query, mediaType, limit = 20, offset = 0) => {
    if (!apiKey) throw new Error('Story Protocol API Key is not configured in .env file');
  
    let searchResponse, detailsResponse;
    let searchResults = [];
    let total = 0;

    try {
      // --- LANGKAH 1: SEARCH ---
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
  
      searchResponse = await axios.post(SEARCH_URL, searchBody, { headers: apiHeaders });
      searchResults = searchResponse.data.data || [];
      total = searchResponse.data.pagination?.total || 0;

      if (searchResults.length === 0) {
        return { data: [], pagination: searchResponse.data.pagination };
      }
      
    } catch (error) {
        const errorMessage = error.response ? `Status: ${error.response.status} - Data: ${JSON.stringify(error.response.data)}` : error.message;
        console.error(`AXIOS ERROR (Search Step 1): ${errorMessage}`);
        throw new Error(`Search API Failed: ${errorMessage}`);
    }
    
    // --- LANGKAH 2: FETCH DETAILS (Enrichment) ---
    try {
        const ipIdsToFetch = searchResults.map(asset => asset.ipId);
        const detailsBody = { 
            where: { ipIds: ipIdsToFetch },
            includeLicenses: true // FIX LISENSI: Meminta detail lisensi
        };
        detailsResponse = await axios.post(ASSETS_DETAIL_URL, detailsBody, { headers: apiHeaders });

        const detailedAssets = detailsResponse.data.data || [];
        const detailsMap = new Map(detailedAssets.map(asset => [asset.ipId, asset]));
        
        // Gabungkan dan Normalisasi data
        const enrichedAssets = searchResults.map(asset => {
          const details = detailsMap.get(asset.ipId);
          return normalizeAssetData({ ...asset, ...details });
        });
        
        return { 
            data: enrichedAssets, 
            pagination: searchResponse.data.pagination 
        };

    } catch (error) {
        const errorMessage = error.response ? `Status: ${error.response.status} - Data: ${JSON.stringify(error.response.data)}` : error.message;
        console.error(`AXIOS ERROR (Details Step 2): ${errorMessage}`);
        // Jika langkah detail gagal, kita kembalikan hasil search mentah (dinormalisasi seadanya)
        console.warn('Returning partial search results due to details API failure.');
        const partialAssets = searchResults.map(asset => normalizeAssetData(asset));
        return {
            data: partialAssets,
            pagination: searchResponse.data.pagination
        };
    }
};

const fetchDerivativesRecursively = async (ipId, currentDepth) => {
    // Ambil detail aset saat ini
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
    
    // Cari turunan (children)
    const MAX_DERIVATIVES = 10; 
    const edgesBody = {
        where: { parentIpId: ipId }, 
        pagination: { limit: MAX_DERIVATIVES, offset: 0 }
    };
    
    try {
        const edgesResponse = await axios.post(ASSETS_EDGES_URL, edgesBody, { headers: apiHeaders });
        const derivativeEdges = edgesResponse.data.data || [];
        
        if (derivativeEdges.length > 0) {
            // Memicu panggilan rekursif untuk setiap anak
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


/**
 * Fungsi untuk membangun pohon remix multi-level.
 */
const buildRemixTree = async (startAssetId) => { 
    if (!apiKey) throw new Error('Story Protocol API Key is not configured in .env file');
    
    const idToFetch = startAssetId.trim();
    if (!idToFetch) throw new Error('IP Asset ID cannot be empty.');

    // Mulai rekursi dari depth 0
    const tree = await fetchDerivativesRecursively(idToFetch, 0);

    // Periksa apakah aset awal adalah turunan (memiliki parent)
    const rootAssetDetails = await getIpAsset(idToFetch);
    const parent = rootAssetDetails.parents?.[0]?.ipId;
    
    // Jika ada parent, jadikan parent sebagai root logis
    if (parent && parent !== '0x0000000000000000000000000000000000000000') {
        const parentAsset = await getIpAsset(parent).catch(e => ({ ipId: parent, title: "Parent Asset (Loading Failed)", mediaType: "Unknown" }));
        
        return {
            ...parentAsset,
            children: [tree] // Tree yang baru dibuat menjadi anak dari parent
        };
    }

    return tree;
};

const getInfringementScore = async (ipId) => {
    // Simulasi penundaan jaringan/pemrosesan
    await new Promise(resolve => setTimeout(resolve, 800)); 

    // Simulasi logika AI:
    // Nilai score didasarkan pada IP ID hash (untuk hasil yang konsisten)
    const score = (ipId.charCodeAt(ipId.length - 1) % 50) + 50; // Skor antara 50-99

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
    // Simulasi penundaan jaringan/pemrosesan
    await new Promise(resolve => setTimeout(resolve, 300)); 
    
    // Simulasi data analytics berdasarkan IP ID hash (untuk konsistensi)
    const hashValue = ipId.charCodeAt(ipId.length - 2) + ipId.charCodeAt(ipId.length - 1);
    
    let disputeStatus = "None";
    if (hashValue % 10 === 0) disputeStatus = "Active Dispute (Claim #123)";
    if (hashValue % 7 === 0) disputeStatus = "Closed - No Violation";

    const royaltySplit = ((hashValue % 20) + 1).toFixed(2); // Split 1% to 20%
    const claimed = (hashValue * 10).toLocaleString(); // Total claimed

    return {
        licenseTermsId: "0xT" + ipId.substring(2, 10), // Simulated Term ID
        royaltySplit: `${royaltySplit}%`,
        disputeStatus: disputeStatus,
        totalRoyaltiesClaimed: `${claimed} ETH`,
    };
};


module.exports = {
  searchIpAssets,
  buildRemixTree,
  getIpAsset,
  getInfringementScore,
  getOnChainAnalytics, // ▼▼▼ FIX: PASTIKAN FUNGSI INI DIEKSPOR ▼▼▼
};