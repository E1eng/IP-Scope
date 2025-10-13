const express = require('express');
const {
    getAssetDetail,
    getOnChainAnalyticsController,
    getRoyaltyTransactionsController,
    getTopLicenseesController,
    // --- IMPOR CONTROLLER BARU ---
    getGraphLayoutController, 
} = require('../controllers/asset.controller');

const router = express.Router();

router.get('/assets/:id', getAssetDetail);
router.get('/assets/:id/analytics', getOnChainAnalyticsController);
router.get('/assets/:id/royalty-transactions', getRoyaltyTransactionsController);
router.get('/assets/:id/top-licensees', getTopLicenseesController);

// --- ROUTE BARU YANG CEPAT UNTUK STRUKTUR GRAFIK ---
router.get('/graphs/:id/layout', getGraphLayoutController);


module.exports = router;