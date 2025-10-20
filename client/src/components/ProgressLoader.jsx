import React from 'react';

const ProgressLoader = ({ 
  isLoading, 
  progress = 0, 
  current = 0, 
  total = 0, 
  message = "Processing...",
  showDetails = true 
}) => {
  if (!isLoading) return null;

  const percentage = Math.round(progress);
  const successRate = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {message}
          </h3>
          <p className="text-sm text-gray-600">
            Processing royalty transactions...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Details */}
        {showDetails && (
          <div className="space-y-3">
            {/* Success Rate */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Success Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${successRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{successRate}%</span>
              </div>
            </div>

            {/* Transaction Count */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Transactions</span>
              <span className="text-sm font-medium text-gray-900">
                {current.toLocaleString()} / {total.toLocaleString()}
              </span>
            </div>

            {/* Processing Speed */}
            {current > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Speed</span>
                <span className="text-sm font-medium text-gray-900">
                  ~{Math.round(current / (Date.now() / 1000))} tx/s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Estimated Time */}
        {total > 0 && current > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Estimated Time</span>
              <span className="font-medium text-gray-900">
                {Math.round(((total - current) / (current / (Date.now() / 1000))) / 60)} min remaining
              </span>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 This process uses advanced caching and parallel processing for optimal performance
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressLoader;

