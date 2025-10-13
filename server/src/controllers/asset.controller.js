const storyProtocolService = require('../services/storyProtocol.service');

// Get single asset details
const getAssetDetail = async (req, res) => {
    try {
        const asset = await storyProtocolService.getIpAsset(req.params.id);
        res.status(200).json(asset);
    } catch (error) {
        console.error('Error in getAssetDetail:', error.message);
        res.status(500).json({ 
            message: `Failed to fetch asset details: ${error.message}` 
        });
    }
};

// Get on-chain analytics
const getOnChainAnalyticsController = async (req, res) => {
    try {
        const analytics = await storyProtocolService.getOnChainAnalytics(req.params.id);
        res.status(200).json(analytics);
    } catch (error) {
        console.error('Error in analytics controller:', error.message);
        res.status(500).json({ 
            message: `Failed to fetch analytics: ${error.message}` 
        });
    }
};

// Get royalty transactions
const getRoyaltyTransactionsController = async (req, res) => {
    try {
        const transactions = await storyProtocolService.getRoyaltyTransactions(req.params.id);
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error in royalty transactions controller:', error.message);
        res.status(500).json({ 
            message: `Failed to fetch royalty transactions: ${error.message}` 
        });
    }
};

// Get top licensees
const getTopLicenseesController = async (req, res) => {
    try {
        const licensees = await storyProtocolService.getTopLicensees(req.params.id);
        res.status(200).json(licensees);
    } catch (error) {
        console.error('Error in top licensees controller:', error.message);
        res.status(500).json({ 
            message: `Failed to fetch top licensees: ${error.message}` 
        });
    }
};

// Get value flow graph (main graph endpoint)
const getAssetValueFlowGraph = async (req, res) => {
    try {
        console.log(`Fetching value flow graph for ${req.params.id}...`);
        const graphData = await storyProtocolService.getValueFlowData(req.params.id);
        res.status(200).json(graphData);
    } catch (error) {
        console.error('Error in value flow graph controller:', error.message);
        res.status(500).json({ 
            message: `Failed to fetch value flow graph: ${error.message}` 
        });
    }
};

// Get asset children (for incremental expansion)
const getAssetChildrenController = async (req, res) => {
    try {
        const children = await storyProtocolService.getAssetChildren(req.params.id);
        res.status(200).json(children);
    } catch (error) {
        console.error('Error in asset children controller:', error.message);
        res.status(500).json({ 
            message: `Failed to fetch asset children: ${error.message}` 
        });
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