import React, { useState } from 'react';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import ResultsDisplay from '../components/ResultsDisplay';
import AssetDetailPanel from '../components/AssetDetailPanel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_LIMIT = 20;

function SearchPage() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentMediaType, setCurrentMediaType] = useState('all');

  const handleSearch = async (query, mediaType, newSearch = true) => {
    if (!query) return;

    newSearch ? setIsLoading(true) : setIsLoadingMore(true);
    setError(null);
    setHasSearched(true);

    if (newSearch) {
      setResults([]);
      setOffset(0);
      setTotalResults(0);
      setCurrentQuery(query);
      setCurrentMediaType(mediaType);
      setSelectedAsset(null);
    }

    try {
      const currentOffset = newSearch ? 0 : offset;
      const params = new URLSearchParams({
        query: query,
        limit: PAGE_LIMIT,
        offset: currentOffset,
      });

      if (mediaType && mediaType !== 'all') {
        params.append('mediaType', mediaType);
      }

      const response = await axios.get(
        `${API_BASE_URL}/search?${params.toString()}`,
      );
      
      const newResults = response.data.data || [];
      const total = response.data.total || 0;
      
      const updatedResults = newSearch ? newResults : [...results, ...newResults];
      const newOffset = updatedResults.length;

      setResults(updatedResults);
      setOffset(newOffset);
      
      if (newSearch) {
        setTotalResults(total);
      }

      setHasMore(newOffset < total);
      
    } catch (err) {
      setError(
        'Failed to fetch assets. Please check backend connection or API key. See console for details.',
      );
      console.error('API Call Error:', err.response ? err.response.data : err.message);
    } finally {
      newSearch ? setIsLoading(false) : setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    handleSearch(currentQuery, currentMediaType, false);
  };

  const handleOpenDetailPanel = (asset) => {
    setSelectedAsset(asset);
  };
  
  const handleClosePanel = () => {
    setSelectedAsset(null);
  };

  return (
    <div>
        <SearchBar onSearch={(query, mediaType) => handleSearch(query, mediaType, true)} />

        {/* DASHBOARD LAYOUT (2 COLUMNS) */}
        <div className="flex flex-col xl:flex-row gap-8">
            {/* Left Column: Search Results */}
            <div className={`flex-grow ${selectedAsset ? 'xl:w-2/3' : 'xl:w-full'}`}>
                {/* Visualisasi Sederhana: Ringkasan Hasil */}
                {hasSearched && !isLoading && !error && (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-6 flex justify-between items-center">
                        <p className="text-gray-400 font-semibold">
                            Total Hasil Ditemukan: <span className="text-white text-xl">{totalResults.toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-purple-400">
                            Menampilkan {results.length} aset.
                        </p>
                    </div>
                )}

                <ResultsDisplay
                    isLoading={isLoading}
                    error={error}
                    results={results}
                    hasSearched={hasSearched}
                    onAssetClick={handleOpenDetailPanel}
                    selectedAssetId={selectedAsset?.ipId}
                />
                
                <div className="text-center mt-8">
                    {hasMore && !isLoading && (
                        <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="p-3 px-6 font-bold bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                        >
                            {isLoadingMore ? 'Loading More...' : 'Load More'}
                        </button>
                    )}
                </div>
            </div>

            {/* Right Column: Asset Detail Panel */}
            <div className={`xl:w-1/3 transition-all duration-300 ${selectedAsset ? 'opacity-100' : 'opacity-0 xl:h-0'}`}>
                <AssetDetailPanel 
                    asset={selectedAsset} 
                    onClose={handleClosePanel} 
                />
            </div>
        </div>
    </div>
  );
}

export default SearchPage;