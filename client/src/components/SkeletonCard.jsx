import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="card bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 rounded-2xl border border-purple-900 shadow-xl overflow-hidden animate-pulse">
      <div className="w-full h-40 bg-gradient-to-tr from-purple-900/30 via-gray-800/60 to-blue-900/30"></div>
      <div className="p-6">
        <div className="w-3/4 h-6 mb-3 bg-gray-800 rounded-full"></div>
        <div className="w-full h-4 mb-2 bg-gray-800 rounded-full"></div>
        <div className="w-5/6 h-4 bg-gray-800 rounded-full"></div>
        <div className="w-1/3 h-4 mt-5 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;