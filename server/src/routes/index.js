const express = require('express');
const {
    searchAssets,
    getAssetDetail,
    getAssetRemixTree,
    getOnChainAnalyticsController,
    getAssetValueFlowGraph, // <-- Impor fungsi baru dari controller yang benar
} = require('../controllers/asset.controller');

const router = express.Router();

// Asset & Search Routes
router.get('/search', searchAssets);
router.get('/assets/:id', getAssetDetail);
router.get('/assets/:id/remix-tree', getAssetRemixTree);
router.get('/assets/:id/analytics', getOnChainAnalyticsController);

// ▼▼▼ ROUTE BARU YANG SEKARANG AKAN BERFUNGSI ▼▼▼
router.get('/graphs/:id/value-flow', getAssetValueFlowGraph);

module.exports = router;