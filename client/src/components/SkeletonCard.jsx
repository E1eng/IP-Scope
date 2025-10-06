import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden">
      <div className="w-full h-48 bg-gray-700 animate-pulse"></div>
      <div className="p-4">
        <div className="w-3/4 h-6 mb-2 bg-gray-700 rounded animate-pulse"></div>
        <div className="w-full h-4 mb-1 bg-gray-700 rounded animate-pulse"></div>
        <div className="w-5/6 h-4 bg-gray-700 rounded animate-pulse"></div>
        <div className="w-1/3 h-4 mt-4 bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;