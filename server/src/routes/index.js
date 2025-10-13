const express = require('express');
const { getAssetsByOwnerController } = require('../controllers/asset.controller');

const router = express.Router();

// Ini adalah satu-satunya endpoint yang kita miliki sekarang.
router.get('/owner/:address/assets', getAssetsByOwnerController);

module.exports = router;