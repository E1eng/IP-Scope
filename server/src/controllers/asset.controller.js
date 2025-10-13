const storyProtocolService = require('../services/storyProtocol.service');

const getAssetsByOwnerController = async (req, res) => {
  try {
    // FIX: Ambil ownerAddress dari query parameter, bukan path parameter
    const ownerAddress = req.query.ownerAddress; 
    const limit = parseInt(req.query.limit, 10) || 20; 
    const offset = parseInt(req.query.offset, 10) || 0;
    const tokenContract = req.query.tokenContract || undefined;

    // TIDAK LAGI VALIDASI KETAT DI SINI. Logic failover di Client yang menangani validasi.

    const { data: assets, pagination } = await storyProtocolService.getAssetsByOwner(
        ownerAddress, 
        limit, 
        offset,
        tokenContract 
    );
    
    res.status(200).json({
        data: assets,
        pagination: pagination || { total: assets.length }
    });

  } catch (error) {
    console.error(`[CONTROLLER_ERROR] ${error.message}`);
    res.status(500).json({ message: `Terjadi error di server: ${error.message}` });
  }
};

const getAssetDetailsController = async (req, res) => {
    try {
        let ipId = req.params.ipId;
        console.log(`[CONTROLLER] Menerima permintaan detail untuk IP ID: ${ipId}`);
        const asset = await storyProtocolService.getAssetDetails(ipId);
        if (!asset) { return res.status(404).json({ message: "Asset tidak ditemukan." }); }
        res.status(200).json(asset);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `Terjadi error di server: ${error.message}` });
    }
};

const getRoyaltyTransactionsController = async (req, res) => {
    try {
        const ipId = req.params.ipId;
        const transactions = await storyProtocolService.getRoyaltyTransactions(ipId);
        res.status(200).json(transactions);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `Terjadi error di server: ${error.message}` });
    }
};

const getTopLicenseesController = async (req, res) => {
    try {
        const ipId = req.params.ipId;
        const licensees = await storyProtocolService.getTopLicensees(ipId);
        res.status(200).json(licensees);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `Terjadi error di server: ${error.message}` });
    }
};

const getTransactionDetailController = async (req, res) => {
    try {
        const txHash = req.params.txHash;
        const detail = await storyProtocolService.fetchTransactionDetail(txHash);
        if (detail.error) { return res.status(404).json({ message: detail.error }); }
        res.status(200).json(detail);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `Terjadi error di server: ${error.message}` });
    }
};


module.exports = {
  getAssetsByOwnerController, 
  getAssetDetailsController,
  getRoyaltyTransactionsController,
  getTopLicenseesController,
  getTransactionDetailController,
};