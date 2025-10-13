const storyProtocolService = require('../services/storyProtocol.service');

// Controller untuk mengambil data grafik awal (root + daftar ID anak)
const getAssetValueFlowGraph = async (req, res) => {
    try {
        const graphData = await storyProtocolService.getValueFlowData(req.params.id);
        res.status(200).json(graphData);
    } catch (error) {
        console.error('Error in getAssetValueFlowGraph controller:', error.message);
        res.status(500).json({ message: `Failed to fetch value flow graph: ${error.message}` });
    }
};

// Controller untuk mengambil detail dari sekumpulan aset (untuk paginasi)
const getAssetsBatchController = async (req, res) => {
    try {
        const { ipIds } = req.body;
        if (!ipIds || !Array.isArray(ipIds)) {
            return res.status(400).json({ message: "ipIds must be an array." });
        }
        const assets = await storyProtocolService.getIpAssetsBatch(ipIds);
        res.status(200).json(assets);
    } catch (error) {
        console.error('Error in getAssetsBatchController:', error.message);
        res.status(500).json({ message: `Failed to fetch batch assets: ${error.message}` });
    }
};

// Controller untuk mengambil detail satu aset (saat node diklik)
const getAssetDetailController = async (req, res) => {
    try {
        const asset = await storyProtocolService.getIpAsset(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: "Asset not found." });
        }
        res.status(200).json(asset);
    } catch (error) {
        console.error('Error in getAssetDetailController:', error.message);
        res.status(500).json({ message: `Failed to fetch asset details: ${error.message}` });
    }
};

// Controller untuk mengambil data analitik satu aset (saat node diklik)
const getOnChainAnalyticsController = async (req, res) => {
    try {
        const analytics = await storyProtocolService.getOnChainAnalytics(req.params.id);
        res.status(200).json(analytics);
    } catch (error) {
        console.error('Error in getOnChainAnalyticsController:', error.message);
        res.status(500).json({ message: `Failed to fetch analytics: ${error.message}` });
    }
};

module.exports = {
    getAssetValueFlowGraph,
    getAssetsBatchController,
    getAssetDetailController,
    getOnChainAnalyticsController,
};