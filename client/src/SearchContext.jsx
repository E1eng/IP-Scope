import React, { createContext, useState, useContext, useEffect } from 'react';

// State awal untuk pencarian (semua parameter yang harus dipertahankan)
const initialSearchState = {
    results: [],
    currentQuery: '',
    offset: 0,
    totalResults: 0,
    currentMediaType: 'all',
    currentSortBy: 'score_desc',
    hasSearched: false,
};

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
    const [searchState, setSearchState] = useState(initialSearchState);

    // Fungsi untuk mengupdate state pencarian
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