import React, { useMemo } from 'react';
import { 
  Palette, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { StatCardSkeleton, StaggeredSkeleton } from './SkeletonComponents';

const QuickStats = ({ ownerAddress, searchResults = [], isLoading = false }) => {

  // Show skeleton loading if loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <StaggeredSkeleton>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </StaggeredSkeleton>
      </div>
    );
  }

  // Hitung stats langsung dari searchResults tanpa fetch tambahan dan tanpa konversi USDT
  const stats = useMemo(() => {
    if (!ownerAddress || !searchResults || searchResults.length === 0) {
      return {
        metrics: {
          totalAssets: 0,
          totalEarnings: 0,
          currency: 'WIP'
        },
        currencyBreakdown: {},
        disputeMetrics: {
          totalDisputes: 0
        }
      };
    }

    try {
      let totalEarningsWip = 0;
      const currencyBreakdown = {};

      // Agregasi dari analytics.totalRoyaltiesPaid tiap asset
      for (const asset of searchResults) {
        const paid = asset?.analytics?.totalRoyaltiesPaid;
        if (!paid) continue;

        Object.entries(paid).forEach(([symbol, value]) => {
          if (!value) return;
          // value bisa berbentuk "0.123456 WIP" atau "0.123456 WIP ($x.xx)"
          const m = String(value).match(/^([\d.]+)\s+([A-Za-z]+)/);
          if (!m) return;
          const amount = parseFloat(m[1] || '0');
          if (!Number.isFinite(amount) || amount <= 0) return;

          const display = symbol === 'ETH' ? 'IP' : symbol;
          currencyBreakdown[display] = (currencyBreakdown[display] || 0) + amount;
        });
      }

      totalEarningsWip = currencyBreakdown.WIP ? Number(currencyBreakdown.WIP.toFixed(6)) : 0;

      // Hitung dispute dari searchResults (asset.disputeStatus)
      let totalDisputes = 0;
      for (const asset of searchResults) {
        const st = (asset?.disputeStatus || '').toLowerCase();
        if (st && st !== 'none' && st !== 'not provided') totalDisputes += 1;
      }

      return {
        metrics: {
          totalAssets: searchResults.length,
          totalEarnings: totalEarningsWip,
          currency: 'WIP'
        },
        currencyBreakdown: currencyBreakdown,
        disputeMetrics: {
          totalDisputes
        }
      };
    } catch (err) {
      console.error('Error calculating stats:', err);
      return {
        metrics: {
          totalAssets: 0,
          totalEarnings: 0,
          currency: 'WIP'
        },
        currencyBreakdown: {},
        disputeMetrics: {
          totalDisputes: 0
        }
      };
    }
  }, [ownerAddress, searchResults]);

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Assets',
      value: (stats.metrics?.totalAssets || 0).toLocaleString(),
      icon: Palette,
      color: 'text-indigo-400',
      trend: null
    },
    {
      label: 'Royalty Earned',
      value: stats.currencyBreakdown && Object.keys(stats.currencyBreakdown).length > 0 ? (
        <div className="space-y-2">
          {(() => {
            const entries = Object.entries(stats.currencyBreakdown)
              .filter(([symbol, amount]) => amount > 0)
              .sort((a, b) => {
                // Prioritize WIP as primary currency, then sort by amount
                if (a[0] === 'WIP' && b[0] !== 'WIP') return -1;
                if (b[0] === 'WIP' && a[0] !== 'WIP') return 1;
                return b[1] - a[1]; // Sort by amount descending
              });
            
            const wipEntry = entries.find(([symbol]) => symbol === 'WIP');
            const otherEntries = entries.filter(([symbol]) => symbol !== 'WIP');
            
            return (
              <>
                {/* Primary currency - large and prominent */}
                {wipEntry && (
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl font-bold text-indigo-400">
                      {Number(wipEntry[1]).toFixed(6)} {wipEntry[0]}
                    </span>
                  </div>
                )}
                
                {/* Secondary currencies - smaller below */}
                {otherEntries.length > 0 && (
                  <div className="space-y-1">
                    {otherEntries.map(([symbol, amount]) => (
                      <div key={symbol} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">
                          {Number(amount).toFixed(4)} {symbol}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <span className="text-3xl font-bold text-gray-400">0.000000 WIP</span>
      ),
      icon: DollarSign,
      color: 'text-indigo-400',
      trend: null
    },
    {
      label: 'Total Disputes',
      value: (stats.disputeMetrics?.totalDisputes || 0).toLocaleString(),
      icon: AlertTriangle,
      color: stats.disputeMetrics?.totalDisputes > 0 ? 'text-red-400' : 'text-green-400',
      trend: stats.disputeMetrics?.totalDisputes > 0 ? 'up' : 'down'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div 
            key={index} 
            className="bg-gray-900/30 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700 transition-smooth"
          >
            {/* Icon in top-left */}
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-gray-800 rounded-lg">
                <IconComponent className="w-5 h-5 text-gray-300" />
              </div>
              
              {/* Trend indicator in top-right */}
              {stat.trend && (
                <div className="flex items-center">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-red-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-400" />
                  )}
                </div>
              )}
            </div>

            {/* Large value */}
            <div className="mb-2">
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </div>

            {/* Small label below */}
            <div className="text-sm text-gray-400">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuickStats;