// server/src/controllers/asset.controller.js
const service = require('../services/storyProtocol.service.js');

/**
 * GET /api/assets?ownerAddress=&tokenContract=&limit=&offset=
 * Returns { data: [...], pagination: { total, limit, offset } }
 */
const searchAssets = async (req, res) => {
  try {
    const owner = req.query.ownerAddress || null;
    const tokenContract = req.query.tokenContract || null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

    // service.getAssetsByOwner returns { data: [], pagination: {} }
    const result = await service.getAssetsByOwner(owner, limit, offset, tokenContract);
    // Ensure pagination shape
    const pagination = result.pagination || { total: (result.data || []).length, limit, offset };
    return res.json({ data: result.data || [], pagination });
  } catch (e) {
    console.error('[CONTROLLER] searchAssets error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * GET /api/assets/:ipId
 * Returns detail asset with analytics (or 404)
 */
const getAssetDetails = async (req, res) => {
  try {
    const ipId = req.params.ipId;
    if (!ipId) return res.status(400).json({ message: 'ipId required' });

    const asset = await service.getAssetDetails(ipId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    return res.json(asset);
  } catch (e) {
    console.error('[CONTROLLER] getAssetDetails error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * GET /api/assets/:ipId/transactions
 * Returns list of royalty txs: { count, data }
 */
const getAssetTransactions = async (req, res) => {
  try {
    const ipId = req.params.ipId;
    if (!ipId) return res.status(400).json({ message: 'ipId required' });

    const list = await service.getRoyaltyTransactions(ipId);
    return res.json({ count: list.length, data: list });
  } catch (e) {
    console.error('[CONTROLLER] getAssetTransactions error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * GET /api/assets/:ipId/top-licensees
 * Returns top licensees
 */
const getTopLicensees = async (req, res) => {
  try {
    const ipId = req.params.ipId;
    if (!ipId) return res.status(400).json({ message: 'ipId required' });

    const top = await service.getTopLicensees(ipId);
    return res.json({ count: top.length, data: top });
  } catch (e) {
    console.error('[CONTROLLER] getTopLicensees error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * GET /api/stats?ownerAddress=
 * Returns stats object directly: { totalRoyalties, totalAssets, overallDisputeStatus }
 * (Frontend expects response.data.totalRoyalties)
 */
const getStats = async (req, res) => {
  try {
    const owner = req.query.ownerAddress;
    if (!owner) return res.status(400).json({ message: 'ownerAddress query param required' });

    const stats = await service.getPortfolioStats(owner);
    // Return the stats object at root (so frontend: response.data.totalRoyalties works)
    return res.json(stats);
  } catch (e) {
    console.error('[CONTROLLER] getStats error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * Backwards-compatible: GET /api/portfolio/:owner/stats
 */
const getPortfolioStats = async (req, res) => {
  try {
    const owner = req.params.owner;
    if (!owner) return res.status(400).json({ message: 'owner required' });

    const stats = await service.getPortfolioStats(owner);
    return res.json(stats);
  } catch (e) {
    console.error('[CONTROLLER] getPortfolioStats error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

module.exports = {
  searchAssets,
  getAssetDetails,
  getAssetTransactions,
  getTopLicensees,
  getStats,
  getPortfolioStats
};
