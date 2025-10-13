const express = require('express');
const {
    getAssetValueFlowGraph,
    getAssetsBatchController,
    getAssetDetailController,
    getOnChainAnalyticsController,
} = require('../controllers/asset.controller');

const router = express.Router();

// Endpoint utama untuk memulai pembuatan grafik. 
// Hanya mengembalikan root node dan daftar ID dari turunannya.
router.get('/graphs/:id/value-flow', getAssetValueFlowGraph);

// Endpoint untuk mengambil detail dari sekumpulan aset berdasarkan daftar ID.
// Digunakan oleh frontend untuk paginasi.
router.post('/assets/batch', getAssetsBatchController);

// Endpoint untuk mengambil detail lengkap dari SATU aset.
// Digunakan saat pengguna mengklik sebuah node di grafik.
router.get('/assets/:id', getAssetDetailController);

// Endpoint untuk mengambil data analitik dari SATU aset.
// Digunakan saat pengguna mengklik sebuah node di grafik.
router.get('/assets/:id/analytics', getOnChainAnalyticsController);

module.exports = router;