const express = require('express');
const { searchAssets, getAssetRemixTree } = require('../controllers/asset.controller'); // Diperbarui

const router = express.Router();

// Route yang sudah ada
router.get('/search', searchAssets);

// Route baru untuk pohon remix
router.get('/assets/:id/remix-tree', getAssetRemixTree);

module.exports = router;