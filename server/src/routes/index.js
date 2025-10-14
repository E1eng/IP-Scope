// server/src/routes/index.js
const express = require('express');
const router = express.Router();

const assetController = require('../controllers/asset.controller.js');

// Search / list assets used by ExplorerPage
router.get('/assets', assetController.searchAssets);

// Asset detail endpoints
router.get('/assets/:ipId', assetController.getAssetDetails);
router.get('/assets/:ipId/transactions', assetController.getAssetTransactions);
router.get('/assets/:ipId/top-licensees', assetController.getTopLicensees);

// Dashboard stats endpoint used by ExplorerPage
router.get('/stats', assetController.getStats);

// Backwards-compatible portfolio stats endpoint (optional)
router.get('/portfolio/:owner/stats', assetController.getPortfolioStats);

module.exports = router;
