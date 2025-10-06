import React, { useState } from 'react';

// Teks yang ditampilkan bisa huruf besar, tapi nilainya (value) harus huruf kecil.
// Kita juga hapus opsi yang tidak didukung oleh API.
const MEDIA_TYPES = [
  { value: 'all', display: 'ALL' },
  { value: 'image', display: 'IMAGE' },
  { value: 'video', display: 'VIDEO' },
  { value: 'audio', display: 'AUDIO' },
];

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  // Set nilai default ke 'all' (huruf kecil)
  const [mediaType, setMediaType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSearch(query, mediaType);
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-8">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for IP assets..."
        className="flex-grow p-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        required
      />
      <select
        value={mediaType}
        onChange={(e) => setMediaType(e.target.value)}
        className="p-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {MEDIA_TYPES.map(type => (
          <option key={type.value} value={type.value}>{type.display}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isLoading}
        className="p-3 font-bold bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
};

export default SearchBar;