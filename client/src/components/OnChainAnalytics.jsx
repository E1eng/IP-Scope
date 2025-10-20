import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Komponen untuk menampilkan token breakdown di on-chain analytics
const TokenBreakdownCard = ({ analytics }) => {
    const [tokenBreakdown, setTokenBreakdown] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!analytics?.assetMetrics?.royaltyBreakdown) return;
        
        const fetchTokenBreakdown = async () => {
            try {
                setIsLoading(true);
                setTokenBreakdown(analytics.assetMetrics.royaltyBreakdown);
            } catch (error) {
                console.error('Error loading token breakdown:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokenBreakdown();
    }, [analytics?.assetMetrics?.royaltyBreakdown]);

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
// Removed CryptoGuide import

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Helper function untuk format numbers
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

// Helper function untuk format currency
const formatCurrency = (value) => {
  if (!value || value === '0' || value === 0) return '$0.00';
  return `$${parseFloat(value).toFixed(2)}`;
};

// Helper function untuk format percentage
const formatPercentage = (value) => {
  if (!value || value === 0) return '0%';
  return `${parseFloat(value).toFixed(1)}%`;
};

// Helper function untuk format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
};

// Simple metric card component
const MetricCard = ({ title, value, subtitle, icon, color = 'purple' }) => {
  const colorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400'
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};

