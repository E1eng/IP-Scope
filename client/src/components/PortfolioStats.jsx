import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Komponen untuk menampilkan token breakdown di portfolio stats
const TokenBreakdownCard = ({ portfolio }) => {
    const [tokenBreakdown, setTokenBreakdown] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!portfolio?.topAssets) return;
        
        const fetchTokenBreakdown = async () => {
            try {
                setIsLoading(true);
                
                // Aggregate token breakdown from all top assets
                const aggregatedTokens = {};
                
                for (const asset of portfolio.topAssets) {
                    if (asset?.analytics?.totalRoyaltiesPaid) {
                        Object.entries(asset.analytics.totalRoyaltiesPaid).forEach(([symbol, data]) => {
                            if (!aggregatedTokens[symbol]) {
                                aggregatedTokens[symbol] = {
                                    total: 0,
                                    count: 0
                                };
                            }
                            aggregatedTokens[symbol].total += parseFloat(data.total || 0);
                            aggregatedTokens[symbol].count += parseInt(data.count || 0);
                        });
                    }
                }
                
                setTokenBreakdown(aggregatedTokens);
            } catch (error) {
                console.error('Error aggregating token breakdown:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokenBreakdown();
    }, [portfolio?.topAssets]);

    if (isLoading) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">💰 Token Breakdown</h3>
                <div className="text-center text-purple-400">Loading token breakdown...</div>
            </div>
        );
    }

    if (!tokenBreakdown || Object.keys(tokenBreakdown).length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">💰 Token Breakdown</h3>
                <div className="text-center text-gray-500">No token breakdown available</div>
            </div>
        );
    }

    const totalValue = Object.values(tokenBreakdown).reduce((sum, token) => sum + parseFloat(token.total || 0), 0);

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-purple-300 mb-3">💰 Token Breakdown</h3>
            <div className="space-y-3">
                {Object.entries(tokenBreakdown).map(([symbol, data]) => {
                    const amount = parseFloat(data.total || 0);
                    const percentage = totalValue > 0 ? (amount / totalValue * 100).toFixed(1) : 0;
                    
                    return (
                        <div key={symbol} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {symbol.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-semibold text-white">{symbol}</div>
                                    <div className="text-xs text-gray-400">
                                        {data.count || 0} transactions
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-white">
                                    {amount.toFixed(6)} {symbol}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {percentage}% of total
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                <div className="pt-3 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-purple-300">Total Value:</span>
                        <span className="font-bold text-white text-lg">
                            {totalValue.toFixed(6)} tokens
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PortfolioStats = ({ ownerAddress }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ownerAddress) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch only dispute analytics
        const disputeResponse = await fetch(`http://localhost:3001/api/analytics/disputes/${ownerAddress}`);
        
        if (!disputeResponse.ok) {
          throw new Error('Failed to fetch portfolio stats');
        }
        
        const disputeData = await disputeResponse.json();
        
        // Use only dispute data
        const combinedStats = {
          disputeMetrics: disputeData.data?.metrics || {}
        };
        setStats(combinedStats);
        setError(null);
      } catch (err) {
        console.error('Error fetching portfolio stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [ownerAddress]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-modern p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-700 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-modern p-6 mb-8">
        <div className="text-red-400 text-center">
          Error loading portfolio stats: {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatCurrency = (value, currency = 'WIP') => {
    if (!value || value === 0) return `0.000000 ${currency}`;
    return `${parseFloat(value).toFixed(6)} ${currency}`;
  };

  const formatNumber = (value) => {
    if (!value || value === 0) return '0';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const statCards = [
    {
      title: 'Total IP Assets',
      value: formatNumber(stats.metrics?.totalAssets || 0),
      icon: '🎨',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'Total Royalty Collected',
      value: formatCurrency(stats.metrics?.totalEarnings || 0, stats.metrics?.currency || 'WIP'),
      icon: '💰',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    {
      title: 'Total Disputes',
      value: formatNumber(stats.disputeMetrics?.totalDisputes || 0),
      icon: '⚠️',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30'
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <span className="mr-3">📊</span>
        Portfolio Statistics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`card-modern p-6 border ${card.borderColor} ${card.bgColor} hover:scale-105 transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {card.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="card-modern p-6 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Top Performing Asset</div>
              <div className="text-lg font-semibold text-white">
                {stats.topAssets?.[0]?.name || 'No data available'}
              </div>
              <div className="text-sm text-green-400">
                {stats.topAssets?.[0] ? 
                  `${formatCurrency(stats.topAssets[0].totalEarnings || 0)} earned` : 
                  'No earnings data'
                }
              </div>
            </div>
            <div className="text-2xl">🏆</div>
          </div>
        </div>

        <div className="card-modern p-6 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Top Licensee</div>
              <div className="text-lg font-semibold text-white">
                {stats.topLicensees?.[0]?.licensee || 'No data available'}
              </div>
              <div className="text-sm text-blue-400">
                {stats.topLicensees?.[0] ? 
                  `${formatCurrency(stats.topLicensees[0].totalPaid || 0)} paid` : 
                  'No payment data'
                }
              </div>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </div>

        <div className="card-modern p-6 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Portfolio Status</div>
              <div className="text-lg font-semibold text-white">
                {stats.metrics?.totalAssets > 0 ? 'Active' : 'Empty'}
              </div>
              <div className="text-sm text-purple-400">
                {stats.metrics?.totalAssets > 0 ? 
                  `${stats.metrics.totalAssets} assets registered` : 
                  'No assets found'
                }
              </div>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
      </div>

      {/* Token Breakdown */}
      <TokenBreakdownCard portfolio={stats} />
    </div>
  );
};

export default PortfolioStats;
