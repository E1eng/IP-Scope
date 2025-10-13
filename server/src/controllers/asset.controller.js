const storyProtocolService = require('../services/storyProtocol.service');

const getAssetDetail = async (req, res) => { /* ... (tidak berubah) */ };
const getOnChainAnalyticsController = async (req, res) => { /* ... (tidak berubah) */ };
const getRoyaltyTransactionsController = async (req, res) => { /* ... (tidak berubah) */ };
const getTopLicenseesController = async (req, res) => { /* ... (tidak berubah) */ };

// --- Controller utama untuk grafik, sekarang hanya satu ---
const getAssetValueFlowGraph = async (req, res) => {
  try {
    const graphData = await storyProtocolService.getValueFlowData(req.params.id);
    res.status(200).json(graphData);
  } catch (error) {
    console.error('Error in value flow graph controller:', error.message);
    res.status(500).json({ message: `Failed to fetch value flow graph: ${error.message}` });
  }
};

const getAssetChildrenController = async (req, res) => {
    try {
        const children = await storyProtocolService.getAssetChildren(req.params.id);
        res.status(200).json(children);
    } catch (error) {
        res.status(500).json({ message: `Failed to fetch asset children: ${error.message}` });
    }
};

module.exports = {
  getAssetDetail,
  getOnChainAnalyticsController,
  getRoyaltyTransactionsController,
  getTopLicenseesController,
  getAssetValueFlowGraph, 
  getAssetChildrenController,
};