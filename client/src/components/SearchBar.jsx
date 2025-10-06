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

  // Kelas untuk desain elegan/minimalis
  const inputClasses = "flex-grow p-3 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-400 font-light";
  const selectClasses = "w-full sm:w-1/2 p-3 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-pink-400 appearance-none cursor-pointer font-light";
  const buttonClasses = "p-3 px-6 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed shadow-md";

  return (
    // Kontainer pencarian lebih simpel
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8 p-4 bg-gray-800/80 rounded-lg border border-gray-700 shadow-md">
      {/* Input dan Button (Baris 1) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search IP assets..."
          className={inputClasses}
          required
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={buttonClasses}
        >
          {isLoading ? 'Searching...' : 'Search Assets'}
        </button>
      </div>

      {/* Filter dan Sorting (Baris 2) */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Media Type Filter */}
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className={selectClasses}
        >
          {MEDIA_TYPES.map(type => (
            <option key={type.value} value={type.value}>{`Filter: ${type.display}`}</option>
          ))}
        </select>
        
        {/* Sorting Dropdown */}
        <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={selectClasses}
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