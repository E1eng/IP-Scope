import React, { useState } from 'react';

const MEDIA_TYPES = [
  { value: 'all', display: 'ALL' },
  { value: 'image', display: 'IMAGE' },
  { value: 'video', display: 'VIDEO' },
  { value: 'audio', display: 'AUDIO' },
  { value: 'text', display: 'TEXT' }, 
  { value: 'collection', display: 'COLLECTION' },
];

const SORT_OPTIONS = [
    { value: 'default', display: 'Relevance (Default)' },
    { value: 'score_desc', display: 'Score (Highest)' },
    { value: 'score_asc', display: 'Score (Lowest)' },
    { value: 'date_desc', display: 'Date Created (Newest)' },
    { value: 'date_asc', display: 'Date Created (Oldest)' },
];

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    // Kirim query, mediaType, DAN sortBy ke handler
    await onSearch(query, mediaType, sortBy); 
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-12">
      {/* Input dan Button (Baris 1) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari aset IP (misalnya: 'Ape', 'Manga', 'Song')"
          className="flex-grow p-4 bg-gray-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all text-white"
          required
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="p-4 px-8 font-extrabold text-white bg-purple-600 rounded-xl shadow-lg hover:bg-purple-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Mencari...' : 'Cari Aset'}
        </button>
      </div>

      {/* Filter dan Sorting (Baris 2) */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Media Type Filter */}
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="w-full sm:w-1/2 p-4 bg-gray-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-pink-600/50 focus:border-pink-500 transition-all appearance-none cursor-pointer"
        >
          {MEDIA_TYPES.map(type => (
            <option key={type.value} value={type.value}>{`Filter: ${type.display}`}</option>
          ))}
        </select>
        
        {/* Sorting Dropdown */}
        <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-1/2 p-4 bg-gray-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-pink-600/50 focus:border-pink-500 transition-all appearance-none cursor-pointer"
        >
            {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{`Sort: ${option.display}`}</option>
            ))}
        </select>
      </div>
    </form>
  );
};

export default SearchBar;