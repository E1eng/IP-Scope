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

    const result = await service.getAssetsByOwner(owner, limit, offset, tokenContract);
    if (result.__degraded) {
      return res.status(202).json({ data: result.data || [], pagination: result.pagination || { total: 0, limit, offset }, degraded: true });
    }
    
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
 * Returns royalty transactions for an asset
 */
const getAssetTransactions = async (req, res) => {
  try {
    const ipId = req.params.ipId;
    const limit = parseInt(req.query.limit) || 20;
    if (!ipId) return res.status(400).json({ message: 'ipId required' });

    try {
      const list = await service.getRoyaltyTransactionsFast(ipId, limit);
      return res.json(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('[CONTROLLER] getAssetTransactions fatal', e);
      return res.json([]);
    }
  } catch (e) {
    console.error('[CONTROLLER] getAssetTransactions error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * GET /api/assets/:ipId/children
 * Returns children assets for an IP asset
 */
const getChildrenAssets = async (req, res) => {
  try {
    const ipId = req.params.ipId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    if (!ipId) return res.status(400).json({ message: 'ipId required' });

    const result = await service.getChildrenAssets(ipId, limit, offset);
    return res.json(result);
  } catch (e) {
    console.error('[CONTROLLER] getChildrenAssets error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

module.exports = {
  searchAssets,
  getAssetDetails,
  getAssetTransactions,
  getChildrenAssets
};
