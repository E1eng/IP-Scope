import React from 'react';
import AssetCard from './AssetCard';
import SkeletonCard from './SkeletonCard'; 

// Komponen baru untuk tampilan Error (ditingkatkan)
const ErrorDisplay = ({ message }) => (
  <div className="col-span-full flex flex-col items-center justify-center p-16 text-center text-red-300 bg-red-900/40 rounded-lg border border-red-700 shadow-xl">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 className="text-xl font-extrabold">CRITICAL ERROR</h3>
    <p className="text-lg mt-2 font-mono break-words max-w-full text-red-200">{message}</p>
    <p className="text-sm mt-4 text-gray-400">Pastikan API Key di server/.env sudah valid dan server backend berjalan.</p>
  </div>
);

// Komponen baru untuk tampilan Kosong (ditingkatkan)
const EmptyDisplay = () => (
  <div className="col-span-full flex flex-col items-center justify-center p-16 text-center text-gray-400 bg-gray-800/60 rounded-lg border border-gray-700 shadow-xl">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 mb-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <h3 className="text-xl font-extrabold">No Assets Found</h3>
    <p className="text-lg mt-2">Try searching with different keywords.</p>
  </div>
);

const ResultsDisplay = ({ isLoading, error, results, hasSearched, onAssetClick, selectedAssetId }) => {
  const renderContent = () => {
    if (isLoading) {
      // Tampilkan 10 skeleton card saat loading
      return Array.from({ length: 10 }).map((_, index) => <SkeletonCard key={index} />);
    }

    if (error) {
      return <ErrorDisplay message={error} />;
    }

    if (hasSearched && results.length === 0) {
      return <EmptyDisplay />;
    }
    
    // Tampilkan AssetCard jika ada hasil
    return results.map((asset, index) => (
      <AssetCard 
        key={asset.ipId}
        asset={asset} 
        index={index} // Kirim index untuk animasi
        onClick={() => onAssetClick(asset)}
        isSelected={selectedAssetId === asset.ipId} // Kirim status terpilih
      />
    ));
  };

  if (!hasSearched && !isLoading) {
    return (
        <div className="text-center text-gray-500 p-16 bg-gray-800/40 rounded-lg border border-gray-700 shadow-md">
            <h3 className="text-2xl font-extrabold text-white mb-2 tracking-wider">Start IP Asset Analysis</h3>
            <p className="text-lg font-light">Enter a query to load and explore the intellectual property assets.</p>
        </div>
    );
  }

  // Compact grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 py-1">
      {renderContent()}
    </div>
  );
};

export default ResultsDisplay;