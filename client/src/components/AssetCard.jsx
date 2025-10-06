import React, { useState, useEffect } from 'react';

const PlaceholderIcon = () => (
    <svg className="w-20 h-20 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-2-8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const AssetCard = ({ asset, onClick, index, isSelected }) => {
  const [isVisible, setIsVisible] = useState(false);
  const imageUrl = asset.mediaUrl;

  useEffect(() => {
    // Memicu animasi dengan sedikit delay berdasarkan index
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 50);

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div 
      onClick={onClick}
      // Tambahkan kelas untuk menandakan aset yang dipilih (visual feedback dasbor)
      className={`bg-gray-800 rounded-lg border-2 border-gray-700 shadow-xl transition-all duration-300 transform cursor-pointer flex flex-col 
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      ${isSelected ? 'border-purple-500 shadow-purple-500/40' : 'hover:shadow-purple-500/20 hover:border-purple-500/50 hover:scale-[1.02]'}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="w-full h-48 flex items-center justify-center bg-gray-700/50 overflow-hidden">
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
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold truncate text-purple-400" title={asset.title}>
          {asset.title || 'Untitled Asset'}
        </h3>
        <p className="text-gray-400 text-sm mt-1 flex-grow line-clamp-3" title={asset.description}>
          {asset.description || 'No description available.'}
        </p>
        <p className="text-gray-500 text-xs mt-2 self-start truncate w-full">
          Media: <span className="uppercase font-semibold text-gray-300">{asset.mediaType || 'Unknown'}</span>
        </p>
        <p className="text-gray-500 text-xs self-start truncate w-full">
          ID: {asset.ipId}
        </p>
      </div>
    </div>
  );
};

export default AssetCard;