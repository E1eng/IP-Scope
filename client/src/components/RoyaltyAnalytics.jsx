import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper functions
const formatCurrency = (amount, currency = 'USDT') => {
  if (!amount || amount === 0) return '$0.00';
  const num = parseFloat(amount);
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const formatNumber = (num) => {
  if (!num) return '0';
  return parseFloat(num).toLocaleString();
};

const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
};

// Top Performing Assets Component
const TopPerformingAssets = ({ assets, totalRoyalties }) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p>No asset data available for analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-purple-300 mb-4">
        🏆 Top Performing Assets
      </h3>
      <div className="space-y-3">
        {assets.slice(0, 5).map((asset, index) => (
          <div key={asset.ipId} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-white truncate max-w-[200px]">
                    {asset.name || 'Unnamed Asset'}
                  </h4>
                  <p className="text-xs text-gray-400 font-mono">
                    {asset.ipId?.slice(0, 8)}...{asset.ipId?.slice(-8)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-400">
                  {formatCurrency(asset.royaltyEarnings)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatPercentage(asset.royaltyEarnings, totalRoyalties)} of total
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex space-x-4">
                <span className="text-gray-400">
                  Transactions: {formatNumber(asset.transactionCount)}
                </span>
                <span className="text-gray-400">
                  Licensees: {formatNumber(asset.licenseeCount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">
                  Average: {formatCurrency(asset.avgRoyaltyPerTransaction)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Top Licensees Component
const TopLicensees = ({ licensees, totalRoyalties }) => {
  if (!licensees || licensees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">👥</div>
        <p>No licensee data available for analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-purple-300 mb-4">
        💰 Top Licensees
      </h3>
      <div className="space-y-3">
        {licensees.slice(0, 5).map((licensee, index) => (
          <div key={licensee.address} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-white font-mono text-sm">
                    {licensee.address?.slice(0, 8)}...{licensee.address?.slice(-8)}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {formatNumber(licensee.assetCount)} licensed assets
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-400">
                  {formatCurrency(licensee.totalPaid)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatPercentage(licensee.totalPaid, totalRoyalties)} of total
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex space-x-4">
                <span className="text-gray-400">
                  Transactions: {formatNumber(licensee.transactionCount)}
                </span>
                <span className="text-gray-400">
                  Average: {formatCurrency(licensee.avgPaymentPerTransaction)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">
                  Last: {licensee.lastPaymentDate ? new Date(licensee.lastPaymentDate).toLocaleDateString('en-US') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Royalty Trends Component
const RoyaltyTrends = ({ trends }) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📈</div>
        <p>No trend data available to display</p>
      </div>
    );
  }

  const maxAmount = Math.max(...trends.map(t => t.amount));
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-purple-300 mb-4">
        📈 Royalty Revenue Trends (Last 7 Days)
      </h3>
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-end justify-between h-32 space-x-2">
          {trends.map((trend, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className="bg-gradient-to-t from-purple-500 to-blue-500 rounded-t w-full mb-2 transition-all duration-300 hover:from-purple-400 hover:to-blue-400"
                style={{ height: `${(trend.amount / maxAmount) * 100}%` }}
                title={`${trend.date}: ${formatCurrency(trend.amount)}`}
              ></div>
              <div className="text-xs text-gray-400 text-center">
                <div>{trend.date}</div>
                <div className="font-mono text-green-400">{formatCurrency(trend.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Asset Performance Metrics
const AssetPerformanceMetrics = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p>Loading performance metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-purple-300 mb-4">
        📊 Asset Performance Metrics
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-green-400">
            {formatCurrency(metrics.totalEarnings)}
          </div>
          <div className="text-sm text-gray-400">Total Revenue</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-blue-400">
            {formatNumber(metrics.totalAssets)}
          </div>
          <div className="text-sm text-gray-400">Total Assets</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-purple-400">
            {formatCurrency(metrics.avgEarningsPerAsset)}
          </div>
          <div className="text-sm text-gray-400">Average per Asset</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-yellow-400">
            {formatNumber(metrics.totalTransactions)}
          </div>
          <div className="text-sm text-gray-400">Total Transactions</div>
        </div>
      </div>
    </div>
  );
};

// Main Royalty Analytics Component
const RoyaltyAnalytics = ({ ownerAddress, isOpen }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!ownerAddress || !isOpen) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/analytics/royalty/${ownerAddress}`);
        
        if (response.data.success) {
          setAnalytics(response.data.data);
        } else {
          setError(response.data.error || 'Failed to load analytics data');
        }
      } catch (err) {
        console.error('Error fetching royalty analytics:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [ownerAddress, isOpen]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-400">Loading royalty analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <h4 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Data</h4>
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-gray-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-purple-300 flex items-center">
          <span className="mr-2">💰</span>
          Royalty Income Analysis
        </h3>
        <div className="text-xs text-gray-400">
          Last updated: {new Date().toLocaleString('en-US')}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'assets', label: 'Top Assets', icon: '🏆' },
          { id: 'licensees', label: 'Top Licensees', icon: '👥' },
          { id: 'trends', label: 'Revenue Trends', icon: '📈' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <AssetPerformanceMetrics metrics={analytics.metrics} />
        )}

        {activeTab === 'assets' && (
          <TopPerformingAssets 
            assets={analytics.topAssets} 
            totalRoyalties={analytics.metrics?.totalEarnings} 
          />
        )}

        {activeTab === 'licensees' && (
          <TopLicensees 
            licensees={analytics.topLicensees} 
            totalRoyalties={analytics.metrics?.totalEarnings} 
          />
        )}

        {activeTab === 'trends' && (
          <RoyaltyTrends trends={analytics.royaltyTrends} />
        )}
      </div>
    </div>
  );
};

export default RoyaltyAnalytics;
