import React, { useState, useEffect } from 'react';

const PlaceholderIcon = () => { /* ... kode ikon tidak berubah ... */ };

const AssetCard = ({ asset, onClick, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const imageUrl = asset.mediaUrl;

  useEffect(() => {
    // Memicu animasi dengan sedikit delay berdasarkan index
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 80); // 80ms delay antar kartu

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div 
      onClick={onClick}
      // Tambahkan class untuk transisi dan state awal (opacity-0)
      className={`bg-gray-800 rounded-lg border border-gray-700 shadow-lg hover:shadow-purple-500/20 hover:border-purple-500 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="w-full h-48 flex items-center justify-center bg-gray-700/50 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={asset.title} className="w-full h-full object-cover" />
        ) : (
          <PlaceholderIcon />
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold truncate" title={asset.title}>
          {asset.title || 'Untitled Asset'}
        </h3>
        <p className="text-gray-400 text-sm mt-1 flex-grow clamp-3" title={asset.description}>
          {asset.description || 'No description available.'}
        </p>
        <p className="text-gray-500 text-xs mt-2 self-start truncate w-full">
          ID: {asset.ipId}
        </p>
      </div>
    </div>
  );
};

export default AssetCard;