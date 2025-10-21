import React from 'react';

// Base Skeleton Component
const Skeleton = ({ className = '', children, ...props }) => (
  <div 
    className={`loading-skeleton ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Card Skeleton
export const CardSkeleton = ({ className = '' }) => (
  <div className={`bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden w-full ${className}`}>
    {/* Image Skeleton */}
    <div className="aspect-square bg-gray-800 animate-pulse w-full"></div>
    
    {/* Content Skeleton */}
    <div className="p-4 space-y-3 w-full">
      <div className="space-y-2 w-full">
        <Skeleton className="h-4 w-3/4 rounded max-w-full"></Skeleton>
        <Skeleton className="h-3 w-1/2 rounded max-w-full"></Skeleton>
      </div>
      
      <div className="space-y-2 w-full">
        <Skeleton className="h-3 w-full rounded max-w-full"></Skeleton>
        <Skeleton className="h-3 w-2/3 rounded max-w-full"></Skeleton>
      </div>
      
      <div className="flex justify-between items-center pt-2 w-full">
        <Skeleton className="h-4 w-16 rounded"></Skeleton>
        <Skeleton className="h-6 w-20 rounded"></Skeleton>
      </div>
    </div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 6 }) => (
  <tr className="border-b border-gray-800">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="py-4 px-6">
        <Skeleton className="h-4 w-full rounded"></Skeleton>
      </td>
    ))}
  </tr>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 6 }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead className="bg-gray-900/50 sticky top-0 z-10">
        <tr>
          {Array.from({ length: columns }).map((_, index) => (
            <th key={index} className="py-4 px-6">
              <Skeleton className="h-3 w-20 rounded"></Skeleton>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRowSkeleton key={index} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

// Stat Card Skeleton
export const StatCardSkeleton = ({ className = '' }) => (
  <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 ${className}`}>
    <div className="flex items-start justify-between">
      <div className="flex items-center space-x-4">
        <Skeleton className="w-12 h-12 rounded-lg"></Skeleton>
        <div className="space-y-2">
          <Skeleton className="h-6 w-24 rounded"></Skeleton>
          <Skeleton className="h-4 w-16 rounded"></Skeleton>
        </div>
      </div>
      <Skeleton className="h-4 w-4 rounded"></Skeleton>
    </div>
  </div>
);

// Modal Skeleton
export const ModalSkeleton = ({ className = '' }) => (
  <div className={`bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ${className}`}>
    {/* Header Skeleton */}
    <div className="p-6 border-b border-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-lg"></Skeleton>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded"></Skeleton>
            <Skeleton className="h-4 w-32 rounded"></Skeleton>
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded"></Skeleton>
      </div>
    </div>
    
    {/* Content Skeleton */}
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-full rounded"></Skeleton>
        <Skeleton className="h-4 w-3/4 rounded"></Skeleton>
        <Skeleton className="h-4 w-1/2 rounded"></Skeleton>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 w-full rounded-lg"></Skeleton>
        <Skeleton className="h-20 w-full rounded-lg"></Skeleton>
      </div>
    </div>
  </div>
);

// Image Skeleton with Blur-up
export const ImageSkeleton = ({ 
  className = '', 
  aspectRatio = 'aspect-square',
  showBlur = true 
}) => (
  <div className={`relative ${aspectRatio} ${className}`}>
    <Skeleton className="w-full h-full rounded-xl"></Skeleton>
    {showBlur && (
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
    )}
  </div>
);

// Text Skeleton
export const TextSkeleton = ({ 
  lines = 1, 
  className = '',
  lastLineWidth = 'w-3/4' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton 
        key={index}
        className={`h-4 rounded ${index === lines - 1 ? lastLineWidth : 'w-full'}`}
      />
    ))}
  </div>
);

// Button Skeleton
export const ButtonSkeleton = ({ 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32'
  };
  
  return (
    <Skeleton 
      className={`rounded-lg ${sizeClasses[size]} ${className}`}
    />
  );
};

// List Skeleton
export const ListSkeleton = ({ 
  items = 5, 
  className = '',
  showAvatar = false 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3">
        {showAvatar && (
          <Skeleton className="w-10 h-10 rounded-full"></Skeleton>
        )}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded"></Skeleton>
          <Skeleton className="h-3 w-1/2 rounded"></Skeleton>
        </div>
        <Skeleton className="h-6 w-16 rounded-full"></Skeleton>
      </div>
    ))}
  </div>
);

// Chart Skeleton
export const ChartSkeleton = ({ 
  height = 'h-64',
  className = '' 
}) => (
  <div className={`${height} ${className}`}>
    <Skeleton className="w-full h-full rounded-lg"></Skeleton>
  </div>
);

// Staggered Container - doesn't wrap children to preserve grid layout
export const StaggeredSkeleton = ({ 
  children, 
  delay = 50,
  className = '' 
}) => (
  <>
    {React.Children.map(children, (child, index) => 
      React.cloneElement(child, {
        style: { animationDelay: `${index * delay}ms` },
        className: `${child.props.className || ''} animate-stagger ${className}`
      })
    )}
  </>
);

export default Skeleton;
