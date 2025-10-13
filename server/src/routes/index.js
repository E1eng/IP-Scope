const express = require('express');
const {
    getAssetDetail,
    getOnChainAnalyticsController,
    getRoyaltyTransactionsController,
    getTopLicenseesController,
    getAssetChildrenController,
} = require('../controllers/asset.controller');

const router = express.Router();

router.get('/assets/:id', getAssetDetail);
router.get('/assets/:id/analytics', getOnChainAnalyticsController);
router.get('/assets/:id/royalty-transactions', getRoyaltyTransactionsController);
router.get('/assets/:id/top-licensees', getTopLicenseesController);

// Endpoint baru untuk ekspansi grafik dinamis
router.get('/assets/:id/children', getAssetChildrenController);

module.exports = router;