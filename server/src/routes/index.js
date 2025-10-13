const express = require('express');
const {
    getAssetsByOwnerController,
    getAssetDetailsForModalController,
    getRoyaltyTransactionsController,
    getTopLicenseesController,
} = require('../controllers/asset.controller');

const router = express.Router();

// Endpoint utama untuk mengambil semua aset berdasarkan alamat pemilik
router.get('/owner/:address/assets', getAssetsByOwnerController);

// Endpoint untuk mengambil semua data yang dibutuhkan oleh modal/halaman detail
router.get('/assets/:id/details', getAssetDetailsForModalController);

// Endpoint untuk tab di dalam modal
router.get('/assets/:id/royalty-transactions', getRoyaltyTransactionsController);
router.get('/assets/:id/top-licensees', getTopLicenseesController);

module.exports = router;