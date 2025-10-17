import React, { useState, useEffect } from 'react';

const PortfolioStats = ({ ownerAddress }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ownerAddress) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch both royalty and dispute analytics
        const [royaltyResponse, disputeResponse] = await Promise.all([
          fetch(`http://localhost:3001/api/analytics/royalty/${ownerAddress}`),
          fetch(`http://localhost:3001/api/analytics/disputes/${ownerAddress}`)
        ]);
        
        if (!royaltyResponse.ok || !disputeResponse.ok) {
          throw new Error('Failed to fetch portfolio stats');
        }
        
        const royaltyData = await royaltyResponse.json();
        const disputeData = await disputeResponse.json();
        
        // Combine the data
        const combinedStats = {
          ...royaltyData.data,
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

  const formatCurrency = (value) => {
    if (!value || value === 0) return '$0.00';
    return `$${parseFloat(value).toFixed(2)}`;
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
      value: formatCurrency(stats.metrics?.totalEarnings || 0),
      icon: '💰',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    {
      title: 'Total Transactions',
      value: formatNumber(stats.metrics?.totalTransactions || 0),
      icon: '📊',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
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
    </div>
  );
};

export default PortfolioStats;
