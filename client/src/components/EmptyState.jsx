import React from 'react';
import { 
  Search, 
  FileText, 
  Image, 
  BarChart3, 
  Zap, 
  Plus,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

const EmptyState = ({ 
  title,
  message,
  icon: Icon = FileText,
  action,
  actionText = "Get Started",
  secondaryAction,
  secondaryActionText = "Learn More",
  className = "",
  illustration
}) => {
  return (
    <div className={`bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center animate-fade-in ${className}`}>
      <div className="flex flex-col items-center space-y-6">
        {/* Illustration or Icon */}
        {illustration ? (
          <div className="w-32 h-32 flex items-center justify-center">
            {illustration}
          </div>
        ) : (
          <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center">
            <Icon className="w-10 h-10 text-gray-400" />
          </div>
        )}

        {/* Content */}
        <div className="space-y-3 max-w-md">
          <h3 className="text-xl font-semibold text-gray-100">
            {title}
          </h3>
          <p className="text-gray-400 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button
              onClick={action}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          
          {secondaryAction && (
            <button
              onClick={secondaryAction}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{secondaryActionText}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Specific Empty State Components
export const NoAssetsFound = ({ onSearch, className = "" }) => (
  <EmptyState
    title="No Assets Found"
    message="No IP assets found for the specified address. Try searching with a different wallet or token contract."
    icon={Search}
    action={onSearch}
    actionText="Try Another Search"
    className={className}
  />
);

export const NoRoyaltyData = ({ onRefresh, className = "" }) => (
  <EmptyState
    title="No Royalty Data"
    message="This asset doesn't have any royalty transactions yet. Royalty data will appear here once transactions are made."
    icon={BarChart3}
    action={onRefresh}
    actionText="Refresh Data"
    className={className}
  />
);

export const NoDerivatives = ({ className = "" }) => (
  <EmptyState
    title="No Derivative Works"
    message="This asset doesn't have any derivative works yet. Derivative works will appear here once they are created."
    icon={Zap}
    className={className}
  />
);

export const NoTransactions = ({ className = "" }) => (
  <EmptyState
    title="No Transactions"
    message="No transactions found for this asset. Transaction history will appear here once activity occurs."
    icon={FileText}
    className={className}
  />
);

export const NoImages = ({ className = "" }) => (
  <EmptyState
    title="No Images Available"
    message="This asset doesn't have any images associated with it."
    icon={Image}
    className={className}
  />
);

// Custom Illustration Component
export const CustomIllustration = ({ children, className = "" }) => (
  <div className={`w-32 h-32 flex items-center justify-center ${className}`}>
    {children}
  </div>
);

export default EmptyState;
