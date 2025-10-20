import React, { useState, useEffect } from 'react';
import { useSearch } from '../SearchContext';
import AssetTable from '../components/AssetTable'; 
import RemixDetailModal from '../components/RemixDetailModal';
import OnChainAnalytics from '../components/OnChainAnalytics';
import StatCard from '../components/StatCard';
import QuickStats from '../components/QuickStats';
import { CardSkeleton, StaggeredSkeleton } from '../components/SkeletonComponents';
import { OptimisticButton, StatusIndicator } from '../components/OptimisticUpdates';
import axios from 'axios';

// Helper fallback logic
const getMediaType = (asset) => {
    // First try: nftMetadata.raw.metadata.mediaType
    if (asset?.nftMetadata?.raw?.metadata?.mediaType) {
        return asset.nftMetadata.raw.metadata.mediaType;
    }
    
    // Second try: nftMetadata.image.contentType
    if (asset?.nftMetadata?.image?.contentType) {
        const contentType = asset.nftMetadata.image.contentType.toLowerCase();
        if (contentType.startsWith('image/')) {
            return 'IMAGE';
        }
        if (contentType.startsWith('video/')) {
            return 'VIDEO';
        }
        if (contentType.startsWith('audio/')) {
            return 'AUDIO';
        }
    }
    
    // Third try: asset.mediaType
    if (asset?.mediaType && asset.mediaType !== 'UNKNOWN') {
        return asset.mediaType;
    }
    
    // Fourth try: determine from image URL extension
    const imageUrl = asset?.nftMetadata?.image?.cachedUrl || 
                    asset?.nftMetadata?.raw?.metadata?.image || 
                    asset?.nftMetadata?.image?.originalUrl;
    
    if (imageUrl) {
        const extension = imageUrl.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
            return 'IMAGE';
        }
        if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
            return 'VIDEO';
        }
        if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
            return 'AUDIO';
        }
    }
    
    return 'Not Specified';
};


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
  const [searchStatus, setSearchStatus] = useState(null); // 'pending', 'success', 'error'

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
    const searchStart = Date.now();
    
    try {
      setIsLoading(true);
      setSearchStatus('pending');
      
      // Optimistic update - show empty results immediately
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/assets?ownerAddress=${query}&limit=50&offset=0`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      
      if (data.data && data.data.length > 0) {
        const assets = data.data || [];
        updateSearchState({
          results: assets,
          totalResults: data.pagination?.total || 0,
          offset: 0
        });
        setSearchStatus('success');
        // Clear success status after 2 seconds
        setTimeout(() => setSearchStatus(null), 2000);
      } else {
                     updateSearchState({
          results: [],
          totalResults: 0,
          offset: 0
        });
        setSearchStatus('success');
        // Clear success status after 2 seconds
        setTimeout(() => setSearchStatus(null), 2000);
      }
    } catch (error) {
      console.error(`[FRONTEND] SEARCH_ERROR time=${Date.now()-searchStart}ms error=`, error);
      // On error, show empty results
      updateSearchState({
        results: [],
        totalResults: 0,
        offset: 0
      });
      setSearchStatus('error');
      // Clear error status after 3 seconds
      setTimeout(() => setSearchStatus(null), 3000);
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/assets?ownerAddress=${currentQuery}&limit=50&offset=${results.length}`);
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
    <div className="w-full">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          
          {/* Search Status Indicator */}
          {searchStatus && (
            <div className="mt-4">
              <StatusIndicator 
                status={searchStatus} 
                message={
                  searchStatus === 'pending' ? 'Searching for assets...' :
                  searchStatus === 'success' ? 'Search completed successfully!' :
                  'Search failed. Please try again.'
                }
              />
                </div>
            )}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="space-y-6 animate-fade-in">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse"></div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Loading data... please wait</p>
                        </div>

            {/* Quick Stats Skeleton */}
            <div className="mb-6">
              <QuickStats ownerAddress={currentQuery} searchResults={[]} isLoading={true} />
                </div>

            {/* Asset Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <StaggeredSkeleton>
                {Array.from({ length: 8 }).map((_, index) => (
                  <CardSkeleton key={index} />
                ))}
              </StaggeredSkeleton>
                </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getSortedResults().map((asset, index) => (
                  <div
                    key={asset.ipId || index}
                    onClick={() => handleAssetClick(asset)}
                    className="group relative bg-gray-900/30 backdrop-blur-sm border border-gray-800/50 rounded-lg overflow-hidden cursor-pointer transition-smooth hover:border-gray-700 hover:shadow-lg hover:shadow-indigo-500/10 animate-stagger"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Asset Image */}
                    {(() => {
                      const imageUrl = asset.nftMetadata?.image?.cachedUrl || asset.imageUrl;
                      return imageUrl && (
                        <div className="aspect-square relative overflow-hidden bg-gray-800">
                          <img
                            src={imageUrl}
                            alt={asset.name || asset.title || 'Asset'}
                            className="w-full h-full object-cover transition-smooth group-hover:scale-105"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth"></div>
                </div>
                      );
                    })()}

                    {/* Asset Info */}
                    <div className="p-4 space-y-3">
                      {/* Asset Title */}
                      <h3 className="font-semibold text-gray-100 text-sm line-clamp-2 group-hover:text-white transition-smooth">
                        {asset.name || asset.title || 'Untitled Asset'}
                      </h3>

                      {/* Description */}
                      {(asset.description || asset.nftMetadata?.description) && (
                        <p className="text-gray-400 text-xs line-clamp-2">
                          {asset.description || asset.nftMetadata?.description}
                                </p>
                            )}

                      {/* IP ID */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">IP ID:</span>
                        <span className="text-xs font-mono text-indigo-400 truncate">
                          {asset.ipId}
                        </span>
                        </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Media Type */}
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500">Type:</span>
                          <span className="text-gray-300 truncate">
                            {getMediaType(asset)}
                          </span>
                </div>

                        {/* Dispute Status */}
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500">Dispute:</span>
                          {(() => {
                            const raw = asset.disputeStatus || 'None';
                            const s = String(raw).toLowerCase();
                            const cls = s.includes('active')
                              ? 'bg-red-900/20 text-red-400'
                              : s.includes('pending')
                              ? 'bg-yellow-900/20 text-yellow-400'
                              : s.includes('resolved')
                              ? 'bg-green-900/20 text-green-400'
                              : 'bg-gray-800/50 text-gray-400';
                            return (
                              <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>
                                {raw}
                              </span>
                            );
                          })()}
            </div>

                        {/* Children Count */}
                        {asset.childrenCount !== undefined && (
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-500">Derivatives:</span>
                            <span className="text-green-400 font-medium">
                              {asset.childrenCount}
                            </span>
          </div>
        )}

                        {/* Dispute Data */}
                        {asset.disputeData && (
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-500">Disputes:</span>
                            <span className={`font-medium ${
                              asset.disputeData.activeDisputes > 0 ? 'text-red-400' :
                              asset.disputeData.pendingDisputes > 0 ? 'text-yellow-400' :
                              asset.disputeData.totalDisputes > 0 ? 'text-orange-400' :
                              'text-green-400'
                            }`}>
                              {asset.disputeData.totalDisputes > 0 ? 
                                `${asset.disputeData.totalDisputes}` : 
                                '0'
                              }
                            </span>
              </div>
                        )}
                </div>

                      {/* Royalty - Prominent Display */}
                      {asset.totalRoyaltyCollected !== undefined && (
                        <div className="pt-2 border-t border-gray-800">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Royalty Earned</span>
                            <span className="font-semibold text-indigo-400 text-sm">
                              {(() => {
                                if (!asset.totalRoyaltyCollected) return '0.000 WIP';
                                if (typeof asset.totalRoyaltyCollected === 'string' && asset.totalRoyaltyCollected.includes(' ')) {
                                  return asset.totalRoyaltyCollected;
                                }
                                const num = Number(asset.totalRoyaltyCollected);
                                return isNaN(num) ? '0.000 WIP' : `${num.toFixed(3)} WIP`;
                              })()}
                            </span>
                          </div>
                </div>
              )}
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