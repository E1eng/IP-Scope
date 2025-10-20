// server/src/routes/index.js
const express = require('express');
const assetController = require('../controllers/asset.controller.js');

const router = express.Router();

// Asset routes
router.get('/assets', assetController.searchAssets);
router.get('/assets/:ipId', assetController.getAssetDetails);
router.get('/assets/:ipId/transactions', assetController.getAssetTransactions);
router.get('/assets/:ipId/children', assetController.getChildrenAssets);

module.exports = router;
