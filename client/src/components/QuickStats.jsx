import React, { useMemo } from 'react';

const QuickStats = ({ ownerAddress, searchResults = [] }) => {

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
      value: stats.metrics?.totalAssets || 0,
      icon: '🎨',
      color: 'text-blue-400'
    },
    {
      label: 'Royalty Earned',
      value: stats.currencyBreakdown && Object.keys(stats.currencyBreakdown).length > 0 ? (
        <div className="space-y-1">
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
                {/* WIP as primary - large and prominent */}
                {wipEntry && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span className="text-yellow-400 font-bold text-lg">
                      {Number(wipEntry[1]).toFixed(6)} {wipEntry[0]}
                    </span>
                  </div>
                )}
                
                {/* Other currencies - smaller and secondary */}
                {otherEntries.length > 0 && (
                  <div className="space-y-0.5 ml-5">
                    {otherEntries.map(([symbol, amount]) => (
                      <div key={symbol} className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                        <span className="text-gray-300 text-sm">
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
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-lg font-bold">0.000000 WIP</span>
        </div>
      ),
      icon: '💰',
      color: 'text-yellow-400'
    },
    {
      label: 'Total Disputes',
      value: stats.disputeMetrics?.totalDisputes || 0,
      icon: '⚠️',
      color: 'text-red-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div key={index} className="card-futuristic card-futuristic-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="text-futuristic-secondary text-sm font-medium">{stat.label}</span>
            </div>
            <span className="text-2xl">{stat.icon}</span>
          </div>
          <div className={`text-2xl font-bold text-futuristic`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickStats;