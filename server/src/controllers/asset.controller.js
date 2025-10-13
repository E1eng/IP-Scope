const storyProtocolService = require('../services/storyProtocol.service');

const getAssetsByOwnerController = async (req, res) => {
    try {
        const assets = await storyProtocolService.getAssetsByOwner(req.params.address);
        res.status(200).json(assets);
    } catch (error) {
        res.status(500).json({ message: `Failed to fetch assets by owner: ${error.message}` });
    }
};

const getAssetDetailsForModalController = async (req, res) => {
    try {
        const details = await storyProtocolService.getAssetDetailsForModal(req.params.id);
        if (!details) return res.status(404).json({ message: "Asset not found." });
        res.status(200).json(details);
    } catch (error) {
        res.status(500).json({ message: `Failed to fetch asset details: ${error.message}` });
    }
};

const getRoyaltyTransactionsController = async (req, res) => {
    try {
        const transactions = await storyProtocolService.getRoyaltyTransactions(req.params.id);
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: `Failed to fetch royalty transactions: ${error.message}` });
    }
};

const getTopLicenseesController = async (req, res) => {
    try {
        const licensees = await storyProtocolService.getTopLicensees(req.params.id);
        res.status(200).json(licensees);
    } catch (error) {
        res.status(500).json({ message: `Failed to fetch top licensees: ${error.message}` });
    }
};

module.exports = {
    getAssetsByOwnerController,
    getAssetDetailsForModalController,
    getRoyaltyTransactionsController,
    getTopLicenseesController,
};