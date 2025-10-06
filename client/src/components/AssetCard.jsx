import React, { useState, useEffect } from 'react';

const PlaceholderIcon = () => (
    <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-2-8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const AssetCard = ({ asset, onClick, index, isSelected }) => {
  const [isVisible, setIsVisible] = useState(false);
  const imageUrl = asset.mediaUrl;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 40); // Animasi lebih cepat

    return () => clearTimeout(timer);
  }, [index]);

  // Spacious, modern style matching SkeletonCard
  const baseStyle = `card bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 rounded-2xl border border-purple-900 shadow-xl overflow-hidden transition-all duration-300 transform cursor-pointer flex flex-col min-h-[240px] 
    ${isVisible ? 'opacity-100 translate-y-0 animate-fade-in' : 'opacity-0 translate-y-4'} `;
  const stateStyle = isSelected 
    ? 'border-purple-500 ring-2 ring-purple-500/60 scale-[1.01] shadow-purple-700/30 shadow-lg z-10' 
    : 'hover:shadow-lg hover:border-purple-500/60 hover:scale-[1.01] hover:z-10';

  return (
    <div 
      onClick={onClick}
      className={baseStyle + stateStyle}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="w-full h-40 bg-gradient-to-tr from-purple-900/30 via-gray-800/60 to-blue-900/30 flex items-center justify-center">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={asset.title} 
            className="max-w-full max-h-full object-contain p-2 drop-shadow" 
          />
        ) : (
          <PlaceholderIcon />
        )}
      </div>
      <div className="p-6 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <h3 className="font-bold truncate text-purple-300 text-lg flex-grow" title={asset.title}>{asset.title}</h3>
          <span className="text-blue-400 text-sm font-semibold bg-blue-900/30 px-3 py-1 rounded-lg">{asset.mediaType}</span>
          <span className="text-purple-400 text-sm font-semibold bg-purple-900/30 px-3 py-1 rounded-lg">{asset.ipId.substring(0, 6)}...</span>
        </div>
        <p className="text-gray-400 text-sm line-clamp-2 font-light" title={asset.description}>{asset.description}</p>
      </div>
    </div>
  );
};

export default AssetCard;