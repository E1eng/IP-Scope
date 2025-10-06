const express = require('express');
// ▼▼▼ PERBAIKAN: Import getMonitoringAgents ▼▼▼
const { searchAssets, getAssetRemixTree, getAssetDetail, getMonitoringAgents } = require('../controllers/asset.controller'); 

const router = express.Router();

router.get('/search', searchAssets);
router.get('/assets/:id', getAssetDetail);
router.get('/assets/:id/remix-tree', getAssetRemixTree);

// ▼▼▼ ROUTE BARU ▼▼▼
router.get('/monitor/agents', getMonitoringAgents);

module.exports = router;