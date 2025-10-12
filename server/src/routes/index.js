const express = require('express');
const {
    searchAssets,
    getAssetDetail,
    getAssetRemixTree,
    getOnChainAnalyticsController,
    getAssetValueFlowGraph,
    // --- IMPOR FUNGSI CONTROLLER BARU ---
    getRoyaltyTransactionsController,
    getTopLicenseesController,
} = require('../controllers/asset.controller');

const router = express.Router();

// Asset & Search Routes
router.get('/search', searchAssets);
router.get('/assets/:id', getAssetDetail);
router.get('/assets/:id/remix-tree', getAssetRemixTree);
router.get('/assets/:id/analytics', getOnChainAnalyticsController);

// Graph Route
router.get('/graphs/:id/value-flow', getAssetValueFlowGraph);

// --- ROUTE BARU UNTUK FITUR ANALITIK TAMBAHAN ---
router.get('/assets/:id/royalty-transactions', getRoyaltyTransactionsController);
router.get('/assets/:id/top-licensees', getTopLicenseesController);

module.exports = router;