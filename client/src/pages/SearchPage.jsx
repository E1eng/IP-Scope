import React, { useState, useMemo } from 'react';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import ResultsDisplay from '../components/ResultsDisplay';
import AssetDetailPanel from '../components/AssetDetailPanel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_LIMIT = 20;

function SearchPage() {
  const [rawResults, setRawResults] = useState([]); // Raw results from API
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
  const [currentSortBy, setCurrentSortBy] = useState('default'); // State baru untuk sorting

  // Fungsi untuk melakukan sorting di client-side
  const sortedResults = useMemo(() => {
    if (currentSortBy === 'default') {
      return rawResults;
    }

    const [field, direction] = currentSortBy.split('_');
    
    // Clone array agar sorting tidak merusak state asli
    const sorted = [...rawResults].sort((a, b) => {
      let aVal, bVal;
      
      if (field === 'score') {
        aVal = a.score || 0;
        bVal = b.score || 0;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (field === 'date') {
        // Menggunakan date created yang sudah ada di asset
        aVal = new Date(a.createdAt).getTime() || 0;
        bVal = new Date(b.createdAt).getTime() || 0;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    return sorted;
  }, [rawResults, currentSortBy]);


  const handleSearch = async (query, mediaType, sortBy, newSearch = true) => {
    if (!query) return;

    newSearch ? setIsLoading(true) : setIsLoadingMore(true);
    setError(null);
    setHasSearched(true);

    if (newSearch) {
      setRawResults([]);
      setOffset(0);
      setTotalResults(0);
      setCurrentQuery(query);
      setCurrentMediaType(mediaType);
      setCurrentSortBy(sortBy); // Set state sorting baru
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
      
      const updatedResults = newSearch ? newResults : [...rawResults, ...newResults];
      const newOffset = updatedResults.length;

      setRawResults(updatedResults);
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
    // Teruskan state sorting saat memuat lebih banyak
    handleSearch(currentQuery, currentMediaType, currentSortBy, false);
  };

  const handleOpenDetailPanel = (asset) => {
    setSelectedAsset(asset);
  };
  
  const handleClosePanel = () => {
    setSelectedAsset(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <SearchBar onSearch={(query, mediaType, sortBy) => handleSearch(query, mediaType, sortBy, true)} />
      <div className="flex flex-col xl:flex-row gap-10">
        {/* Left Column: Search Results */}
        <div className="flex-grow xl:w-full transition-all duration-300"> 
          {/* Sticky Summary */}
          {hasSearched && !isLoading && !error && (
            <div className="sticky top-0 z-30 bg-gradient-to-r from-purple-900/40 via-gray-900/80 to-blue-900/40 p-5 rounded-2xl border border-purple-900 mb-8 flex justify-between items-center shadow-xl">
              <p className="text-purple-300 font-bold text-lg">
                Total Assets Found: <span className="text-white text-2xl">{totalResults.toLocaleString()}</span>
              </p>
              <p className="text-base text-blue-400">
                Showing {sortedResults.length} assets
              </p>
            </div>
          )}
          <ResultsDisplay
            isLoading={isLoading}
            error={error}
            results={sortedResults}
            hasSearched={hasSearched}
            onAssetClick={handleOpenDetailPanel}
            selectedAssetId={selectedAsset?.ipId}
          />
          <div className="text-center mt-10">
            {hasMore && !isLoading && (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="p-4 px-8 font-bold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed shadow-xl text-base"
              >
                {isLoadingMore ? 'Loading More...' : 'Load More'}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Floating Modal: Asset Detail Panel */}
      {selectedAsset && (
        <AssetDetailPanel 
          asset={selectedAsset} 
          onClose={handleClosePanel} 
        />
      )}
    </div>
  );
}

export default SearchPage;