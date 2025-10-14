import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import StatCard from '../components/StatCard';
import AssetTable from '../components/AssetTable'; 
import RemixDetailModal from '../components/RemixDetailModal';
import { useSearch } from '../SearchContext'; 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_LIMIT = 20;

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/; // Regex untuk validasi alamat

function ExplorerPage() {
  const {
    results,
    offset,
    totalResults,
    updateSearchState,
    hasSearched,
    currentQuery: currentAddress, 
    currentTokenContract, 
  } = useSearch();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(offset < totalResults); 
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  const [stats, setStats] = useState({ totalRoyalties: 'N/A', totalAssets: '0', overallDisputeStatus: '0' });
  const [royaltyTotalsMap, setRoyaltyTotalsMap] = useState({});


  // Efek untuk mengambil statistik dashboard (REAL)
  useEffect(() => {
    const fetchDashboardStats = async () => {
        const addressForStats = currentAddress || currentTokenContract;

        // 1. Sinkronkan totalAssets dari Context
        setStats(prev => ({ 
            ...prev, 
            totalAssets: totalResults.toLocaleString() 
        }));

        if (!addressForStats) {
            setStats(prev => ({ ...prev, totalRoyalties: 'N/A', overallDisputeStatus: '0' }));
            return;
        }

        try {
            // 2. Panggil endpoint /stats untuk mendapatkan Royalties dan Dispute Status
            const params = new URLSearchParams({ ownerAddress: addressForStats });
            const response = await axios.get(`${API_BASE_URL}/stats?${params.toString()}`);
            
            // 3. UPDATE ADVANCED STATS (Royalties & Dispute Status)
            setStats(prev => ({
                ...prev, 
                totalRoyalties: response.data.totalRoyalties,
                overallDisputeStatus: response.data.overallDisputeStatus
            }));
            // 4. Ambil leaderboard aset (USDT) untuk peta total per aset
            try {
                const lbRes = await axios.get(`${API_BASE_URL}/stats/leaderboard/assets?${params.toString()}&limit=200`);
                const map = {};
                (lbRes.data?.data || []).forEach(row => { map[row.ipId] = row.usdtValue; });
                setRoyaltyTotalsMap(map);
            } catch (e) {
                console.warn('Failed to fetch asset leaderboard totals', e);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard stats:", err);
            // Pada kegagalan, tampilkan 'Error'
            setStats(prev => ({ 
                ...prev, 
                totalRoyalties: 'Error', 
                overallDisputeStatus: 'Error' 
            }));
        }
    };
    fetchDashboardStats();
  }, [currentAddress, currentTokenContract, totalResults, updateSearchState, API_BASE_URL]);


  // Helper untuk melakukan satu panggilan API (tetap sama)
  const fetchAttempt = useCallback(async (ownerAddr, tokenContractAddr, currentOffset) => {
    
    // Membangun Query Parameters
    const params = new URLSearchParams({
        limit: PAGE_LIMIT,
        offset: currentOffset,
    });
    
    if (ownerAddr) {
        params.append('ownerAddress', ownerAddr);
    }
    
    if (tokenContractAddr) {
        params.append('tokenContract', tokenContractAddr);
    }

    // FIX: Tambahkan timeout eksplisit 10 detik
    const response = await axios.get(`${API_BASE_URL}/assets?${params.toString()}`, { timeout: 10000 });
    return response.data; // { data, pagination }
  }, [API_BASE_URL]);

  const handleFetchAssets = useCallback(async (address, newSearch = true) => { 
    const singleInput = address?.trim();
    
    // Validasi Dasar
    if (!singleInput || !ETH_ADDRESS_REGEX.test(singleInput)) {
        setError("Please enter a valid Ethereum wallet address or token contract.");
        return;
    }
    
    // START Loading State
    newSearch ? setIsLoading(true) : setIsLoadingMore(true);
    setError(null);
    updateSearchState({ hasSearched: true });

    let currentOffset = newSearch ? 0 : offset;
    let finalSuccess = false;
    let finalError = null;
    let total = 0;
    let responseData = [];
    
    // --- Pembungkus Try-Finally Global untuk menjamin reset loading ---
    try {
        // Reset Context State untuk pencarian baru
        if (newSearch) {
            updateSearchState({
                results: [],
                offset: 0,
                totalResults: 0,
                currentQuery: singleInput, // Simpan input di Context
                currentTokenContract: null, // Reset contract role
            });
            currentOffset = 0;
        }
        
        // --- 1. PERCOBAAN 1: COBA SEBAGAI OWNER ---
        try {
            console.log(`Attempt 1: Owner=${singleInput}, Contract=NULL`);
            const response1 = await fetchAttempt(singleInput, null, currentOffset); 
            
            if (response1.data.length > 0) {
                finalSuccess = true;
                responseData = response1.data;
                total = response1.pagination?.total || 0;
                updateSearchState({ currentTokenContract: null, currentQuery: singleInput });
            }
        } catch (e) {
            finalError = e;
            console.warn("Attempt 1 (Owner) failed or returned zero assets. Trying fallback logic.", e);
        }
        
        // --- 2. PERCOBAAN 2: FALLBACK SEBAGAI TOKEN CONTRACT ---
        if (!finalSuccess) {
             console.log(`Attempt 2: Fallback Swap (Owner=NULL, Contract=${singleInput}).`);
             try {
                 // Coba menggunakan Input Tunggal sebagai Token Contract
                 const response2 = await fetchAttempt(null, singleInput, currentOffset); 

                 if (response2.data.length > 0) {
                     finalSuccess = true;
                     responseData = response2.data;
                     total = response2.pagination?.total || 0;
                     
                     // PENTING: Jika berhasil di sini, kita set Owner=NULL dan Contract=Input
                     updateSearchState({
                         currentQuery: null, // Owner disetel ke NULL
                         currentTokenContract: singleInput, // Input Utama yang berhasil sebagai Contract
                     });
                 }
             } catch (e) {
                 finalError = e;
                 console.error("Attempt 2 (Fallback Contract) failed.", e);
             }
        }
        
        // --- 3. FINALISASI STATE ---
        const updatedResults = newSearch ? responseData : [...results, ...responseData];
        const newOffset = updatedResults.length;

        if (finalSuccess) {
            updateSearchState({
                results: updatedResults,
                offset: newOffset,
                totalResults: total,
                hasSearched: true,
            });
            setHasMore(newOffset < total); 
        } else if (newSearch) {
            // Final Failure State
            updateSearchState({ results: [], offset: 0, totalResults: 0, hasSearched: true, currentQuery: null, currentTokenContract: null });
            setError(
                finalError?.response?.data?.message || "No assets found. The address is neither an owner nor a token contract, or there is a network issue."
            );
            setHasMore(false);
        }
    } catch (e) {
        // Tangkap error kritis yang mungkin terjadi selama manipulasi state
        setError("Critical error during asset loading.");
        console.error("CRITICAL UNCAUGHT ERROR:", e);
    } finally {
        // GUARANTEE RESET LOADING STATE (Ini adalah kunci perbaikan)
        newSearch ? setIsLoading(false) : setIsLoadingMore(false);
    }
  }, [offset, results, updateSearchState, fetchAttempt]); 
  
  // Logika pemulihan state (self-healing)
  useEffect(() => {
      if (hasSearched && (currentAddress || currentTokenContract) && results.length === 0 && totalResults > 0 && !isLoading) {
          console.log("[EXPLORER] Attempting to recover lost asset list.");
          handleFetchAssets(currentAddress || currentTokenContract, true); 
      }
  }, [hasSearched, currentAddress, currentTokenContract, results.length, totalResults, isLoading, handleFetchAssets]);


  const handleSubmit = (address) => { 
      handleFetchAssets(address, true);
  };
  
  const handleLoadMore = () => {
      const addressToLoad = currentAddress || currentTokenContract;
      if (addressToLoad) {
          handleFetchAssets(addressToLoad, false);
      }
  };
  
  // FIX: Menggunakan find untuk mendapatkan objek aset lengkap
  const handleViewDetails = (ipId) => {
    const asset = results.find(a => a.ipId === ipId);
    setSelectedAsset(asset);
  };

  const handleCloseModal = () => {
    setSelectedAsset(null);
  };


  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-extrabold text-white mb-6">RoyaltyFlow Dashboard</h1>

        {/* Wallet Input Area */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-purple-400">1. Input Creator Address</h2>
            
            <AssetTable.WalletFilterForm
                onFetch={handleSubmit}
                initialOwnerAddress={currentAddress || currentTokenContract}
                isSubmitting={isLoading} 
            />
            
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Header Dashboard Stats */}
        {hasSearched && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard title="Total Royalties Collected" value={stats.totalRoyalties} icon="royalty" />
                <StatCard title="Total IP Assets Found" value={stats.totalAssets.toLocaleString()} icon="asset" /> 
                <StatCard 
                    title="Total Dispute Status" 
                    value={stats.overallDisputeStatus === 'None' ? '0' : stats.overallDisputeStatus} 
                    icon="license" 
                    isWarning={stats.overallDisputeStatus === 'Active'} 
                />
            </div>
        )}
        
        {/* Results Area (Asset Table) */}
        {hasSearched && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2">2. IP Asset Portfolio</h2>

                <AssetTable
                    assets={results}
                    isLoading={isLoading}
                    error={error}
                    onAssetClick={handleViewDetails} // Meneruskan fungsi yang mendapatkan objek aset
                    royaltyTotalsMap={royaltyTotalsMap}
                />
                
                <div className="text-center mt-10">
                    {hasMore && !isLoading && (
                        <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="p-3 px-8 font-bold bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed text-white shadow-md"
                        >
                            {isLoadingMore ? 'Loading More...' : 'Load More Assets'}
                        </button>
                    )}
                </div>
            </div>
        )}
      
        {/* Detail Modal */}
        {selectedAsset && (
            <RemixDetailModal 
                asset={selectedAsset} 
                onClose={handleCloseModal} 
            />
        )}
    </div>
  );
}

export default ExplorerPage;