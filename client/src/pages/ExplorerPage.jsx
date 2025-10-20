import React, { useState, useEffect } from 'react';
import { useSearch } from '../SearchContext';
import AssetTable from '../components/AssetTable'; 
import RemixDetailModal from '../components/RemixDetailModal';
import OnChainAnalytics from '../components/OnChainAnalytics';
import StatCard from '../components/StatCard';
import QuickStats from '../components/QuickStats';
import axios from 'axios';


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
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('royalty'); // 'royalty', 'name', 'date', 'disputes'

  const handleAssetClick = (asset) => {
    setSelectedAsset(asset);
  };

  // Sort results based on selected criteria
  const getSortedResults = () => {
    if (!results || results.length === 0) return [];
    
    const sortedResults = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'royalty':
          const aRoyalty = parseFloat(a.totalRoyaltyCollected || 0);
          const bRoyalty = parseFloat(b.totalRoyaltyCollected || 0);
          return bRoyalty - aRoyalty;
        case 'name':
          return (a.title || a.name || '').localeCompare(b.title || b.name || '');
        case 'date':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'disputes':
          return (b.disputeData?.totalDisputes || 0) - (a.disputeData?.totalDisputes || 0);
        default:
          return 0;
      }
    });
    
    return sortedResults;
  };

  const handleCloseModal = () => {
    setSelectedAsset(null);
  };

  const handleSearch = async (query) => {
    try {
      setIsLoading(true);
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

      // Fetch assets from real API
      const response = await fetch(`http://localhost:3001/api/assets?ownerAddress=${query}&limit=50&offset=0`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // console.log('[EXPLORER DEBUG] API Response:', data);
      // console.log('[EXPLORER DEBUG] First asset dispute data:', data.data?.[0]?.disputeData);
      
      if (data.data && data.data.length > 0) {
        const assets = data.data || [];
        updateSearchState({
          results: assets,
          totalResults: data.pagination?.total || 0,
          offset: 0
        });
      } else {
            updateSearchState({
                results: [],
                totalResults: 0,
          offset: 0
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      // On error, show empty results
                     updateSearchState({
        results: [],
        totalResults: 0,
        offset: 0
      });
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:3001/api/assets?ownerAddress=${currentQuery}&limit=50&offset=${results.length}`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
            updateSearchState({
          results: [...results, ...(data.data || [])],
          totalResults: data.pagination?.total || totalResults
        });
      }
    } catch (error) {
      console.error('Load more error:', error);
    }
    finally {
      setIsLoading(false);
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

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mb-4">
            <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 animate-[loading_1.2s_linear_infinite]"></div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Loading data... please wait</p>
          </div>
        )}

        {/* Results Section */}
        {hasSearched && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="mb-4">
              <QuickStats ownerAddress={currentQuery} searchResults={results} />
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
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-300 font-medium">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-smooth"
                  >
                    <option value="royalty">💰 Royalty (High to Low)</option>
                    <option value="name">📝 Name (A to Z)</option>
                    <option value="date">📅 Date (Newest First)</option>
                    <option value="disputes">⚠️ Disputes (Most First)</option>
                  </select>
                  {/* Active Sort Indicator */}
                  <div className="text-xs text-purple-400 font-medium">
                    {sortBy === 'royalty' && '💰 By Royalty'}
                    {sortBy === 'name' && '📝 By Name'}
                    {sortBy === 'date' && '📅 By Date'}
                    {sortBy === 'disputes' && '⚠️ By Disputes'}
                  </div>
                </div>
                
                    </div>
                </div>


            {/* Results Grid */}
            {results && results.length > 0 ? (
              <div className="grid-responsive">
                {getSortedResults().map((asset, index) => (
                  <div
                    key={asset.ipId || index}
                    onClick={() => handleAssetClick(asset)}
                    className="card-balanced p-4 cursor-pointer hover:scale-[1.02] transition-smooth group card-hover-lift"
                  >
                    <div className="space-y-3">
                      {/* Asset Image */}
                      {(() => {
                        const imageUrl = asset.nftMetadata?.image?.cachedUrl || asset.imageUrl;
                        return imageUrl && (
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                            <img
                              src={imageUrl}
                              alt={asset.name || asset.title || 'Asset'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                    </div>
                        );
                      })()}

                      {/* Asset Info */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-white line-clamp-2 flex-1">
                            {asset.name || asset.title || 'Untitled Asset'}
                          </h3>
        </div>

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
        
                            {/* Dispute Status Badge (show None if absent) */}
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">Dispute:</span>
                              {(() => {
                                const raw = asset.disputeStatus || 'None';
                                const s = String(raw).toLowerCase();
                                const cls = s.includes('active')
                                  ? 'bg-red-500/20 text-red-300 border border-red-600/30'
                                  : s.includes('pending')
                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-600/30'
                                  : s.includes('resolved')
                                  ? 'bg-green-500/20 text-green-300 border border-green-600/30'
                                  : 'bg-gray-500/20 text-gray-300 border border-gray-600/30';
                                return (
                                  <span className={`px-2 py-0.5 rounded ${cls}`}>
                                    {raw}
                                  </span>
                                );
                              })()}
                            </div>

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
                    {(() => {
                      if (!asset.totalRoyaltyCollected) return '0.000000 WIP';
                      // If it's already a formatted string like "938.242006 vIP (+3 more)", use it as is
                      if (typeof asset.totalRoyaltyCollected === 'string' && asset.totalRoyaltyCollected.includes(' ')) {
                        return asset.totalRoyaltyCollected;
                      }
                      // If it's a number, format it
                      const num = Number(asset.totalRoyaltyCollected);
                      return isNaN(num) ? '0.000000 WIP' : `${num.toFixed(6)} WIP`;
                    })()}
                  </span>
          </div>
        )}

                          {/* Dispute Status */}
                          {asset.disputeData && (
                            <div className="col-span-2 flex items-center space-x-1">
                              <span className="text-gray-500">Disputes:</span>
                              <span className={`font-semibold ${
                                asset.disputeData.activeDisputes > 0 ? 'text-red-400' :
                                asset.disputeData.pendingDisputes > 0 ? 'text-yellow-400' :
                                asset.disputeData.totalDisputes > 0 ? 'text-orange-400' :
                                'text-green-400'
                              }`}>
                                {asset.disputeData.totalDisputes > 0 ? 
                                  `${asset.disputeData.totalDisputes} Dispute${asset.disputeData.totalDisputes > 1 ? 's' : ''}` : 
                                  'None'
                                }
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
            {results.length > 0 && results.length < totalResults && totalResults > 50 && (
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

    </div>
  );
};

export default ExplorerPage;