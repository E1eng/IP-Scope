const storyProtocolService = require('../services/storyProtocol.service');

const searchAssets = async (req, res) => {
  const { query, mediaType, limit, offset } = req.query;
  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }
  try {
    const data = await storyProtocolService.searchIpAssets(query, mediaType, limit, offset);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in search controller:', error.message);
    
    const errorMessage = error.message.includes('API Key') 
      ? "API Key Error: Please check your STORY_PROTOCOL_API_KEY in the server/.env file." 
      : `Backend Error: ${error.message}`;

    res.status(500).json({ message: errorMessage });
  }
};

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

// ▼▼▼ DEFINISI CONTROLLER ANALITIK BARU ▼▼▼
const getOnChainAnalyticsController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'Asset ID is required' });
    }
    try {
        // Panggil fungsi yang benar dari service
        const analytics = await storyProtocolService.getOnChainAnalytics(id);
        res.status(200).json(analytics);
    } catch (error) {
        console.error('Error in analytics controller:', error.message);
        res.status(500).json({ message: `Failed to fetch analytics: ${error.message}` });
    }
};

const getMonitoringAgents = async (req, res) => {
    // Data simulasi untuk fitur Monitoring Agents
    const monitoredAssets = [
        { ipId: "0x434B15f455d0Ed122D025ca7F64F9D9b7033F809", title: "Story Mascot V2", status: "Active", lastCheck: "2025-10-06T10:00:00Z" },
        { ipId: "0xab6e7fCa17A62e47B956df31Ed48Ebee9Ba607aa", title: "Manga Character Alpha", status: "Alert", lastCheck: "2025-10-06T18:00:00Z" },
    ];
    res.status(200).json(monitoredAssets);
};


module.exports = {
  searchAssets,
  getAssetRemixTree,
  getAssetDetail, 
  getMonitoringAgents,
  getOnChainAnalyticsController, // ▼▼▼ EXPORT FUNGSI ANALITIK BARU ▼▼▼
};