import React, { createContext, useState, useContext, useEffect } from 'react';

// State awal untuk pencarian (semua parameter yang harus dipertahankan)
const initialSearchState = {
    results: [],
    currentQuery: '', // Sekarang menyimpan alamat yang berhasil diidentifikasi (Owner atau Contract)
    currentAddress: '',
    currentTokenContract: '',
    offset: 0,
    totalResults: 0,
    hasSearched: false,
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

    const setCurrentAddress = (address) => {
        setSearchState(prev => ({ ...prev, currentAddress: address }));
    };

    const setCurrentTokenContract = (contract) => {
        setSearchState(prev => ({ ...prev, currentTokenContract: contract }));
    };

    return (
        <SearchContext.Provider 
            value={{ 
                ...searchState, 
                updateSearchState,
                resetSearchState,
                setCurrentAddress,
                setCurrentTokenContract
            }}
        >
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => useContext(SearchContext);

// Export SearchContext as default
export default SearchContext;