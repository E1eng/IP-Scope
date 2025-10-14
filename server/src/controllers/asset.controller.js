const storyProtocolService = require('../services/storyProtocol.service');

const getAssetsByOwnerController = async (req, res) => {
  try {
    // Hanya ambil parameter yang relevan. `tokenContract` diabaikan.
    const { ownerAddress, limit, offset } = req.query;

    // Validasi bahwa ownerAddress ada
    if (!ownerAddress) {
        return res.status(400).json({ message: "ownerAddress query parameter is required." });
    }

    const { data: assets, pagination } = await storyProtocolService.getAssetsByOwner(
        ownerAddress,
        parseInt(limit) || 20,
        parseInt(offset) || 0
    );
    
    res.status(200).json({
        data: assets,
        pagination: pagination || { total: 0 }
    });

  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message;
    console.error(`[CONTROLLER_ERROR] Status: ${status}, Message: ${message}`);
    res.status(status).json({ message });
  }
};

// --- Controller Lainnya (tidak berubah) ---
const getDashboardStatsController = async (req, res) => {
    try {
        const { ownerAddress } = req.query; 
        if (!ownerAddress) { 
             return res.status(400).json({ message: "OwnerAddress query parameter is required." });
        }
        const stats = await storyProtocolService.getPortfolioStats(ownerAddress);
        res.status(200).json(stats);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `An error occurred on the server: ${error.message}` });
    }
};

const getAssetDetailsController = async (req, res) => {
    try {
        const { ipId } = req.params;
        const asset = await storyProtocolService.getAssetDetails(ipId);
        if (!asset) { return res.status(404).json({ message: "Asset not found." }); }
        res.status(200).json(asset);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `An error occurred on the server: ${error.message}` });
    }
};

const getRoyaltyTransactionsController = async (req, res) => {
    try {
        const { ipId } = req.params;
        const transactions = await storyProtocolService.getRoyaltyTransactions(ipId);
        res.status(200).json(transactions);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `An error occurred on the server: ${error.message}` });
    }
};

const getTopLicenseesController = async (req, res) => {
    try {
        const { ipId } = req.params;
        const licensees = await storyProtocolService.getTopLicensees(ipId);
        res.status(200).json(licensees);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `An error occurred on the server: ${error.message}` });
    }
};

const getTransactionDetailController = async (req, res) => {
    try {
        const { txHash } = req.params;
        const detail = await storyProtocolService.fetchTransactionDetail(txHash);
        if (detail.error) { return res.status(404).json({ message: detail.error }); }
        res.status(200).json(detail);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `An error occurred on the server: ${error.message}` });
    }
};

module.exports = {
  getAssetsByOwnerController, 
  getAssetDetailsController,
  getRoyaltyTransactionsController,
  getTopLicenseesController,
  getTransactionDetailController,
  getDashboardStatsController,
};