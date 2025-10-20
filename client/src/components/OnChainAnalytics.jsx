import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function untuk format numbers
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

// Helper function untuk format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
};

// On-Chain Analytics - Simplified Version
const OnChainAnalytics = ({ ipId, isOpen }) => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ipId || !isOpen) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/analytics/asset/${ipId}`);
        
        if (response.data.success) {
          setAnalytics(response.data.data);
        } else {
          setError(response.data.error || 'Failed to fetch analytics');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [ipId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-indigo-400 flex items-center">
          <span className="mr-2">📊</span>
          On-Chain Analytics
        </h3>
        {analytics && (
          <div className="text-xs text-gray-400">
            Last updated: {formatTimestamp(analytics.timestamp)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-indigo-400">Loading analytics data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center p-8 bg-red-900/20 border border-red-700/50 rounded-lg">
            <div className="text-4xl mb-2">⚠️</div>
            <h4 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Data</h4>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {analytics && !isLoading && !error && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Total Transactions</span>
                  <span className="text-lg">💳</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {formatNumber(analytics.transactionHistory?.summary?.totalTransactions || 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {analytics.transactionHistory?.summary?.successfulTransactions || 0} successful
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Performance Score</span>
                  <span className="text-lg">📊</span>
                </div>
                <div className="text-2xl font-bold text-indigo-400">
                  {analytics.assetMetrics?.performanceScore || 0}/100
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Asset popularity
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {analytics.transactionHistory?.transactions && (
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <h4 className="text-sm font-semibold text-indigo-400 mb-3">Recent Activity</h4>
                <div className="space-y-3">
                  {analytics.transactionHistory.transactions.slice(0, 5).map((tx, index) => (
                    <div key={tx.hash || index} className="p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono text-green-400 truncate">
                            {tx.hash ? `${tx.hash.substring(0, 8)}...${tx.hash.substring(tx.hash.length - 8)}` : 'Unknown Hash'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Block #{formatNumber(tx.blockNumber)} • {formatTimestamp(tx.timestamp)}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            tx.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {tx.status || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnChainAnalytics;
