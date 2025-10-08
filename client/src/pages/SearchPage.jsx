import React, { useState } from 'react';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import ResultsDisplay from '../components/ResultsDisplay';
import AssetDetailModal from '../components/AssetDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_LIMIT = 20;

function SearchPage() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  const [remixTreeData, setRemixTreeData] = useState(null);
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentMediaType, setCurrentMediaType] = useState('all');
  const [currentSortBy, setCurrentSortBy] = useState('default');

  const handleSearch = async (query, mediaType, sortBy, newSearch = true) => {
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
      setCurrentSortBy(sortBy);
      setSelectedAsset(null); 
    }

    try {
      const currentOffset = newSearch ? 0 : offset;
      const params = new URLSearchParams({
        query: query,
        limit: PAGE_LIMIT,
        offset: currentOffset,
        sortBy: sortBy,
      });

      if (mediaType && mediaType !== 'all') {
        params.append('mediaType', mediaType);
      }
      
      const response = await axios.get(`${API_BASE_URL}/search?${params.toString()}`);
      
      const newResults = response.data.data || [];
      const total = response.data.pagination?.total || 0;
      
      const updatedResults = newSearch ? newResults : [...results, ...newResults];
      const newOffset = updatedResults.length;

      setResults(updatedResults);
      setOffset(newOffset);
      
      if (newSearch) {
        setTotalResults(total);
      }
      setHasMore(newOffset < total);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch assets. See console for details.');
      console.error('API Call Error:', err.response ? err.response.data : err.message);
    } finally {
      newSearch ? setIsLoading(false) : setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    handleSearch(currentQuery, currentMediaType, currentSortBy, false);
  };

  const handleOpenModal = (asset) => {
    setSelectedAsset(asset);
    setRemixTreeData(null); 
    setIsTreeLoading(false);
  };
  
  const handleCloseModal = () => {
    setSelectedAsset(null);
  };

  const handleFetchTree = async (ipId) => {
      setIsTreeLoading(true);
      try {
          const response = await axios.get(`${API_BASE_URL}/assets/${ipId}/remix-tree`);
          setRemixTreeData(response.data);
      } catch (error) {
          console.error("Failed to fetch remix tree", error);
          setRemixTreeData({ error: "Failed to load remix tree." });
      } finally {
          setIsTreeLoading(false);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <SearchBar onSearch={handleSearch} />
      
      <div>
        {hasSearched && !isLoading && !error && (
          <div className="sticky top-4 z-10 bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700 mb-6 flex justify-between items-center shadow-lg">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Found</p>
              <p className="text-white text-2xl font-semibold">{totalResults.toLocaleString()}</p>
            </div>
            <p className="text-sm text-gray-400">
              Showing <span className="font-bold text-white">{results.length}</span> assets
            </p>
          </div>
        )}
        <ResultsDisplay
          isLoading={isLoading}
          error={error}
          results={results}
          hasSearched={hasSearched}
          onAssetClick={handleOpenModal}
          selectedAssetId={selectedAsset?.ipId}
        />
        <div className="text-center mt-10">
          {hasMore && !isLoading && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="p-3 px-6 font-bold bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      </div>

      {selectedAsset && (
        <AssetDetailModal 
          asset={selectedAsset} 
          onClose={handleCloseModal}
          onViewTree={handleFetchTree}
          remixTreeData={remixTreeData}
          isTreeLoading={isTreeLoading}
        />
      )}
    </div>
  );
}

export default SearchPage;