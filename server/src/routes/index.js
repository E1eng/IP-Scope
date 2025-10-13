const express = require('express');
const {
    getAssetDetail,
    getOnChainAnalyticsController,
    getRoyaltyTransactionsController,
    getTopLicenseesController,
    getAssetValueFlowGraph,
    getAssetChildrenController,
} = require('../controllers/asset.controller');

const router = express.Router();

// Asset endpoints
router.get('/assets/:id', getAssetDetail);
router.get('/assets/:id/analytics', getOnChainAnalyticsController);
router.get('/assets/:id/royalty-transactions', getRoyaltyTransactionsController);
router.get('/assets/:id/top-licensees', getTopLicenseesController);
router.get('/assets/:id/children', getAssetChildrenController);

// Graph endpoints
router.get('/graphs/:id/value-flow', getAssetValueFlowGraph);

module.exports = router;