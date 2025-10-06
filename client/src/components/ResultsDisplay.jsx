import React from 'react';
import AssetCard from './AssetCard';
import SkeletonCard from './SkeletonCard'; // Impor komponen baru

// Komponen baru untuk tampilan Error (ditingkatkan)
const ErrorDisplay = ({ message }) => (
  <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-red-300 bg-red-900/30 rounded-xl border border-red-700/50">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 className="text-xl font-semibold">Terjadi Kesalahan</h3>
    <p className="text-lg">{message}</p>
    <p className="text-sm mt-2 text-gray-400">Pastikan backend server dan API key sudah terkonfigurasi dengan benar.</p>
  </div>
);

// Komponen baru untuk tampilan Kosong (ditingkatkan)
const EmptyDisplay = () => (
  <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-gray-400 bg-gray-800/50 rounded-xl border border-gray-700/50">
    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <h3 className="text-xl font-semibold">Aset Tidak Ditemukan</h3>
    <p className="text-lg">Coba cari dengan kata kunci yang berbeda atau tipe media lain.</p>
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
        <div className="text-center text-gray-500 p-12 bg-gray-800/30 rounded-xl">
            <h3 className="text-2xl font-semibold text-white mb-2">Mulai Analisis Aset</h3>
            <p>Masukkan kueri pencarian di atas untuk memuat daftar aset IP. Pilih aset untuk melihat detailnya di panel samping.</p>
        </div>
    );
  }

  // Mengubah grid layout menjadi 5 kolom di layar ekstra besar
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {renderContent()}
    </div>
  );
};

export default ResultsDisplay;