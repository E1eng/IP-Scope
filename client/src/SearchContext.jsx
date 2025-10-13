import React, { createContext, useState, useContext, useEffect } from 'react';

// State awal untuk pencarian (semua parameter yang harus dipertahankan)
const initialSearchState = {
    results: [],
    currentQuery: '', // Sekarang menyimpan alamat yang berhasil diidentifikasi (Owner atau Contract)
    offset: 0,
    totalResults: 0,
    hasSearched: false,
    // REMOVED: currentTokenContract
};

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
    const [searchState, setSearchState] = useState(initialSearchState);

    const updateSearchState = (newProps) => {
        setSearchState(prev => ({ ...prev, ...newProps }));
    };

    const resetSearchState = () => {
        setSearchState(initialSearchState);
    };

    return (
        <SearchContext.Provider 
            value={{ 
                ...searchState, 
                updateSearchState,
                resetSearchState
            }}
        >
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => useContext(SearchContext);