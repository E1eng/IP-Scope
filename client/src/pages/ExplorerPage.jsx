import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import StatCard from '../components/StatCard';
import AssetTable from '../components/AssetTable'; 
import RemixDetailModal from '../components/RemixDetailModal';
import { useSearch } from '../SearchContext'; 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_LIMIT = 20;

function ExplorerPage() {
  // Menggunakan Context untuk menyimpan state
  const {
    results,
    offset,
    totalResults,
    updateSearchState,
    hasSearched,
    currentQuery: currentAddress, // currentAddress: Alamat terakhir yang dicari
  } = useSearch();

  // State Lokal
  const [walletAddress, setWalletAddress] = useState(currentAddress); // Menggunakan alamat dari Context
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(offset < totalResults); 
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  // Statistik Dashboard (MOCK data)
  const [stats, setStats] = useState({ totalRoyalties: '...', totalAssets: '...', totalLicensees: '...' });


  // Efek untuk mengambil statistik saat pertama kali dimuat
  useEffect(() => {
    // MOCK data untuk statistik dashboard utama
    setStats({
        totalRoyalties: '2.54 ETH',
        totalAssets: 125, 
        totalLicensees: 45 
    });
  }, []);

  const handleFetchAssets = useCallback(async (address, newSearch = true) => {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        setError("Please enter a valid Ethereum wallet address.");
        return;
    }
    
    newSearch ? setIsLoading(true) : setIsLoadingMore(true);
    setError(null);
    updateSearchState({ hasSearched: true });


    let currentOffset = newSearch ? 0 : offset;
    
    if (newSearch) {
      updateSearchState({
          results: [],
          offset: 0,
          totalResults: 0,
          currentQuery: address, // Simpan address di currentQuery
      });
      currentOffset = 0;
    }

    try {
      const params = new URLSearchParams({
        limit: PAGE_LIMIT,
        offset: currentOffset,
      });

      // Mengganti endpoint /search menjadi /owner/:address/assets
      const response = await axios.get(
        `${API_BASE_URL}/owner/${address}/assets?${params.toString()}`,
      );
      
      const newResults = response.data.data || [];
      const total = response.data.pagination?.total || 0;
      
      const updatedResults = newSearch ? newResults : [...results, ...newResults];
      const newOffset = updatedResults.length;

      updateSearchState({
          results: updatedResults,
          offset: newOffset,
          totalResults: total,
      });
      
      setHasMore(newOffset < total);
      
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to fetch assets. Please check API connection.'
      );
      console.error('API Call Error:', err.response ? err.response.data : err.message);
    } finally {
      newSearch ? setIsLoading(false) : setIsLoadingMore(false);
    }
  }, [offset, results, updateSearchState]); 

  // FIX: Efek baru untuk memulihkan hasil dari Context
  useEffect(() => {
      if (hasSearched && currentAddress && results.length === 0 && totalResults > 0 && !isLoading) {
          // Jika Context bilang kita sudah mencari (hasSearched=true) dan ada alamat tersimpan,
          // tetapi hasil asetnya (results) kosong, coba pulihkan data dari server.
          // Ini terjadi ketika user refresh atau navigasi kembali dan Context ter-reset sebagian.
          console.log("[EXPLORER] Attempting to recover lost asset list.");
          handleFetchAssets(currentAddress, true);
      }
  }, [hasSearched, currentAddress, results.length, totalResults, isLoading, handleFetchAssets]);


  const handleSubmit = (e) => {
      e.preventDefault();
      handleFetchAssets(walletAddress, true);
  };
  
  const handleLoadMore = () => {
    handleFetchAssets(currentAddress, false);
  };
  
  const handleViewDetails = (ipId) => {
    const asset = results.find(a => a.ipId === ipId);
    setSelectedAsset(asset);
  };

  const handleCloseModal = () => {
    setSelectedAsset(null);
  };


  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-extrabold text-white mb-6">RoyaltyFlow Dashboard</h1>

        {/* Wallet Input Area */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-purple-400">1. Enter Creator Wallet</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
                <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="e.g., 0x97eD98a46e952a90463b7270a16a9ba9e0bf671E"
                    className="flex-grow p-3 bg-gray-900 border border-purple-800 rounded-lg focus:ring-2 focus:ring-purple-500 text-white placeholder:text-gray-500"
                    required
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="p-3 px-6 font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-700"
                >
                    {isLoading ? 'Loading...' : 'Load Assets'}
                </button>
            </form>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Header Dashboard Stats */}
        {hasSearched && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Total Royalties collected by this wallet (MOCK) */}
                <StatCard title="Total Royalties Collected" value={stats.totalRoyalties} icon="royalty" />
                
                {/* Total Assets owned (REAL DATA) */}
                <StatCard title="Total IP Assets Found" value={totalResults.toLocaleString()} icon="asset" />
                
                {/* Total Unique Licensees (MOCK) */}
                <StatCard title="Total Unique Licensees" value={stats.totalLicensees} icon="license" isWarning={true} />
            </div>
        )}
        
        {/* Results Area (Asset Table) */}
        {hasSearched && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2">2. IP Asset Portfolio</h2>

                <AssetTable
                    assets={results}
                    isLoading={isLoading}
                    error={error}
                    onAssetClick={handleViewDetails}
                />
                
                <div className="text-center mt-10">
                    {hasMore && !isLoading && (
                        <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="p-3 px-8 font-bold bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed text-white shadow-md"
                        >
                            {isLoadingMore ? 'Loading More...' : 'Load More Assets'}
                        </button>
                    )}
                </div>
            </div>
        )}
      
        {/* Detail Modal */}
        {selectedAsset && (
            <RemixDetailModal 
                asset={selectedAsset} 
                onClose={handleCloseModal} 
            />
        )}
    </div>
  );
}

export default ExplorerPage;