import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [statsLoading, setStatsLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [royaltyTotalsMap, setRoyaltyTotalsMap] = useState({});
  const [counters, setCounters] = useState(null);
  const [progress, setProgress] = useState({ running: false, percent: 0, displayPartial: '$0.00 USDT' });
  const [supportsProgress, setSupportsProgress] = useState(true);
  const hasFinalizedRef = useRef(false);
  const [disputeAlert, setDisputeAlert] = useState({ visible: false, activeCount: 0 });
  const lastActiveCountRef = useRef(0);


  // Efek untuk mengambil statistik dashboard (REAL)
  const progressIntervalRef = useRef(null);
  const lastRequestedAddressRef = useRef(null);
  const assetsAbortRef = useRef(null);
  const isFetchingAssetsRef = useRef(false);

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
            setStatsLoading(true);
            setSupportsProgress(true);
            hasFinalizedRef.current = false;
            const params = new URLSearchParams({ ownerAddress: addressForStats });
            // reset progress state and clear any prior polling
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            lastRequestedAddressRef.current = addressForStats;
            setProgress({ running: false, percent: 0, displayPartial: '$0.00 USDT' });

            // Helper: finalize fetch when progress endpoints unsupported
            const finalizeNow = async () => {
              if (hasFinalizedRef.current) return;
              hasFinalizedRef.current = true;
              try {
                if (lastRequestedAddressRef.current !== addressForStats) return; // stale
                const response = await axios.get(`${API_BASE_URL}/stats?${params.toString()}`);
                setStats(prev => ({
                  ...prev,
                  totalRoyalties: response.data.displayTotal || response.data.totalRoyalties,
                  overallDisputeStatus: response.data.overallDisputeStatus,
                  breakdownByToken: response.data.breakdownByToken || []
                }));
                try {
                  setLeaderboardLoading(true);
                  const lbRes = await axios.get(`${API_BASE_URL}/stats/leaderboard/assets?${params.toString()}&limit=500`);
                  const map = {};
                  const rows = lbRes.data?.data || lbRes.data || [];
                  rows.forEach(row => { if (row?.ipId) map[row.ipId] = row.usdtValue; });
                  setRoyaltyTotalsMap(map);
                } finally {
                  setLeaderboardLoading(false);
                }
              } finally {
                setStatsLoading(false);
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
                // Mark progress as completed to hide progress bar
                setProgress({ running: false, percent: 100, displayPartial: '$0.00 USDT' });
              }
            };

            // Try to start async aggregation (if supported by backend)
            let canUseProgress = true;
            try {
              await axios.post(`${API_BASE_URL}/stats/progress/start?${params.toString()}`);
            } catch (e) {
              if (e?.response?.status === 404) {
                canUseProgress = false;
                setSupportsProgress(false);
                await finalizeNow();
              }
            }

            if (canUseProgress) {
              // Poll progress
              const poll = async () => {
                try {
                  const prog = await axios.get(`${API_BASE_URL}/stats/progress?${params.toString()}`);
                  if (lastRequestedAddressRef.current !== addressForStats) return; // ignore stale
                  setProgress(prog.data || { running: false, percent: 0, displayPartial: '$0.00 USDT' });
                } catch (e) {
                  if (e?.response?.status === 404) {
                    setSupportsProgress(false);
                    if (progressIntervalRef.current) {
                      clearInterval(progressIntervalRef.current);
                      progressIntervalRef.current = null;
                    }
                    await finalizeNow();
                  }
                }
              };
              await poll();
              progressIntervalRef.current = setInterval(poll, 1500);
            }

            // Fetch counters early (non-blocking)
            if (currentAddress) {
              try {
                const countersResp = await axios.get(`${API_BASE_URL}/addresses/${currentAddress}/counters`);
                setCounters(countersResp.data || null);
              } catch (e) {
                setCounters(null);
              }
            } else {
              setCounters(null);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard stats:", err);
            // Pada kegagalan, tampilkan 'Error'
            setStats(prev => ({ 
                ...prev, 
                totalRoyalties: 'Error', 
                overallDisputeStatus: 'Error' 
            }));
        } finally {
            setStatsLoading(false);
        }
    };
    fetchDashboardStats();
    // cleanup on deps change/unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [currentAddress, currentTokenContract, totalResults, updateSearchState, API_BASE_URL]);

  // Finalize when progress done
  useEffect(() => {
    const addressForStats = currentAddress || currentTokenContract;
    if (!addressForStats) return;
    const params = new URLSearchParams({ ownerAddress: addressForStats });
    const shouldFinalize = supportsProgress && ((!progress.running && progress.percent >= 100) || progress.percent === 100);
    if (!shouldFinalize) return;
    const finalize = async () => {
      try {
        setStatsLoading(true);
        if (lastRequestedAddressRef.current !== addressForStats) return; // stale
        const response = await axios.get(`${API_BASE_URL}/stats?${params.toString()}`);
        setStats(prev => ({
          ...prev,
          totalRoyalties: response.data.displayTotal || response.data.totalRoyalties,
          overallDisputeStatus: response.data.overallDisputeStatus,
          breakdownByToken: response.data.breakdownByToken || []
        }));
        // leaderboard after stats
        try {
          setLeaderboardLoading(true);
              const lbRes = await axios.get(`${API_BASE_URL}/stats/leaderboard/assets?${params.toString()}&limit=500`);
          const map = {};
          const rows = lbRes.data?.data || lbRes.data || [];
          rows.forEach(row => { if (row?.ipId) map[row.ipId] = row.usdtValue; });
          setRoyaltyTotalsMap(map);
        } finally {
          setLeaderboardLoading(false);
        }
      } finally {
        setStatsLoading(false);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
    };
    finalize();
  }, [supportsProgress, progress.percent, progress.running, currentAddress, currentTokenContract, API_BASE_URL]);

  // Instant alert: poll assets-status and notify when Active Dispute increases
  useEffect(() => {
    const addressForStats = currentAddress || currentTokenContract;
    if (!addressForStats) return;
    let timerId;
    const params = new URLSearchParams({ ownerAddress: addressForStats });
    const pollStatus = async () => {
      try {
        const resp = await axios.get(`${API_BASE_URL}/stats/assets-status?${params.toString()}`);
        const active = resp.data?.counts?.active || 0;
        if (active > lastActiveCountRef.current) {
          setDisputeAlert({ visible: true, activeCount: active });
        }
        lastActiveCountRef.current = active;
      } catch (_) {
        // ignore
      }
    };
    // initial and interval
    pollStatus();
    timerId = setInterval(pollStatus, 30000);
    return () => { if (timerId) clearInterval(timerId); };
  }, [currentAddress, currentTokenContract, API_BASE_URL]);


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
    const response = await axios.get(`${API_BASE_URL}/assets?${params.toString()}`, { timeout: 20000, validateStatus: () => true, signal: assetsAbortRef.current?.signal });
    if (response.status === 202) {
      // degraded: keep existing list, show gentle message (no hard error)
      return response.data; // may contain { degraded: true }
    }
    if (response.status >= 400) {
      throw new Error(response.data?.message || `Failed to fetch assets (${response.status})`);
    }
    return response.data; // { data, pagination }
  }, [API_BASE_URL]);

  const handleFetchAssets = useCallback(async (address, newSearch = true) => { 
    const singleInput = address?.trim();
    
    // Validasi Dasar: izinkan IP ID / address / token contract
    if (!singleInput) {
        setError("Please enter a valid input.");
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
        // Cancel any in-flight assets requests when starting a new search
        if (newSearch) {
            try { assetsAbortRef.current?.abort(); } catch {}
            assetsAbortRef.current = new AbortController();
        }

        // Prevent parallel fetches to reduce server pressure
        if (isFetchingAssetsRef.current) return;
        isFetchingAssetsRef.current = true;

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
            if (responseData?.degraded) {
              // Soft degrade: don't clear previous results; show gentle note
              setError("Network busy. Retrying…");
              setHasMore(true);
            } else {
              updateSearchState({ results: [], offset: 0, totalResults: 0, hasSearched: true, currentQuery: null, currentTokenContract: null });
              setError(
                  finalError?.response?.data?.message || "No assets found. The address is neither an owner nor a token contract, or there is a network issue."
              );
              setHasMore(false);
            }
        }
    } catch (e) {
        // Tangkap error kritis yang mungkin terjadi selama manipulasi state
        setError("Critical error during asset loading.");
        console.error("CRITICAL UNCAUGHT ERROR:", e);
    } finally {
        isFetchingAssetsRef.current = false;
        // GUARANTEE RESET LOADING STATE (Ini adalah kunci perbaikan)
        newSearch ? setIsLoading(false) : setIsLoadingMore(false);
    }
  }, [offset, results, updateSearchState, fetchAttempt]); 



  const handleSubmit = (address) => { 
      handleFetchAssets(address, true);
  };
  
  const handleLoadMore = () => {
      const addressToLoad = currentAddress || currentTokenContract;
      if (isLoadingMore) return;
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


  // Urutkan assets berdasarkan total royalty USDT desc ketika data tersedia
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    if (!royaltyTotalsMap || Object.keys(royaltyTotalsMap).length === 0) return results;
    const copy = [...results];
    copy.sort((a,b) => (royaltyTotalsMap[b.ipId] || 0) - (royaltyTotalsMap[a.ipId] || 0));
    return copy;
  }, [results, royaltyTotalsMap]);

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-extrabold text-white mb-6">RoyaltyFlow Dashboard</h1>

        {disputeAlert.visible && (
          <div className="p-3 rounded-lg bg-yellow-900/40 border border-yellow-600 text-yellow-200 text-sm flex justify-between items-center">
            <span>
              Warning: {disputeAlert.activeCount} asset(s) are in <span className="font-bold">Active Dispute</span>.
            </span>
            <button
              onClick={() => setDisputeAlert({ visible: false, activeCount: disputeAlert.activeCount })}
              className="text-yellow-300 hover:text-yellow-100 text-xs underline"
            >Dismiss</button>
          </div>
        )}

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
                <StatCard title="Total Royalties Collected" value={(supportsProgress && progress.running) ? (progress.displayPartial || stats.totalRoyalties) : stats.totalRoyalties} icon="royalty" isLoading={statsLoading} progressPercent={(supportsProgress && progress.running) ? progress.percent : null} tooltip={stats.breakdownByToken ? stats.breakdownByToken.map(b=>`${b.symbol}: ${b.amountFormatted} (~$${(b.usdtValue||0).toLocaleString()})`).join(' \n') : null} />
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
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2">2. IP Asset Portfolio</h2>
                  <button className="text-xs px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white border border-gray-600" onClick={() => {
                    const copy = [...results];
                    copy.sort((a,b) => (royaltyTotalsMap[b.ipId] || 0) - (royaltyTotalsMap[a.ipId] || 0));
                    updateSearchState({ results: copy });
                  }}>Sort by Claimed</button>
                </div>

                <AssetTable
                    assets={sortedResults}
                    isLoading={isLoading}
                    error={error}
                    onAssetClick={handleViewDetails} // Meneruskan fungsi yang mendapatkan objek aset
                    royaltyTotalsMap={royaltyTotalsMap}
                    isRoyaltyTotalsLoading={leaderboardLoading}
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