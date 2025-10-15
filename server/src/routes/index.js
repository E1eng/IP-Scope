// server/src/routes/index.js
const express = require('express');
const router = express.Router();

const assetController = require('../controllers/asset.controller.js');
const svc = require('../services/storyProtocol.service.js');
const axios = require('axios');

// Search / list assets used by ExplorerPage
router.get('/assets', assetController.searchAssets);

// Asset detail endpoints
router.get('/assets/:ipId', assetController.getAssetDetails);
// Aliases for client expectations
router.get('/assets/:ipId/details', assetController.getAssetDetails);
router.get('/assets/:ipId/transactions', assetController.getAssetTransactions);
router.get('/assets/:ipId/royalty-transactions', assetController.getAssetTransactions);
router.get('/assets/:ipId/top-licensees', assetController.getTopLicensees);

// Dashboard stats endpoint used by ExplorerPage
router.get('/stats', assetController.getStats);
router.get('/stats/timeseries', assetController.getStatsTimeSeries);
router.get('/stats/leaderboard/assets', assetController.getAssetLeaderboard);
router.get('/stats/leaderboard/licensees', assetController.getLicenseeLeaderboard);
router.get('/stats/assets-status', assetController.getAssetsStatus);

// Streaming/progress endpoints
router.post('/stats/progress/start', async (req, res) => {
  try {
    const owner = req.query.ownerAddress;
    if (!owner) return res.status(400).json({ message: 'ownerAddress query param required' });
    const result = await svc.startPortfolioAggregation(owner);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ message: 'failed to start aggregation', error: e.message });
  }
});

// Optional GET alias for environments that cannot POST easily
router.get('/stats/progress/start', async (req, res) => {
  try {
    const owner = req.query.ownerAddress;
    if (!owner) return res.status(400).json({ message: 'ownerAddress query param required' });
    const result = await svc.startPortfolioAggregation(owner);
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ message: 'failed to start aggregation', error: e.message });
  }
});

router.get('/stats/progress', async (req, res) => {
  try {
    const owner = req.query.ownerAddress;
    if (!owner) return res.status(400).json({ message: 'ownerAddress query param required' });
    const progress = await svc.getProgress(owner);
    return res.json(progress);
  } catch (e) {
    return res.status(500).json({ message: 'failed to read progress', error: e.message });
  }
});

// StoryScan address counters passthrough (rate-limited by StoryScan itself)
router.get('/addresses/:address_hash/counters', async (req, res) => {
  try {
    const { address_hash } = req.params;
    const storyScanApiKey = process.env.STORYSCAN_API_KEY;
    const url = `https://www.storyscan.io/api/v2/addresses/${address_hash}/counters`;
    const resp = await axios.get(url, { headers: { 'X-Api-Key': storyScanApiKey }, timeout: 10000 });
    return res.json(resp.data || {});
  } catch (e) {
    console.error('[ROUTE] counters error', e.message);
    const status = e.response?.status || 500;
    return res.status(status).json({ message: 'Failed to fetch counters', error: e.message });
  }
});

// Backwards-compatible portfolio stats endpoint (optional)
router.get('/portfolio/:owner/stats', assetController.getPortfolioStats);

module.exports = router;
