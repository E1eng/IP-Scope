// server/src/routes/index.js
const express = require('express');
const router = express.Router();

const assetController = require('../controllers/asset.controller.js');
const svc = require('../services/storyProtocol.service.js');
const axios = require('axios');
const { isAddress, getAddress } = require('viem');

// Search / list assets used by ExplorerPage
router.get('/assets', assetController.searchAssets);
router.get('/assets/count', assetController.getAssetCount);

// Asset detail endpoints
router.get('/assets/:ipId', assetController.getAssetDetails);
// Aliases for client expectations
router.get('/assets/:ipId/details', assetController.getAssetDetails);
router.get('/assets/:ipId/transactions', assetController.getAssetTransactions);
router.get('/assets/:ipId/royalty-transactions', assetController.getAssetTransactions);
router.get('/assets/:ipId/top-licensees', assetController.getTopLicensees);
router.get('/assets/:ipId/relationships', assetController.getAssetRelationships);
router.get('/assets/:ipId/children', assetController.getChildrenAssets);

// Dashboard stats endpoint used by ExplorerPage
router.get('/stats', assetController.getStats);
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
    const normalizeLower = (addr) => {
      if (!addr) return addr;
      if (/^[xX][0-9a-fA-F]{40}$/.test(addr)) return `0x${addr.slice(1).toLowerCase()}`;
      if (/^[0-9a-fA-F]{40}$/.test(addr)) return `0x${addr.toLowerCase()}`;
      if (/^0x[0-9a-fA-F]{40}$/.test(addr)) return addr.toLowerCase();
      return addr;
    };
    const lower = normalizeLower(address_hash);
    const candidates = [];
    if (lower) candidates.push(lower);
    try {
      if (isAddress(lower)) candidates.push(getAddress(lower));
    } catch {}
    // Try candidates in order
    const headers = { 'X-Api-Key': storyScanApiKey };
    for (const cand of candidates) {
      try {
        const url = `https://www.storyscan.io/api/v2/addresses/${cand}/counters`;
        const resp = await axios.get(url, { headers, timeout: 8000 });
        return res.json(resp.data || {});
      } catch (e) {
        if (e.response?.status && e.response.status !== 422) {
          // non-422: skip to generic handler
          throw e;
        }
        // if 422, try next candidate
      }
    }
    // All attempts failed due to 422; return empty counters gracefully
    return res.json({ transactions_count: '0', gas_usage_count: '0', token_transfers_count: '0', validations_count: '0' });
  } catch (e) {
    console.error('[ROUTE] counters error', e.message);
    const status = e.response?.status || 500;
    return res.status(status).json({ message: 'Failed to fetch counters', error: e.message });
  }
});

// Backwards-compatible portfolio stats endpoint (optional)
router.get('/portfolio/:owner/stats', assetController.getPortfolioStats);

// Health check endpoint
router.get('/health/check', assetController.checkApiHealth);


// ========================================
// ANALYTICS ROUTES
// ========================================

// Comprehensive analytics for a specific IP asset
router.get('/analytics/asset/:ipId', assetController.getAssetAnalytics);

// Individual analytics endpoints for specific data types
router.get('/analytics/asset/:ipId/transactions', assetController.getAssetTransactionHistory);
router.get('/analytics/asset/:ipId/gas', assetController.getAssetGasAnalytics);
router.get('/analytics/asset/:ipId/contract-interactions', assetController.getAssetContractInteractions);
router.get('/analytics/asset/:ipId/performance', assetController.getAssetPerformanceMetrics);

// Network-wide analytics
router.get('/analytics/network', assetController.getNetworkAnalytics);

// Royalty analytics for specific owner
router.get('/analytics/royalty/:ownerAddress', assetController.getRoyaltyAnalytics);

// Dispute analytics for specific owner
router.get('/analytics/disputes/:ownerAddress', assetController.getDisputeAnalytics);

module.exports = router;