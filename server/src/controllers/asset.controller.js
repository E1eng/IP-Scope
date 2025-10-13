// ... (impor dan fungsi-fungsi lain tetap sama)
const storyProtocolService = require('../services/storyProtocol.service');

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
const getGraphLayoutController = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Asset ID is required' });
    try {
        const layoutData = await storyProtocolService.getGraphLayout(id);
        res.status(200).json(layoutData);
    } catch (error) {
        console.error('Error in graph layout controller:', error.message);
        res.status(500).json({ message: `Failed to fetch graph layout: ${error.message}` });
    }
};
const getRoyaltyTransactionsController = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Asset ID is required' });
    try {
        const transactions = await storyProtocolService.getRoyaltyTransactions(id);
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error in royalty transactions controller:', error.message);
        res.status(500).json({ message: `Failed to fetch royalty transactions: ${error.message}` });
    }
};

const getTopLicenseesController = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Asset ID is required' });
    try {
        const licensees = await storyProtocolService.getTopLicensees(id);
        res.status(200).json(licensees);
    } catch (error) {
        console.error('Error in top licensees controller:', error.message);
        res.status(500).json({ message: `Failed to fetch top licensees: ${error.message}` });
    }
};

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

module.exports = {
  getAssetDetail,
  getAssetValueFlowGraph,
  getOnChainAnalyticsController,
  getRoyaltyTransactionsController,
  getTopLicenseesController,
  getGraphLayoutController,
};