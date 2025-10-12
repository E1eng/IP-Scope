const storyProtocolService = require('../services/storyProtocol.service');

// SEARCH ASSETS
const searchAssets = async (req, res) => {
  const { query, mediaType, sortBy, limit, offset } = req.query;
  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }
  try {
    const data = await storyProtocolService.searchIpAssets(query, mediaType, sortBy, limit, offset);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in search controller:', error.message);
    const errorMessage = error.message.includes('API Key')
      ? "API Key Error: Please check your STORY_PROTOCOL_API_KEY in the server/.env file."
      : `Backend Error: ${error.message}`;
    res.status(500).json({ message: errorMessage });
  }
};

// GET ASSET DETAILS
const getAssetDetail = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'Asset ID is required' });
    }
    try {
        const asset = await storyProtocolService.getIpAsset(id);
        res.status(200).json(asset);
    } catch (error) {
        console.error('Error in asset detail controller:', error.message);
        res.status(500).json({ message: error.message.includes('API Key') ? error.message : `Failed to fetch asset detail for ID ${id}.` });
    }
};

// GET REMIX TREE (UNTUK GRAFIK DASAR)
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
    const errorMessage = error.message.includes('API Key') ? error.message : `Failed to fetch remix tree data for ID ${id}.`;
    res.status(500).json({ message: errorMessage });
  }
};

// GET ON-CHAIN ANALYTICS
const getOnChainAnalyticsController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'Asset ID is required' });
    }
    try {
        const analytics = await storyProtocolService.getOnChainAnalytics(id);
        res.status(200).json(analytics);
    } catch (error) {
        console.error('Error in analytics controller:', error.message);
        res.status(500).json({ message: `Failed to fetch analytics: ${error.message}` });
    }
};

// ▼▼▼ CONTROLLER BARU UNTUK VALUE FLOW ▼▼▼
const getAssetValueFlowGraph = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Asset ID is required' });
  }
  try {
    const graphData = await storyProtocolService.getValueFlowData(id);
    res.status(200).json(graphData);
  } catch (error) {
    console.error('Error in value flow graph controller:', error.message);
    res.status(500).json({ message: `Failed to fetch value flow graph: ${error.message}` });
  }
};


// Pastikan semua fungsi diekspor dari satu tempat
module.exports = {
  searchAssets,
  getAssetDetail,
  getAssetRemixTree,
  getOnChainAnalyticsController,
  getAssetValueFlowGraph,
};