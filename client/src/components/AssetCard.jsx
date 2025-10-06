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

  // Style yang ditingkatkan
  const baseStyle = `bg-gray-800 rounded-lg border border-gray-700 shadow-md transition-all duration-300 transform cursor-pointer flex flex-col 
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} `;
  
  const stateStyle = isSelected 
      ? 'border-purple-500 ring-2 ring-purple-500/50 scale-[1.01] shadow-lg shadow-purple-500/30' 
      : 'hover:shadow-lg hover:border-purple-500/50 hover:scale-[1.01]';

  return (
    <div 
      onClick={onClick}
      className={baseStyle + stateStyle}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="w-full h-40 flex items-center justify-center bg-gray-700/50 overflow-hidden rounded-t-lg">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={asset.title} 
            className="max-w-full max-h-full object-contain p-2" 
          />
        ) : (
          <PlaceholderIcon />
        )}
      </div>
      <div className="p-3 flex flex-col flex-grow text-sm">
        <h3 className="font-semibold truncate text-purple-400 mb-1" title={asset.title}>
          {asset.title}
        </h3>
        <p className="text-gray-400 text-xs flex-grow line-clamp-3" title={asset.description}>
          {asset.description}
        </p>
        <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-700">
            <p className="text-gray-500 text-xs self-start">
              {asset.mediaType}
            </p>
            <p className="text-gray-500 text-xs self-start">
              ID: {asset.ipId.substring(0, 6)}...
            </p>
        </div>
      </div>
    </div>
  );
};

export default AssetCard;