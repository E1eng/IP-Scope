import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const ErrorState = ({ 
  title = "Something went wrong",
  message = "An unexpected error occurred",
  onRetry,
  retryText = "Try Again",
  icon: Icon = AlertCircle,
  variant = "error",
  className = "",
  showRetry = true
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'network':
        return {
          icon: WifiOff,
          iconColor: 'text-yellow-400',
          iconBg: 'bg-yellow-900/20',
          titleColor: 'text-yellow-100',
          messageColor: 'text-yellow-200'
        };
      case 'notFound':
        return {
          icon: AlertCircle,
          iconColor: 'text-gray-400',
          iconBg: 'bg-gray-800/50',
          titleColor: 'text-gray-100',
          messageColor: 'text-gray-400'
        };
      case 'server':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-400',
          iconBg: 'bg-red-900/20',
          titleColor: 'text-red-100',
          messageColor: 'text-red-200'
        };
      default:
        return {
          icon: AlertCircle,
          iconColor: 'text-red-400',
          iconBg: 'bg-red-900/20',
          titleColor: 'text-gray-100',
          messageColor: 'text-gray-400'
        };
    }
  };

  const styles = getVariantStyles();
  const IconComponent = Icon === AlertCircle ? styles.icon : Icon;

  return (
    <div className={`bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center animate-fade-in ${className}`}>
      <div className="flex flex-col items-center space-y-6">
        {/* Icon */}
        <div className={`w-20 h-20 ${styles.iconBg} rounded-full flex items-center justify-center`}>
          <IconComponent className={`w-10 h-10 ${styles.iconColor}`} />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h3 className={`text-xl font-semibold ${styles.titleColor}`}>
            {title}
          </h3>
          <p className={`${styles.messageColor} font-mono text-sm break-words max-w-md`}>
            {message}
          </p>
        </div>

        {/* Retry Button */}
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{retryText}</span>
          </button>
        )}

        {/* Alternative Actions */}
        {variant === 'network' && (
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm"
            >
              Refresh Page
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Specific Error Components
export const NetworkError = ({ onRetry, className = "" }) => (
  <ErrorState
    title="Connection Lost"
    message="Please check your internet connection and try again"
    variant="network"
    onRetry={onRetry}
    retryText="Retry Connection"
    className={className}
  />
);

export const ServerError = ({ onRetry, className = "" }) => (
  <ErrorState
    title="Server Error"
    message="Our servers are experiencing issues. Please try again in a moment"
    variant="server"
    onRetry={onRetry}
    retryText="Try Again"
    className={className}
  />
);

export const NotFoundError = ({ onRetry, className = "" }) => (
  <ErrorState
    title="Not Found"
    message="The requested resource could not be found"
    variant="notFound"
    onRetry={onRetry}
    retryText="Search Again"
    className={className}
  />
);

export default ErrorState;
