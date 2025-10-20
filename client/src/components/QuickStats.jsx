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
          {Object.entries(stats.currencyBreakdown)
            .filter(([symbol, amount]) => amount > 0)
            .sort((a, b) => {
              // Prioritize WIP as primary currency, then sort by amount
              if (a[0] === 'WIP' && b[0] !== 'WIP') return -1;
              if (b[0] === 'WIP' && a[0] !== 'WIP') return 1;
              return b[1] - a[1]; // Sort by amount descending
            })
            .map(([symbol, amount], index) => (
              <div key={symbol} className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${symbol === 'WIP' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                <span className="text-yellow-400 font-semibold">
                  {Number(amount).toFixed(6)} {symbol}
                </span>
              </div>
            ))
          }
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">0.000000 WIP</span>
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
        <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">{stat.label}</span>
            <span className="text-2xl">{stat.icon}</span>
          </div>
          <div className={`text-xl font-bold ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickStats;