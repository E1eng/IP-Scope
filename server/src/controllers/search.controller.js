const storyProtocolService = require('../services/storyProtocol.service');

// Fungsi yang sudah ada
const searchAssets = async (req, res) => {
  const { query, mediaType } = req.query;
  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }
  try {
    const data = await storyProtocolService.searchIpAssets(query, mediaType);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in search controller:', error.message);
    res.status(500).json({ message: 'An error occurred during search' });
  }
};

// Fungsi baru untuk mengambil pohon remix
const getAssetRemixTree = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Asset ID is required' });
  }
  try {
    const treeData = await storyProtocolService.buildRemixTree(id);
    res.status(200).json(treeData);
  } catch (error) {
    console.error('Error in tree controller:', error.message);
    res.status(500).json({ message: 'An error occurred while building the remix tree' });
  }
};

module.exports = {
  searchAssets,
  getAssetRemixTree,
};