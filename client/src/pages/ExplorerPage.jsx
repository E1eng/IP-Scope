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

      // Fetch assets
      const response = await fetch(`http://localhost:3001/api/assets?ownerAddress=${query}&limit=200&offset=0`);
      const data = await response.json();
      
      if (data.success) {
        updateSearchState({
          results: data.data || [],
          totalResults: data.pagination?.total || 0,
          offset: 0
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleLoadMore = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/assets?ownerAddress=${currentQuery}&limit=200&offset=${results.length}`);
      const data = await response.json();
      
      if (data.success) {
        updateSearchState({
          results: [...results, ...(data.data || [])],
          totalResults: data.pagination?.total || totalResults
        });
      }
    } catch (error) {
      console.error('Load more error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container-balanced">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 text-balance">
            IP Asset Explorer
          </h1>
          <p className="text-lg text-gray-300 mb-6 text-balance">
            Discover and analyze IP assets on Story Protocol
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <AssetTable.WalletFilterForm onFetch={handleSearch} />
          </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="mb-4">
              <QuickStats ownerAddress={currentQuery} />
            </div>

            {/* Results Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Search Results
                </h2>
                <p className="text-gray-400 text-sm">
                  Found {totalResults} IP assets for "{currentQuery}"
                </p>
              </div>
              
              {/* Royalty Analytics Button */}
                        <button
                onClick={() => setShowRoyaltyAnalytics(true)}
                className="btn-primary text-sm px-4 py-2 focus-ring transition-smooth"
              >
                💰 Royalty Analytics
                        </button>
            </div>

            {/* Results Grid */}
            {results.length > 0 ? (
              <div className="grid-responsive">
                {results.map((asset, index) => (
                  <div
                    key={asset.ipId || index}
                    onClick={() => handleAssetClick(asset)}
                    className="card-balanced p-4 cursor-pointer hover:scale-[1.02] transition-smooth group card-hover-lift"
                  >
                    <div className="space-y-3">
                      {/* Asset Image */}
                      {(asset.nftMetadata?.image?.cachedUrl || asset.imageUrl) && (
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-800">
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
                        <h3 className="text-base font-semibold text-white line-clamp-2">
                          {asset.name || asset.title || 'Untitled Asset'}
                        </h3>
                        
                        {(asset.description || asset.nftMetadata?.description) && (
                          <p className="text-gray-400 text-xs line-clamp-2">
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

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Media Type */}
                          {(asset.mediaType || asset.nftMetadata?.raw?.metadata?.mediaType) && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">Type:</span>
                              <span className="text-purple-400 truncate">
                                {asset.mediaType || asset.nftMetadata?.raw?.metadata?.mediaType}
                              </span>
                            </div>
                          )}
                          
                          {/* Children Count */}
                          {asset.childrenCount !== undefined && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">Derivatives:</span>
                              <span className="text-green-400">
                                {asset.childrenCount}
                              </span>
                    </div>
                          )}

                          {/* Total Royalty Collected */}
                          {asset.totalRoyaltyCollected !== undefined && (
                            <div className="col-span-2 flex items-center space-x-1">
                              <span className="text-gray-500">Royalty:</span>
                              <span className="text-yellow-400 font-semibold">
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
              <div className="text-center mt-6">
                <button
                  onClick={handleLoadMore}
                  className="btn-secondary text-sm px-6 py-2 focus-ring transition-smooth"
                >
                  Load More ({totalResults - results.length} remaining)
                </button>
              </div>
            )}
          </div>
        )}

        {/* On-Chain Analytics */}
        {hasSearched && currentQuery && (
          <div className="mt-8">
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