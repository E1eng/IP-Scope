const storyProtocolService = require('../services/storyProtocol.service');

const searchAssets = async (req, res) => {
  // Ambil query, mediaType, dan parameter pagination
  const { query, mediaType, limit, offset } = req.query;
  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }
  try {
    // Kirim semua parameter ke service, termasuk limit dan offset
    const data = await storyProtocolService.searchIpAssets(query, mediaType, limit, offset);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in search controller:', error.message);
    res.status(500).json({ message: 'An error occurred during search' });
  }
};

const getAssetRemixTree = async (req, res) => { /* ... kode tidak berubah ... */ };

module.exports = {
  searchAssets,
  getAssetRemixTree,
};