import React, { useState, useEffect } from 'react';
import { useSearch } from '../SearchContext';
import AssetTable from '../components/AssetTable'; 
import RemixDetailModal from '../components/RemixDetailModal';
import RoyaltyAnalytics from '../components/RoyaltyAnalytics';
import OnChainAnalytics from '../components/OnChainAnalytics';
import StatCard from '../components/StatCard';
import QuickStats from '../components/QuickStats';

const ExplorerPage = () => {
  const {
    results,
        currentQuery, 
        currentAddress, 
        currentTokenContract,
    totalResults,
        hasSearched, 
    updateSearchState,
        setCurrentAddress,
        setCurrentTokenContract
  } = useSearch();

  const [selectedAsset, setSelectedAsset] = useState(null);
    const [showRoyaltyAnalytics, setShowRoyaltyAnalytics] = useState(false);


    const handleAssetClick = (asset) => {
        setSelectedAsset(asset);
    };

    const handleCloseModal = () => {
        setSelectedAsset(null);
    };

    const handleSearch = async (query) => {
        try {
            updateSearchState({ 
                hasSearched: true, 
                currentQuery: query,
                currentAddress: query,
                currentTokenContract: query,
                results: [],
                totalResults: 0,
                offset: 0
            });

            // Update context state
            setCurrentAddress(query);
            setCurrentTokenContract(query);

            const response = await fetch(`http://localhost:3001/api/assets?ownerAddress=${encodeURIComponent(query)}&limit=200&offset=0`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            updateSearchState({
                results: data.data || [],
                totalResults: data.pagination?.total || 0,
                offset: 0
            });
        } catch (error) {
            console.error('Search error:', error);
            updateSearchState({
                results: [],
                totalResults: 0,
                error: error.message
            });
        }
    };

    const handleLoadMore = async () => {
        if (!currentQuery) return;

        try {
            const newOffset = results.length;
            const response = await fetch(`http://localhost:3001/api/assets?ownerAddress=${encodeURIComponent(currentQuery)}&limit=200&offset=${newOffset}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            updateSearchState({
                results: [...results, ...(data.data || [])],
                totalResults: data.pagination?.total || totalResults,
                offset: newOffset
            });
        } catch (error) {
            console.error('Load more error:', error);
        }
    };

  return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                        IP Asset Explorer
                    </h1>
                    <p className="text-xl text-gray-300 mb-8">
                        Discover and analyze IP assets on Story Protocol
                    </p>
          </div>


                {/* Search Section */}
                <div className="mb-8">
                    <AssetTable.WalletFilterForm onFetch={handleSearch} />
        </div>

                {/* Results Section */}
        {hasSearched && (
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <QuickStats ownerAddress={currentQuery} />
                        

                        {/* Results Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Search Results
                                </h2>
                                <p className="text-gray-400">
                                    Found {totalResults} IP assets for "{currentQuery}"
                                </p>
          </div>
                            
                            {/* Royalty Analytics Button */}
                        <button
                                onClick={() => setShowRoyaltyAnalytics(true)}
                                className="btn-primary text-lg px-6 py-3"
                            >
                                💰 Royalty Analytics
                        </button>
                    </div>

                        {/* Results Grid */}
                        {results.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.map((asset, index) => (
                                    <div
                                        key={asset.ipId || index}
                                        onClick={() => handleAssetClick(asset)}
                                        className="card-modern p-6 cursor-pointer hover:scale-105 transition-all duration-300 group"
                                    >
                                        <div className="space-y-4">
                                            {/* Asset Image */}
                                            {(asset.nftMetadata?.image?.cachedUrl || asset.imageUrl) && (
                                                <div className="aspect-video rounded-lg overflow-hidden bg-gray-800">
                                                    <img
                                                        src={asset.nftMetadata?.image?.cachedUrl || asset.imageUrl}
                                                        alt={asset.name || asset.title || 'Asset'}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                </div>
            )}

                                            {/* Asset Info */}
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-semibold text-white line-clamp-2">
                                                    {asset.name || asset.title || 'Untitled Asset'}
                                                </h3>
                                                
                                                {(asset.description || asset.nftMetadata?.description) && (
                                                    <p className="text-gray-400 text-sm line-clamp-2">
                                                        {asset.description || asset.nftMetadata?.description}
                                </p>
                            )}

                                                {/* IP ID */}
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500">IP ID:</span>
                                                    <span className="text-xs font-mono text-blue-400 truncate">
                                                        {asset.ipId}
                                                    </span>
                        </div>

                                                {/* Media Type */}
                                                {(asset.mediaType || asset.nftMetadata?.raw?.metadata?.mediaType) && (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs text-gray-500">Type:</span>
                                                        <span className="text-xs text-purple-400">
                                                            {asset.mediaType || asset.nftMetadata?.raw?.metadata?.mediaType}
                                                        </span>
            </div>
        )}
        
                                                {/* Children Count */}
                                                {asset.childrenCount !== undefined && (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs text-gray-500">Derivatives:</span>
                                                        <span className="text-xs text-green-400">
                                                            {asset.childrenCount}
                                                        </span>
          </div>
        )}

                                                {/* Total Royalty Collected */}
                                                {asset.totalRoyaltyCollected !== undefined && (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs text-gray-500">Royalty:</span>
                                                        <span className="text-xs text-yellow-400 font-semibold">
                                                            ${asset.totalRoyaltyCollected.toFixed(2)} USDT
                                                        </span>
                </div>
            )}
                </div>

                                            {/* Hover Effect */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent rounded-lg"></div>
                </div>
                </div>
            </div>
                                ))}
                </div>
              ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-lg mb-4">
                                    No assets found for this address
            </div>
                                <p className="text-gray-500">
                                    Try searching with a different address
                    </p>
                  </div>
                )}

                        {/* Load More Button */}
                        {results.length > 0 && results.length < totalResults && (
                            <div className="text-center mt-8">
                        <button
                            onClick={handleLoadMore}
                                    className="btn-secondary text-lg px-8 py-3"
                        >
                                    Load More ({totalResults - results.length} remaining)
                        </button>
                            </div>
                    )}
                </div>
                )}

                {/* On-Chain Analytics */}
                {hasSearched && currentQuery && (
                    <div className="mt-12">
                        <OnChainAnalytics address={currentQuery} />
            </div>
        )}
            </div>
      
            {/* Asset Detail Modal */}
        {selectedAsset && (
            <RemixDetailModal 
                asset={selectedAsset} 
                onClose={handleCloseModal} 
            />
        )}

            {/* Royalty Analytics Modal */}
            {showRoyaltyAnalytics && currentQuery && (
                <RoyaltyAnalytics
                    ownerAddress={currentQuery}
                    onClose={() => setShowRoyaltyAnalytics(false)}
            />
        )}
    </div>
  );
};

export default ExplorerPage;