// Komponen untuk menampilkan transaction history
const TransactionHistory = ({ transactions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        <div className="text-4xl mb-2">📊</div>
        <p>No transaction data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.slice(0, 10).map((tx, index) => (
        <div key={tx.hash || index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-purple-600/50 transition-colors">
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
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span className="truncate max-w-[40%]">
              From: <span className="font-mono">{tx.from ? `${tx.from.substring(0, 6)}...${tx.from.substring(tx.from.length - 4)}` : 'N/A'}</span>
            </span>
            <span className="text-purple-400">
              {tx.gasUsed ? `${formatNumber(tx.gasUsed)} gas` : 'N/A'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Komponen untuk menampilkan gas analytics
const GasAnalytics = ({ gasData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!gasData) {
    return (
      <div className="text-center p-6 text-gray-500">
        <div className="text-4xl mb-2">⛽</div>
        <p>No gas analytics available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Gas Prices */}
      {gasData.currentGasPrices && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-purple-300 mb-3">Current Gas Prices</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400">Slow</div>
              <div className="text-lg font-bold text-red-400">{gasData.currentGasPrices.slow || '0'} Gwei</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Average</div>
              <div className="text-lg font-bold text-yellow-400">{gasData.currentGasPrices.average || '0'} Gwei</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Fast</div>
              <div className="text-lg font-bold text-green-400">{gasData.currentGasPrices.fast || '0'} Gwei</div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Gas Stats */}
      {gasData.assetGasStats && (
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            title="Total Gas Used"
            value={formatNumber(gasData.assetGasStats.totalGasUsed)}
            subtitle={`${formatNumber(gasData.assetGasStats.transactionCount)} transactions`}
            color="blue"
          />
          <MetricCard
            title="Total Gas Cost"
            value={gasData.assetGasStats.totalGasCost}
            subtitle={`Avg: ${formatNumber(gasData.assetGasStats.averageGasUsed)} gas`}
            color="green"
          />
        </div>
      )}
    </div>
  );
};

// Komponen untuk menampilkan contract interactions
const ContractInteractions = ({ interactions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!interactions) {
    return (
      <div className="text-center p-6 text-gray-500">
        <div className="text-4xl mb-2">🔗</div>
        <p>No contract interaction data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Event Types */}
      {interactions.eventsByType && interactions.eventsByType.length > 0 && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-purple-300 mb-3">Event Types</h4>
          <div className="space-y-2">
            {interactions.eventsByType.slice(0, 5).map((eventType, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-300 font-mono">{eventType.type}</span>
                <span className="text-sm text-purple-400 font-bold">{eventType.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Function Calls */}
      {interactions.functionCalls && interactions.functionCalls.mostCalled.length > 0 && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-purple-300 mb-3">Most Called Functions</h4>
          <div className="space-y-2">
            {interactions.functionCalls.mostCalled.slice(0, 5).map((func, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-300 font-mono">{func.method}</span>
                <span className="text-sm text-blue-400 font-bold">{func.count} calls</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen untuk menampilkan performance metrics
const PerformanceMetrics = ({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center p-6 text-gray-500">
        <div className="text-4xl mb-2">📈</div>
        <p>No performance metrics available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Performance Score */}
      {metrics.performanceScore !== undefined && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-purple-300 mb-3">Performance Score</h4>
          <div className="flex items-center space-x-4">
            <div className="text-3xl font-bold text-white">{metrics.performanceScore}/100</div>
            <div className="flex-1">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.performanceScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Royalty Metrics */}
      {metrics.royaltyMetrics && (
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            title="Total Royalties"
            value={metrics.royaltyMetrics.totalRoyalties}
            subtitle={`${formatNumber(metrics.royaltyMetrics.totalLicensees)} licensees`}
            color="green"
          />
          <MetricCard
            title="Avg per Licensee"
            value={metrics.royaltyMetrics.averageRoyaltyPerLicensee}
            subtitle="Average royalty per licensee"
            color="blue"
          />
        </div>
      )}

      {/* Activity Metrics */}
      {metrics.activityMetrics && (
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            title="Recent Transactions"
            value={formatNumber(metrics.activityMetrics.totalTransactions)}
            subtitle={`${metrics.activityMetrics.averageDailyTransactions?.toFixed(1) || '0'} per day`}
            color="yellow"
          />
          <MetricCard
            title="Last Activity"
            value={metrics.activityMetrics.lastActivity ? new Date(metrics.activityMetrics.lastActivity).toLocaleDateString() : 'Never'}
            subtitle="Most recent transaction"
            color="purple"
          />
        </div>
      )}
    </div>
  );
};

// Komponen utama On-Chain Analytics
const OnChainAnalytics = ({ ipId, isOpen }) => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

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
        <h3 className="text-lg font-semibold text-purple-300 flex items-center">
          <span className="mr-2">📊</span>
          On-Chain Analytics
        </h3>
        {analytics && (
          <div className="text-xs text-gray-400">
            Last updated: {formatTimestamp(analytics.timestamp)}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: '📈' },
          { id: 'transactions', label: 'Activity', icon: '💳' },
          { id: 'gas', label: 'Costs', icon: '⛽' },
          { id: 'contracts', label: 'Contracts', icon: '🔗' },
          { id: 'performance', label: 'Performance', icon: '📊' },
          { id: 'tokens', label: 'Tokens', icon: '💰' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeSection === tab.id
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
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-purple-400">Loading analytics data...</p>
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
          <>
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {analytics.transactionHistory && (
                    <MetricCard
                      title="Total Activity"
                      value={formatNumber(analytics.transactionHistory.summary?.totalTransactions || 0)}
                      subtitle={`${analytics.transactionHistory.summary?.successfulTransactions || 0} successful`}
                      icon="💳"
                      color="green"
                    />
                  )}
                  {analytics.gasAnalytics && (
                    <MetricCard
                      title="Total Cost"
                      value={analytics.gasAnalytics.assetGasStats?.totalGasCost || '0 ETH'}
                      subtitle={`${formatNumber(analytics.gasAnalytics.assetGasStats?.transactionCount || 0)} transactions`}
                      icon="⛽"
                      color="blue"
                    />
                  )}
                  {analytics.assetMetrics && (
                    <MetricCard
                      title="Popularity Score"
                      value={`${analytics.assetMetrics.performanceScore || 0}/100`}
                      subtitle="How popular your work is"
                      icon="📊"
                      color="purple"
                    />
                  )}
                  {analytics.contractInteractions && (
                    <MetricCard
                      title="Contract Interactions"
                      value={formatNumber(analytics.contractInteractions.totalEvents || 0)}
                      subtitle={`${analytics.contractInteractions.functionCalls?.total || 0} function calls`}
                      icon="🔗"
                      color="yellow"
                    />
                  )}
                </div>

                {/* Recent Activity */}
                {analytics.transactionHistory && analytics.transactionHistory.transactions && (
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <h4 className="text-sm font-semibold text-purple-300 mb-3">Recent Activity</h4>
                    <TransactionHistory 
                      transactions={analytics.transactionHistory.transactions.slice(0, 5)} 
                      isLoading={false}
                    />
                  </div>
                )}
              </div>
            )}

            {activeSection === 'transactions' && (
              <div className="space-y-4">
                {analytics.transactionHistory && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <MetricCard
                        title="Total Txs"
                        value={formatNumber(analytics.transactionHistory.summary?.totalTransactions || 0)}
                        color="blue"
                      />
                      <MetricCard
                        title="Success Rate"
                        value={analytics.transactionHistory.summary?.totalTransactions > 0 
                          ? `${Math.round((analytics.transactionHistory.summary?.successfulTransactions || 0) / analytics.transactionHistory.summary?.totalTransactions * 100)}%`
                          : '0%'
                        }
                        color="green"
                      />
                      <MetricCard
                        title="Avg Gas Used"
                        value={formatNumber(Math.round(analytics.transactionHistory.summary?.averageGasUsed || 0))}
                        subtitle="per transaction"
                        color="yellow"
                      />
                    </div>
                    <TransactionHistory 
                      transactions={analytics.transactionHistory.transactions} 
                      isLoading={false}
                    />
                  </>
                )}
              </div>
            )}

            {activeSection === 'gas' && (
              <GasAnalytics gasData={analytics.gasAnalytics} isLoading={false} />
            )}

            {activeSection === 'contracts' && (
              <ContractInteractions interactions={analytics.contractInteractions} isLoading={false} />
            )}

            {activeSection === 'performance' && (
              <PerformanceMetrics metrics={analytics.assetMetrics} isLoading={false} />
            )}

            {activeSection === 'tokens' && (
              <TokenBreakdownCard analytics={analytics} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OnChainAnalytics;
