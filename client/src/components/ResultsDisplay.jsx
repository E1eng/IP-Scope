import React from 'react';
import AssetCard from './AssetCard';
import SkeletonCard from './SkeletonCard'; // Impor komponen baru

// Komponen baru untuk tampilan Error
const ErrorDisplay = ({ message }) => (
  <div className="col-span-full flex flex-col items-center justify-center p-8 text-center text-red-400 bg-red-900/30 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 className="text-xl font-semibold">An Error Occurred</h3>
    <p>{message}</p>
  </div>
);

// Komponen baru untuk tampilan Kosong
const EmptyDisplay = () => (
  <div className="col-span-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <h3 className="text-xl font-semibold">No Assets Found</h3>
    <p>Try searching with a different keyword.</p>
  </div>
);

const ResultsDisplay = ({ isLoading, error, results, hasSearched, onAssetClick }) => {
  const renderContent = () => {
    if (isLoading) {
      // Tampilkan 8 skeleton card saat loading
      return Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />);
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
      />
    ));
  };

  if (!hasSearched && !isLoading) {
    return <div className="text-center text-gray-500">Enter a query to start searching.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {renderContent()}
    </div>
  );
};

export default ResultsDisplay;