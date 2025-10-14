// server/src/routes/index.js
const express = require('express');
const router = express.Router();

const assetController = require('../controllers/asset.controller.js');

// Search / list assets used by ExplorerPage
router.get('/assets', assetController.searchAssets);

// Asset detail endpoints
router.get('/assets/:ipId', assetController.getAssetDetails);
// Aliases for client expectations
router.get('/assets/:ipId/details', assetController.getAssetDetails);
router.get('/assets/:ipId/transactions', assetController.getAssetTransactions);
router.get('/assets/:ipId/royalty-transactions', assetController.getAssetTransactions);
router.get('/assets/:ipId/top-licensees', assetController.getTopLicensees);

// Dashboard stats endpoint used by ExplorerPage
router.get('/stats', assetController.getStats);
router.get('/stats/timeseries', assetController.getStatsTimeSeries);
router.get('/stats/leaderboard/assets', assetController.getAssetLeaderboard);
router.get('/stats/leaderboard/licensees', assetController.getLicenseeLeaderboard);
router.get('/stats/assets-status', assetController.getAssetsStatus);

// Backwards-compatible portfolio stats endpoint (optional)
router.get('/portfolio/:owner/stats', assetController.getPortfolioStats);

module.exports = router;
