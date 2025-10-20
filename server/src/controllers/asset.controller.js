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
    // Soft-fail: if backend degraded due to timeout, return 202 Accepted-like hint
    if (result.__degraded) {
      return res.status(202).json({ data: result.data || [], pagination: result.pagination || { total: 0, limit, offset }, degraded: true });
    }
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
    // Always return array; never 500 so modal doesn't break
    return res.json(Array.isArray(list) ? list : []);
  } catch (e) {
    console.error('[CONTROLLER] getAssetTransactions error', e);
    // Graceful fallback: return empty array for the modal
    return res.json([]);
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
  // Return array directly for frontend compatibility
  return res.json(top);
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
    const fast = req.query.fast === '1';
    if (!owner) return res.status(400).json({ message: 'ownerAddress query param required' });

    // console.log(`[CONTROLLER] getStats - owner: ${owner}, fast: ${fast}`);
    const stats = fast ? await service.getPortfolioStatsFast(owner) : await service.getPortfolioStats(owner);
    // console.log(`[CONTROLLER] getStats - result:`, JSON.stringify(stats, null, 2));
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

/**
 * GET /api/health/check
 * Check API key status and connectivity
 */
const checkApiHealth = async (req, res) => {
  try {
    const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;
    const storyScanApiKey = process.env.STORYSCAN_API_KEY;
    
    if (!storyApiKey) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'STORY_PROTOCOL_API_KEY is not configured',
        apiKeyConfigured: false
      });
    }
    
    // Test API key with a simple request
    try {
      const axios = require('axios');
      const testResponse = await axios.post('https://api.storyapis.com/api/v4/assets', {
        where: { ownerAddress: '0x0000000000000000000000000000000000000000' },
        pagination: { limit: 1, offset: 0 }
      }, {
        headers: {
          'X-Api-Key': storyApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return res.json({
        status: 'healthy',
        message: 'API key is valid and working',
        apiKeyConfigured: true,
        storyScanConfigured: !!storyScanApiKey,
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      const status = apiError.response?.status;
      if (status === 401) {
        return res.status(401).json({
          status: 'error',
          message: 'API key is invalid or expired',
          apiKeyConfigured: true,
          storyScanConfigured: !!storyScanApiKey
        });
      } else if (status === 429) {
        return res.status(429).json({
          status: 'warning',
          message: 'API rate limit exceeded',
          apiKeyConfigured: true,
          storyScanConfigured: !!storyScanApiKey
        });
      } else {
        return res.status(500).json({
          status: 'error',
          message: `API test failed: ${apiError.message}`,
          apiKeyConfigured: true,
          storyScanConfigured: !!storyScanApiKey
        });
      }
    }
  } catch (e) {
    console.error('[CONTROLLER] checkApiHealth error', e);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Health check failed', 
      error: e.message 
    });
  }
};


/**
 * GET /api/stats/leaderboard/assets?ownerAddress=&limit=
 */
const getAssetLeaderboard = async (req, res) => {
  try {
    const owner = req.query.ownerAddress;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    if (!owner) return res.status(400).json({ message: 'ownerAddress query param required' });
    const rows = await service.getAssetLeaderboard(owner, limit);
    return res.json({ count: rows.length, data: rows });
  } catch (e) {
    console.error('[CONTROLLER] getAssetLeaderboard error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * GET /api/stats/leaderboard/licensees?ownerAddress=&limit=
 */
const getLicenseeLeaderboard = async (req, res) => {
  try {
    const owner = req.query.ownerAddress;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    if (!owner) return res.status(400).json({ message: 'ownerAddress query param required' });
    const rows = await service.getPortfolioLicensees(owner, limit);
    return res.json({ count: rows.length, data: rows });
  } catch (e) {
    console.error('[CONTROLLER] getLicenseeLeaderboard error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * GET /api/stats/assets-status?ownerAddress=
 */
const getAssetsStatus = async (req, res) => {
  try {
    const owner = req.query.ownerAddress;
    if (!owner) return res.status(400).json({ message: 'ownerAddress query param required' });
    const result = await service.getAssetsStatusSummary(owner);
    return res.json(result);
  } catch (e) {
    console.error('[CONTROLLER] getAssetsStatus error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * GET /api/assets/count?ownerAddress=&tokenContract=
 * Returns just the count of assets without loading all data
 */
const getAssetCount = async (req, res) => {
  try {
    const owner = req.query.ownerAddress || null;
    const tokenContract = req.query.tokenContract || null;
    
    if (!owner && !tokenContract) {
      return res.status(400).json({ message: 'ownerAddress or tokenContract query param required' });
    }

    const count = await service.getAssetCountOnly(owner, tokenContract);
    return res.json({ count, owner, tokenContract });
  } catch (e) {
    console.error('[CONTROLLER] getAssetCount error', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
};

/**
 * ========================================
 * ANALYTICS CONTROLLERS
 * ========================================
 */

/**
 * GET /api/analytics/asset/:ipId
 * Get comprehensive analytics for a specific IP asset
 */
const getAssetAnalytics = async (req, res) => {
  try {
    const { ipId } = req.params;
    
    if (!ipId) {
      return res.status(400).json({
        success: false,
        message: 'IP ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await service.getAssetAnalytics(ipId);
    
    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to fetch asset analytics',
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('[CONTROLLER] getAssetAnalytics error', e);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/analytics/asset/:ipId/transactions
 * Get transaction history for an IP asset
 */
const getAssetTransactionHistory = async (req, res) => {
  try {
    const { ipId } = req.params;
    
    if (!ipId) {
      return res.status(400).json({
        success: false,
        message: 'IP ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await service.getAssetTransactionHistory(ipId);
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('[CONTROLLER] getAssetTransactionHistory error', e);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/analytics/asset/:ipId/gas
 * Get gas analytics for an IP asset
 */
const getAssetGasAnalytics = async (req, res) => {
  try {
    const { ipId } = req.params;
    
    if (!ipId) {
      return res.status(400).json({
        success: false,
        message: 'IP ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await service.getAssetGasAnalytics(ipId);
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('[CONTROLLER] getAssetGasAnalytics error', e);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/analytics/asset/:ipId/contract-interactions
 * Get contract interactions for an IP asset
 */
const getAssetContractInteractions = async (req, res) => {
  try {
    const { ipId } = req.params;
    
    if (!ipId) {
      return res.status(400).json({
        success: false,
        message: 'IP ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await service.getAssetContractInteractions(ipId);
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('[CONTROLLER] getAssetContractInteractions error', e);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/analytics/asset/:ipId/performance
 * Get performance metrics for an IP asset
 */
const getAssetPerformanceMetrics = async (req, res) => {
  try {
    const { ipId } = req.params;
    
    if (!ipId) {
      return res.status(400).json({
        success: false,
        message: 'IP ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await service.getAssetPerformanceMetrics(ipId);
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('[CONTROLLER] getAssetPerformanceMetrics error', e);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/analytics/network
 * Get comprehensive network analytics
 */
const getNetworkAnalytics = async (req, res) => {
  try {
    const result = await service.getNetworkAnalytics();
    
    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to fetch network analytics',
        timestamp: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('[CONTROLLER] getNetworkAnalytics error', e);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * ========================================
 * ASSET RELATIONSHIPS CONTROLLERS
 * ========================================
 */

/**
 * GET /api/assets/:ipId/relationships
 * Get parent/child relationships for a specific IP asset
 */
const getAssetRelationships = async (req, res) => {
    try {
        const { ipId } = req.params;
        
        if (!ipId) {
            return res.status(400).json({
                success: false,
                error: 'IP ID is required',
                message: 'Please provide a valid IP ID',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`[CONTROLLER] getAssetRelationships called for: ${ipId}`);
        
        const result = await service.getAssetRelationships(ipId);
        
        if (result.success) {
            return res.json({
                success: true,
                data: result.data,
                timestamp: new Date().toISOString()
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error,
                message: 'Failed to fetch asset relationships',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('[CONTROLLER] getAssetRelationships error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};


/**
 * GET /api/assets/:ipId/children?limit=20&offset=0
 * Get children assets for a specific IP ID with pagination
 */
const getChildrenAssets = async (req, res) => {
    try {
        const { ipId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        if (!ipId) {
            return res.status(400).json({
                success: false,
                message: 'IP ID is required',
                timestamp: new Date().toISOString()
            });
        }

        const result = await service.getChildrenAssets(ipId, limit, offset);
        
        return res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[CONTROLLER] getChildrenAssets error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

const getDisputeAnalytics = async (req, res) => {
  try {
    const { ownerAddress } = req.params;
    
    if (!ownerAddress) {
      return res.status(400).json({
        success: false,
        message: 'Owner address is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get assets for the owner
    const assetsResult = await service.getAssetsByOwner(ownerAddress, 100, 0);
    const assets = assetsResult.data || [];

    // Count disputes
    let totalDisputes = 0;
    let activeDisputes = 0;
    let resolvedDisputes = 0;
    let pendingDisputes = 0;

    assets.forEach(asset => {
      if (asset.disputeStatus) {
        totalDisputes++;
        const status = asset.disputeStatus.toLowerCase();
        if (status === 'active') {
          activeDisputes++;
        } else if (status === 'resolved') {
          resolvedDisputes++;
        } else if (status === 'pending') {
          pendingDisputes++;
        }
      }
    });

    const analytics = {
      metrics: {
        totalDisputes,
        activeDisputes,
        resolvedDisputes,
        pendingDisputes,
        totalAssets: assets.length
      },
      disputeBreakdown: {
        active: activeDisputes,
        resolved: resolvedDisputes,
        pending: pendingDisputes,
        none: assets.length - totalDisputes
      }
    };

    return res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CONTROLLER] getDisputeAnalytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dispute analytics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  searchAssets,
  getAssetDetails,
  getAssetTransactions,
  getTopLicensees,
  getStats,
  getPortfolioStats,
  // progress endpoints are added at router level
  getAssetLeaderboard,
  getLicenseeLeaderboard,
  getAssetsStatus,
  getAssetCount,
  checkApiHealth,
  // Analytics controllers
  getAssetAnalytics,
  getAssetTransactionHistory,
  getAssetGasAnalytics,
  getAssetContractInteractions,
  getAssetPerformanceMetrics,
  getNetworkAnalytics,
  getAssetRelationships,
  getChildrenAssets,
  getDisputeAnalytics
};