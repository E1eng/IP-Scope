const express = require('express');
const { 
    getAssetsByOwnerController, 
    getAssetDetailsController,
    getRoyaltyTransactionsController,
    getTopLicenseesController,
    getTransactionDetailController,
    getDashboardStatsController 
} = require('../controllers/asset.controller');

const router = express.Router();

router.get('/assets', getAssetsByOwnerController);

// NEW Route: Endpoint untuk statistik Dashboard
router.get('/stats', getDashboardStatsController);

router.get('/assets/:ipId/details', getAssetDetailsController);
router.get('/assets/:ipId/royalty-transactions', getRoyaltyTransactionsController);
router.get('/assets/:ipId/top-licensees', getTopLicenseesController);
router.get('/transactions/:txHash/detail', getTransactionDetailController);

module.exports = router;