const express = require('express');
// ▼▼▼ PERBAIKAN: Import getMonitoringAgents ▼▼▼
const { searchAssets, getAssetRemixTree, getAssetDetail, getMonitoringAgents, getOnChainAnalyticsController } = require('../controllers/asset.controller'); 

const router = express.Router();

router.get('/search', searchAssets);
router.get('/assets/:id', getAssetDetail);
router.get('/assets/:id/remix-tree', getAssetRemixTree);
router.get('/monitor/agents', getMonitoringAgents);
router.get('/assets/:id/analytics', getOnChainAnalyticsController);


module.exports = router;