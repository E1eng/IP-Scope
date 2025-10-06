const axios = require('axios');

const BASE_URL = 'https://api.storyapis.com/api/v4';
const SEARCH_URL = `${BASE_URL}/search`;
const ASSETS_DETAIL_URL = `${BASE_URL}/assets`; 

const apiKey = process.env.STORY_PROTOCOL_API_KEY;
const apiHeaders = { 'X-API-Key': apiKey, 'Content-Type': 'application/json' };

// Fungsi ini sekarang menerima limit dan offset
const searchIpAssets = async (query, mediaType, limit = 20, offset = 0) => {
  if (!apiKey) throw new Error('Story Protocol API Key is not configured in .env file');

  try {
    const searchBody = {
      query: query,
      // ▼▼▼ INI PERBAIKANNYA ▼▼▼
      // Menambahkan objek pagination ke body request
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    };

    if (mediaType && mediaType !== 'all') {
      searchBody.mediaType = mediaType;
    }

    console.log("Sending search body with pagination:", JSON.stringify(searchBody, null, 2));
    const searchResponse = await axios.post(SEARCH_URL, searchBody, { headers: apiHeaders });
    
    // Sisa logika untuk mengambil detail gambar tidak berubah
    const searchResults = searchResponse.data.data;
    if (!searchResults || searchResults.length === 0) {
      return searchResponse.data;
    }
    const ipIdsToFetch = searchResults.map(asset => asset.ipId);
    const detailsBody = { where: { ipIds: ipIdsToFetch } };
    const detailsResponse = await axios.post(ASSETS_DETAIL_URL, detailsBody, { headers: apiHeaders });
    const detailedAssets = detailsResponse.data.data;
    const detailsMap = new Map(detailedAssets.map(asset => [asset.ipId, asset]));
    const enrichedAssets = searchResults.map(asset => {
      const details = detailsMap.get(asset.ipId);
      const imageUrl = details ? details.nftMetadata?.image?.thumbnailUrl : null;
      const finalAsset = { ...asset, ...details, mediaUrl: imageUrl };
      return finalAsset;
    });
    
    return { ...searchResponse.data, data: enrichedAssets };

  } catch (error) {
    const errorMessage = error.response ? `Status: ${error.response.status} - Data: ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`AXIOS ERROR: ${errorMessage}`);
    throw new Error('Failed to fetch data from Story Protocol API');
  }
};

const buildRemixTree = async (startAssetId) => { /* ... */ };

module.exports = {
  searchIpAssets,
  buildRemixTree,
};