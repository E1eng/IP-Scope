import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import StatCard from '../components/StatCard';
import AssetTable from '../components/AssetTable';
import RemixDetailModal from '../components/RemixDetailModal';
import { useSearch } from '../SearchContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_LIMIT = 20;
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function ExplorerPage() {
    const { results, offset, totalResults, updateSearchState, hasSearched, currentQuery, currentTokenContract } = useSearch();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [stats, setStats] = useState({ totalRoyalties: 'N/A', totalAssets: '0', overallDisputeStatus: '0' });
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [statsError, setStatsError] = useState(null);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            const addressForStats = currentQuery || currentTokenContract;
            setStats(prev => ({ ...prev, totalAssets: totalResults.toLocaleString() }));
            if (!addressForStats) return;

            setIsLoadingStats(true);
            setStatsError(null);
            try {
                const response = await axios.get(`${API_BASE_URL}/stats?ownerAddress=${addressForStats}`, { timeout: 60000 });
                setStats(prev => ({ ...prev, totalRoyalties: response.data.totalRoyalties, overallDisputeStatus: response.data.overallDisputeStatus }));
            } catch (err) {
                const errorMsg = err.code === 'ECONNABORTED' ? 'Request timeout.' : err.response?.data?.message || 'Failed to load stats';
                setStats(prev => ({ ...prev, totalRoyalties: 'Error', overallDisputeStatus: 'Error' }));
                setStatsError(errorMsg);
            } finally {
                setIsLoadingStats(false);
            }
        };
        if (hasSearched && totalResults > 0) {
            fetchDashboardStats();
        }
    }, [currentQuery, currentTokenContract, totalResults, hasSearched]);

    const fetchAttempt = useCallback(async (ownerAddr, tokenContractAddr, currentOffset) => {
        const params = new URLSearchParams({ limit: PAGE_LIMIT, offset: currentOffset });
        if (ownerAddr) params.append('ownerAddress', ownerAddr);
        if (tokenContractAddr) params.append('tokenContract', tokenContractAddr);
        const response = await axios.get(`${API_BASE_URL}/assets?${params.toString()}`, { timeout: 20000 });
        return response.data;
    }, []);

    const handleFetchAssets = useCallback(async (address, newSearch = true) => {
        const singleInput = address?.trim();
        if (!singleInput || !ETH_ADDRESS_REGEX.test(singleInput)) {
            setError("Please enter a valid Ethereum address.");
            return;
        }

        newSearch ? setIsLoading(true) : setIsLoadingMore(true);
        setError(null);

        let currentOffset = newSearch ? 0 : offset;
        let finalSuccess = false;
        let responseData = [];
        let total = 0;
        let finalError = null;

        try {
            if (newSearch) {
                updateSearchState({ results: [], offset: 0, totalResults: 0, hasSearched: true, currentQuery: singleInput, currentTokenContract: null });
            }

            // PERCOBAAN 1: SEBAGAI OWNER
            try {
                const res1 = await fetchAttempt(singleInput, null, currentOffset);
                if (res1.data && res1.data.length > 0) {
                    finalSuccess = true;
                    responseData = res1.data;
                    total = res1.pagination?.total || 0;
                    if (newSearch) updateSearchState({ currentQuery: singleInput, currentTokenContract: null });
                }
            } catch (e) {
                finalError = e;
                console.warn("Percobaan 1 (Owner) gagal, mencoba fallback...", e.message);
            }

            // PERCOBAAN 2: FALLBACK SEBAGAI TOKEN CONTRACT (JIKA PERCOBAAN 1 GAGAL/KOSONG)
            if (!finalSuccess) {
                try {
                    const res2 = await fetchAttempt(null, singleInput, currentOffset);
                    if (res2.data && res2.data.length > 0) {
                        finalSuccess = true;
                        responseData = res2.data;
                        total = res2.pagination?.total || 0;
                        if (newSearch) updateSearchState({ currentQuery: null, currentTokenContract: singleInput });
                    }
                } catch (e) {
                    finalError = e;
                    console.error("Percobaan 2 (Contract) juga gagal.", e.message);
                }
            }

            if (finalSuccess) {
                const updatedResults = newSearch ? responseData : [...results, ...responseData];
                updateSearchState({
                    results: updatedResults,
                    offset: updatedResults.length,
                    totalResults: total,
                });
            } else if (newSearch) {
                setError(finalError?.response?.data?.message || "No assets found. The address is neither an owner nor a token contract with assets.");
                updateSearchState({ results: [], totalResults: 0 });
            }

        } catch (e) {
            setError("An unexpected critical error occurred.");
            console.error("CRITICAL ERROR in handleFetchAssets:", e);
        } finally {
            newSearch ? setIsLoading(false) : setIsLoadingMore(false);
        }
    }, [offset, results, fetchAttempt, updateSearchState]);

    const handleLoadMore = () => {
        const addressToLoad = currentQuery || currentTokenContract;
        if (addressToLoad) {
            handleFetchAssets(addressToLoad, false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-extrabold text-white mb-6">RoyaltyFlow Dashboard</h1>

            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-purple-400">1. Input Creator Address</h2>
                <AssetTable.WalletFilterForm
                    onFetch={(addr) => handleFetchAssets(addr, true)}
                    isSubmitting={isLoading}
                    initialOwnerAddress={currentQuery || currentTokenContract || ''}
                />
            </div>

            {hasSearched && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <StatCard title="Total Royalties Collected" value={stats.totalRoyalties} icon="royalty" isLoading={isLoadingStats} error={statsError} />
                        <StatCard title="Total IP Assets Found" value={totalResults.toLocaleString()} icon="asset" />
                        <StatCard title="Overall Dispute Status" value={stats.overallDisputeStatus} icon="license" isWarning={stats.overallDisputeStatus === 'Active'} isLoading={isLoadingStats} error={statsError} />
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2">2. IP Asset Portfolio</h2>
                        <AssetTable
                            assets={results}
                            isLoading={isLoading}
                            error={error}
                            onAssetClick={(ipId) => setSelectedAsset(results.find(a => a.ipId === ipId))}
                        />
                        {offset < totalResults && !isLoading && (
                            <div className="text-center mt-10">
                                <button onClick={handleLoadMore} disabled={isLoadingMore} className="p-3 px-8 font-bold bg-purple-600 rounded-xl hover:bg-purple-700">
                                    {isLoadingMore ? 'Loading...' : 'Load More Assets'}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {selectedAsset && (
                <RemixDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
            )}
        </div>
    );
}

export default ExplorerPage;