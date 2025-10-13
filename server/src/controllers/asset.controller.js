const storyProtocolService = require('../services/storyProtocol.service');

const getAssetsByOwnerController = async (req, res) => {
  try {
    const ownerAddress = req.params.address;
    console.log(`[CONTROLLER] Menerima permintaan untuk alamat: ${ownerAddress}`);
    const assets = await storyProtocolService.getAssetsByOwner(ownerAddress);
    res.status(200).json(assets);
  } catch (error) {
    console.error(`[CONTROLLER_ERROR] ${error.message}`);
    res.status(500).json({ message: `Terjadi error di server: ${error.message}` });
  }
};

const getAssetDetailsController = async (req, res) => {
    try {
        let ipId = req.params.ipId;
        
        // IP ID dikirim AS-IS (checksum) untuk pencarian yang andal
        console.log(`[CONTROLLER] Menerima permintaan detail untuk IP ID: ${ipId}`);
        const asset = await storyProtocolService.getAssetDetails(ipId);

        if (!asset) {
            // Mengembalikan 404 jika API Assets tidak menemukan ID tersebut
            return res.status(404).json({ message: "Asset tidak ditemukan." });
        }
        
        res.status(200).json(asset);
    } catch (error) {
        console.error(`[CONTROLLER_ERROR] ${error.message}`);
        res.status(500).json({ message: `Terjadi error di server: ${error.message}` });
    }
};

const getRoyaltyTransactionsController = async (req, res) => {
    try {
        const ipId = req.params.ipId;
        console.log(`[CONTROLLER] Menerima permintaan transaksi royalti untuk IP ID: ${ipId}`);
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
        console.log(`[CONTROLLER] Menerima permintaan top licensee untuk IP ID: ${ipId}`);
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
        console.log(`[CONTROLLER] Menerima permintaan detail transaksi untuk hash: ${txHash}`);
        const detail = await storyProtocolService.fetchTransactionDetail(txHash);

        if (detail.error) {
            return res.status(404).json({ message: detail.error });
        }
        
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