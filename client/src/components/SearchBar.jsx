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
    await onSearch(query, mediaType, sortBy); 
    setIsLoading(false);
  };

  // Compact style
  const inputClasses = "flex-grow p-2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-purple-900 rounded-lg focus:ring-2 focus:ring-purple-400 font-light text-white placeholder:text-gray-400 shadow-md text-sm";
  const selectClasses = "w-32 p-2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-purple-900 rounded-lg focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer font-light text-white shadow-md text-xs";
  const buttonClasses = "p-2 px-4 font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed shadow-md text-sm";

  return (
    // Compact analytic search bar
    <form onSubmit={handleSubmit} className="flex flex-row gap-2 mb-4 p-2 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 rounded-xl border border-purple-900 shadow-md animate-fade-in items-center">
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