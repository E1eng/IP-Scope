import React, { useState } from 'react';

// Teks yang ditampilkan bisa huruf besar, tapi nilainya (value) harus huruf kecil.
const MEDIA_TYPES = [
  { value: 'all', display: 'ALL' },
  { value: 'image', display: 'IMAGE' },
  { value: 'video', display: 'VIDEO' },
  { value: 'audio', display: 'AUDIO' },
  // Menambahkan tipe media lain untuk UX
  { value: 'text', display: 'TEXT' }, 
  { value: 'collection', display: 'COLLECTION' },
];

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  // Set nilai default ke 'all' (huruf kecil)
  const [mediaType, setMediaType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return; // Mencegah pencarian kosong
    setIsLoading(true);
    await onSearch(query, mediaType);
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-12">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari aset IP (misalnya: 'Ape', 'Manga', 'Song')"
        className="flex-grow p-4 bg-gray-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all text-white"
        required
      />
      <select
        value={mediaType}
        onChange={(e) => setMediaType(e.target.value)}
        className="p-4 bg-gray-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all appearance-none cursor-pointer"
      >
        {MEDIA_TYPES.map(type => (
          <option key={type.value} value={type.value}>{type.display}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="p-4 px-8 font-extrabold text-white bg-purple-600 rounded-xl shadow-lg hover:bg-purple-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Mencari...' : 'Cari Aset'}
      </button>
    </form>
  );
};

export default SearchBar;