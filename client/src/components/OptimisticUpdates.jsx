import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

// Hook for optimistic updates
export const useOptimisticUpdate = (initialState, updateFn) => {
  const [state, setState] = useState(initialState);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // 'pending', 'success', 'error'

  const optimisticUpdate = async (optimisticData, actualUpdate) => {
    setIsUpdating(true);
    setUpdateStatus('pending');
    
    // Apply optimistic update immediately
    setState(prevState => updateFn(prevState, optimisticData));
    
    try {
      // Perform actual update
      const result = await actualUpdate();
      setState(prevState => updateFn(prevState, result));
      setUpdateStatus('success');
      
      // Clear success status after 2 seconds
      setTimeout(() => setUpdateStatus(null), 2000);
    } catch (error) {
      // Revert optimistic update on error
      setState(initialState);
      setUpdateStatus('error');
      
      // Clear error status after 3 seconds
      setTimeout(() => setUpdateStatus(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  return { state, isUpdating, updateStatus, optimisticUpdate };
};

// Optimistic Button Component
export const OptimisticButton = ({ 
  onClick, 
  children, 
  loadingText = "Processing...",
  successText = "Success!",
  errorText = "Failed",
  className = "",
  disabled = false,
  ...props 
}) => {
  const [status, setStatus] = useState(null); // 'pending', 'success', 'error'
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    setStatus('pending');
    
    try {
      await onClick();
      setStatus('success');
      setTimeout(() => setStatus(null), 2000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading || status === 'pending') {
      return (
        <div className="flex items-center space-x-2">
          <div className="loading-spinner-sm w-4 h-4"></div>
          <span>{loadingText}</span>
        </div>
      );
    }
    
    if (status === 'success') {
      return (
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span>{successText}</span>
        </div>
      );
    }
    
    if (status === 'error') {
      return (
        <div className="flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span>{errorText}</span>
        </div>
      );
    }
    
    return children;
  };

  const getButtonClasses = () => {
    let baseClasses = "px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center";
    
    if (disabled || isLoading) {
      baseClasses += " bg-gray-700 text-gray-400 cursor-not-allowed";
    } else if (status === 'success') {
      baseClasses += " bg-green-600 text-white";
    } else if (status === 'error') {
      baseClasses += " bg-red-600 text-white";
    } else {
      baseClasses += " bg-indigo-600 hover:bg-indigo-700 text-white";
    }
    
    return `${baseClasses} ${className}`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={getButtonClasses()}
      {...props}
    >
      {getButtonContent()}
    </button>
  );
};

// Status Indicator Component
export const StatusIndicator = ({ 
  status, 
  message, 
  className = "" 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/20',
          message: message || 'Processing...'
        };
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-900/20',
          message: message || 'Success!'
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-900/20',
          message: message || 'Error occurred'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <div className={`flex items-center space-x-2 p-3 rounded-lg ${config.bgColor} ${className}`}>
      <IconComponent className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm ${config.color}`}>{config.message}</span>
    </div>
  );
};

// Optimistic Form Component
export const OptimisticForm = ({ 
  onSubmit, 
  children, 
  className = "",
  showStatus = true 
}) => {
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setStatus('pending');
    
    try {
      await onSubmit(e);
      setStatus('success');
      setTimeout(() => setStatus(null), 2000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
      
      {showStatus && status && (
        <div className="mt-4">
          <StatusIndicator status={status} />
        </div>
      )}
    </form>
  );
};

// Optimistic List Component
export const OptimisticList = ({ 
  items, 
  onAdd, 
  onRemove, 
  onUpdate,
  renderItem,
  className = "" 
}) => {
  const [optimisticItems, setOptimisticItems] = useState(items);
  const [pendingOperations, setPendingOperations] = useState(new Set());

  useEffect(() => {
    setOptimisticItems(items);
  }, [items]);

  const addItem = async (itemData) => {
    const tempId = `temp_${Date.now()}`;
    const optimisticItem = { ...itemData, id: tempId, _isOptimistic: true };
    
    setOptimisticItems(prev => [...prev, optimisticItem]);
    setPendingOperations(prev => new Set([...prev, tempId]));
    
    try {
      const result = await onAdd(itemData);
      setOptimisticItems(prev => 
        prev.map(item => 
          item.id === tempId ? { ...result, _isOptimistic: false } : item
        )
      );
    } catch (error) {
      setOptimisticItems(prev => prev.filter(item => item.id !== tempId));
    } finally {
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
    }
  };

  const removeItem = async (id) => {
    const originalItem = optimisticItems.find(item => item.id === id);
    setOptimisticItems(prev => prev.filter(item => item.id !== id));
    setPendingOperations(prev => new Set([...prev, id]));
    
    try {
      await onRemove(id);
    } catch (error) {
      if (originalItem) {
        setOptimisticItems(prev => [...prev, originalItem]);
      }
    } finally {
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const updateItem = async (id, updates) => {
    const originalItem = optimisticItems.find(item => item.id === id);
    setOptimisticItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates, _isOptimistic: true } : item
      )
    );
    setPendingOperations(prev => new Set([...prev, id]));
    
    try {
      const result = await onUpdate(id, updates);
      setOptimisticItems(prev => 
        prev.map(item => 
          item.id === id ? { ...result, _isOptimistic: false } : item
        )
      );
    } catch (error) {
      if (originalItem) {
        setOptimisticItems(prev => 
          prev.map(item => 
            item.id === id ? originalItem : item
          )
        );
      }
    } finally {
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return (
    <div className={className}>
      {optimisticItems.map((item, index) => (
        <div key={item.id} className="relative">
          {renderItem(item, index, {
            addItem,
            removeItem,
            updateItem,
            isPending: pendingOperations.has(item.id),
            isOptimistic: item._isOptimistic
          })}
          
          {pendingOperations.has(item.id) && (
            <div className="absolute top-2 right-2">
              <div className="loading-spinner-sm w-4 h-4"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default {
  useOptimisticUpdate,
  OptimisticButton,
  StatusIndicator,
  OptimisticForm,
  OptimisticList
};
