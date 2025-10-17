import React, { useState, useEffect } from 'react';

const QuickStats = ({ ownerAddress }) => {
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
          throw new Error('Failed to fetch stats');
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
        console.error('Error fetching stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [ownerAddress]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-gray-700 rounded w-16 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
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


  const quickStats = [
    {
      label: 'Total Assets',
      value: formatNumber(stats.metrics?.totalAssets || 0),
      icon: '🎨',
      color: 'text-blue-400'
    },
    {
      label: 'Royalty Earned',
      value: formatCurrency(stats.metrics?.totalEarnings || 0),
      icon: '💰',
      color: 'text-yellow-400'
    },
    {
      label: 'Transactions',
      value: formatNumber(stats.metrics?.totalTransactions || 0),
      icon: '📊',
      color: 'text-green-400'
    },
    {
      label: 'Total Disputes',
      value: formatNumber(stats.disputeMetrics?.totalDisputes || 0),
      icon: '⚠️',
      color: 'text-red-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {quickStats.map((stat, index) => (
        <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{stat.label}</span>
            <span className="text-lg">{stat.icon}</span>
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
