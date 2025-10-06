import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import AssetDetailModal from './components/AssetDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_LIMIT = 20;

function App() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0); // State baru untuk menyimpan total hasil
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
      
      // ▼▼▼ LOGIKA 'hasMore' YANG BARU DAN LEBIH ANDAL ▼▼▼
      // Simpan total hasil saat pencarian pertama
      if (newSearch) {
        setTotalResults(total);
      }

      console.log(`PAGINATION_DEBUG: Total Results Available: ${total}, Results Loaded: ${newOffset}, Should show 'Load More'?: ${newOffset < total}`);
      // Tombol 'Load More' akan muncul jika hasil yang ditampilkan belum mencapai total
      setHasMore(newOffset < total);
      
    } catch (err) {
      setError(
        'Failed to fetch assets. Please check backend connection or API key.',
      );
      console.error('API Call Error:', err);
    } finally {
      newSearch ? setIsLoading(false) : setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    handleSearch(currentQuery, currentMediaType, false);
  };

  const handleOpenDetailModal = (asset) => { /* ... */ };
  const handleCloseModal = () => { /* ... */ };

  return (
    // ... JSX tidak berubah sama sekali ...
    <div className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          IP Asset Search
        </h1>
        <p className="text-gray-400 mt-2">
          Discover intellectual property assets on Story Protocol.
        </p>
      </header>

      <main>
        <SearchBar onSearch={(query, mediaType) => handleSearch(query, mediaType, true)} />
        <ResultsDisplay
          isLoading={isLoading}
          error={error}
          results={results}
          hasSearched={hasSearched}
          onAssetClick={handleOpenDetailModal}
        />
        <div className="text-center mt-8">
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
      </main>

      {isModalOpen && selectedAsset && (
        <AssetDetailModal asset={selectedAsset} onClose={handleCloseModal} />
      )}
    </div>
  );
}

export default App;