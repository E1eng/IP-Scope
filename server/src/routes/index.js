const express = require('express');
const {
    searchAssets,
    getAssetDetail,
    getAssetRemixTree,
    getOnChainAnalyticsController,
} = require('../controllers/asset.controller');

const router = express.Router();

// Asset & Search Routes
router.get('/search', searchAssets);
router.get('/assets/:id', getAssetDetail);
router.get('/assets/:id/remix-tree', getAssetRemixTree);
router.get('/assets/:id/analytics', getOnChainAnalyticsController);

module.exports = router;