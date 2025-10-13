const express = require('express');
const { 
    getAssetsByOwnerController, 
    getAssetDetailsController,
    getRoyaltyTransactionsController,
    getTopLicenseesController,
    getTransactionDetailController
} = require('../controllers/asset.controller');

const router = express.Router();

// Route 1: Mendapatkan daftar aset berdasarkan pemilik
router.get('/owner/:address/assets', getAssetsByOwnerController);

// Route 2: Mendapatkan detail aset untuk IP ID tertentu
router.get('/assets/:ipId/details', getAssetDetailsController);

// Route 3: Mendapatkan transaksi royalti untuk IP ID tertentu
router.get('/assets/:ipId/royalty-transactions', getRoyaltyTransactionsController);

// Route 4: Mendapatkan top licensee untuk IP ID tertentu
router.get('/assets/:ipId/top-licensees', getTopLicenseesController);

// Route 5: Mendapatkan detail transaksi spesifik
router.get('/transactions/:txHash/detail', getTransactionDetailController);

module.exports = router;