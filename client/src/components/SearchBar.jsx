import React, { useState } from 'react';

const MEDIA_TYPES = [
  { value: 'all', display: 'ALL' },
  { value: 'image', display: 'IMAGE' },
  { value: 'video', display: 'VIDEO' },
  { value: 'audio', display: 'AUDIO' },
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
    // Teruskan sortBy ke fungsi onSearch
    await onSearch(query, mediaType, sortBy); 
    setIsLoading(false);
  };

  // ▼▼▼ PERBAIKAN: Menambahkan `text-white` dan background yang lebih solid ▼▼▼
  const inputClasses = "flex-grow p-3 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 text-white placeholder:text-gray-400";
  const selectClasses = "p-3 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 text-white";
  const buttonClasses = "p-3 px-6 font-bold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-8 p-2 bg-gray-900/50 rounded-xl border border-gray-700">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search IP assets..."
        className={inputClasses}
        required
      />
      <select
        value={mediaType}
        onChange={(e) => setMediaType(e.target.value)}
        className={selectClasses}
      >
        {MEDIA_TYPES.map(type => (
          <option key={type.value} value={type.value}>{type.display}</option>
        ))}
      </select>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className={selectClasses}
      >
        {SORT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.display}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className={buttonClasses}
      >
        {isLoading ? '...' : 'Search'}
      </button>
    </form>
  );
};

export default SearchBar;