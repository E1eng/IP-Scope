import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, ChevronDown, AlertCircle, FileText } from 'lucide-react';
import { TableSkeleton, StaggeredSkeleton } from './SkeletonComponents';
import { NetworkError, ServerError, NotFoundError } from './ErrorState';
import { NoAssetsFound } from './EmptyState';
import { getInputProps, getButtonProps, getTableProps, announceToScreenReader } from '../utils/accessibility';

const getImageUrl = (asset) => {
    
    let url = asset.nftMetadata?.image?.cachedUrl ||
              asset.nftMetadata?.raw?.metadata?.image || 
              asset.nftMetadata?.image?.originalUrl || 
              asset.nftMetadata?.uri; 

    if (typeof url === 'string') { 
        if (url.startsWith('ipfs://')) {
            return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        return url.trim(); 
    }
    // 4. Fallback to local logo if no valid URL is found
    return "/favicon.ico"; 
};

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


// --- WalletFilterForm (Modern & Minimal) ---
const WalletFilterForm = ({ onFetch, initialOwnerAddress, isSubmitting }) => {
    const [addressInput, setAddressInput] = useState(initialOwnerAddress || ''); 

    const handleSubmit = (e) => {
        e.preventDefault();
        const cleanedAddress = addressInput.trim();
        const timestamp = new Date().toISOString();

        
        if (!cleanedAddress) return;

        onFetch(cleanedAddress); 
    };

    const handleClear = () => {
        setAddressInput('');
    };

    const inputProps = getInputProps({
      id: 'search-input',
      label: 'Search IP Assets',
      required: true,
      describedBy: 'search-help'
    });

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full" role="search" aria-label="Search IP assets">
            {/* Search Input with Icon and Clear Button */}
            <div className="relative">
                <label {...inputProps.label} className="block text-sm font-medium text-gray-300 mb-3">
                    Search IP Assets
                </label>
                <div className="relative">
                    {/* Search Icon */}
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" aria-hidden="true">
                        <Search className="w-5 h-5" />
                    </div>
                    
                    {/* Input Field */}
                    <input
                        {...inputProps.input}
                        type="text"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        placeholder="Enter wallet address..."
                        className="w-full pl-12 pr-12 py-4 text-lg bg-gray-900/30 border border-gray-800/50 rounded-xl text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:scale-[1.02] transition-smooth backdrop-blur-sm"
                        disabled={isSubmitting}
                        aria-describedby="search-help"
                    />
                    
                    {/* Clear Button */}
                    {addressInput && (
                        <button
                            type="button"
                            onClick={() => {
                                handleClear();
                                announceToScreenReader('Search input cleared');
                            }}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-smooth p-1 focus-ring-primary"
                            aria-label="Clear search input"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <div id="search-help" className="text-xs text-gray-500 mt-1">
                  Enter a wallet address to search for IP assets
                </div>
            </div>

            {/* Search Button */}
            <div className="flex justify-center">
                <button
                    {...getButtonProps({
                      variant: 'primary',
                      disabled: isSubmitting || !addressInput.trim(),
                      ariaLabel: isSubmitting ? 'Searching for assets' : 'Search for IP assets',
                      ariaDescribedBy: 'search-help'
                    })}
                    type="submit"
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-smooth shadow-lg hover:shadow-xl disabled:shadow-none flex items-center space-x-3"
                >
                    {isSubmitting ? (
                        <>
                            <div className="loading-spinner-sm w-5 h-5" aria-hidden="true"></div>
                            <span>Searching...</span>
                        </>
                    ) : (
                        <>
                            <Search className="w-5 h-5" aria-hidden="true" />
                            <span>Search Assets</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};


// --- AssetTable ---
function AssetTable({ assets, isLoading, error, onAssetClick, royaltyTotalsMap, isRoyaltyTotalsLoading }) {
    const [hoveredAssetId, setHoveredAssetId] = useState(null);
    
    const formatWip = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '-';
        try {
            return `${Number(num).toFixed(6)} WIP`;
        } catch {
            return '-';
        }
    };
    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Results Count Skeleton */}
                <div className="text-center">
                    <div className="loading-skeleton h-8 w-48 mx-auto rounded-lg mb-2"></div>
                    <div className="loading-skeleton h-4 w-64 mx-auto rounded"></div>
                </div>
                
                {/* Table Skeleton */}
                <TableSkeleton rows={8} columns={6} />
            </div>
        );
    }
    
    if (error) {
        // Determine error type based on error message
        const isNetworkError = error.includes('Network Error') || error.includes('ERR_CONNECTION_REFUSED');
        const isServerError = error.includes('500') || error.includes('Internal Server Error');
        const isNotFoundError = error.includes('404') || error.includes('Not Found');

        if (isNetworkError) {
            return <NetworkError onRetry={() => window.location.reload()} />;
        } else if (isServerError) {
            return <ServerError onRetry={() => window.location.reload()} />;
        } else if (isNotFoundError) {
            return <NotFoundError onRetry={() => window.location.reload()} />;
        } else {
            return (
                <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl p-12 text-center animate-fade-in">
                    <div className="flex flex-col items-center space-y-6">
                        <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-gray-100">Error loading assets</h3>
                            <p className="text-gray-400 font-mono text-sm break-words max-w-md">{error}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }
    }

    if (assets.length === 0) {
        return <NoAssetsFound onSearch={() => window.location.reload()} />;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Results Count */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-100 mb-2">
                    Found {assets.length} asset{assets.length !== 1 ? 's' : ''}
                </h2>
                <p className="text-gray-400">
                    IP assets discovered on Story Protocol
                </p>
            </div>

            {/* Assets Table - Minimal Design */}
            <div className="overflow-x-auto">
                <table 
                  {...getTableProps({ caption: 'IP Assets Table' })}
                  className="w-full text-left"
                >
                    <caption className="sr-only">
                      Table showing IP assets with preview, title, media type, creation date, royalty amount, and status
                    </caption>
                    {/* Header */}
                    <thead className="bg-gray-900/30 sticky top-0 z-10">
                        <tr role="row">
                            <th scope="col" className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</th>
                            <th scope="col" className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Asset Title
                                <span className="text-xs text-gray-500 ml-2">(click address to view)</span>
                            </th>
                            <th scope="col" className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Media Type</th>
                            <th scope="col" className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Created</th>
                            <th scope="col" className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Total Royalty</th>
                            <th scope="col" className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    
                    {/* Rows */}
                    <tbody>
                        {assets.map((asset, index) => (
                            <tr 
                                key={asset.ipId} 
                                className="border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer transition-smooth group focus-ring-primary"
                                onClick={() => onAssetClick(asset)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onAssetClick(asset);
                                    announceToScreenReader(`View details for ${asset.title || 'Untitled Asset'}`);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`View details for ${asset.title || 'Untitled Asset'}`}
                            >
                                {/* Image Column */}
                                <td className="py-4 px-6">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden aspect-square group-hover:scale-105 transition-smooth">
                                        <img 
                                            src={getImageUrl(asset)} 
                                            alt={`Preview of ${asset.title || 'Untitled Asset'}`}
                                            className="w-full h-full object-cover" 
                                            onError={(e) => { e.target.onerror = null; e.target.src="/favicon.ico"; }} 
                                        />
                                    </div>
                                </td>
                                
                                {/* Asset Title Column */}
                                <td className="py-4 px-6">
                                    <div className="max-w-xs">
                                        <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors duration-200 truncate">
                                            {asset.title || 'Untitled Asset'}
                                        </h3>
                                        <a
                                            href={`https://explorer.story.foundation/ipa/${asset.ipId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-sm text-gray-400 hover:text-gray-300 font-mono mt-1 transition-smooth hover:underline focus-ring-primary"
                                            aria-label={`View ${asset.ipId} on Story Protocol Explorer (opens in new tab)`}
                                        >
                                            {asset.ipId?.slice(0, 8)}...
                                        </a>
                                    </div>
                                </td>
                                
                                {/* Media Type Column */}
                                <td className="py-4 px-6">
                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                                        {getMediaType(asset)}
                                    </span>
                                </td>
                                
                                {/* Date Created Column */}
                                <td className="py-4 px-6 text-gray-300">
                                    {new Date(asset.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </td>
                                
                                {/* Total Royalty Column */}
                                <td className="py-4 px-6 text-right">
                                    <span 
                                        className="font-semibold text-gray-100 group-hover:text-white transition-colors duration-200"
                                        onMouseEnter={() => setHoveredAssetId(asset.ipId)}
                                        onMouseLeave={() => setHoveredAssetId(null)}
                                    >
                                        {royaltyTotalsMap && royaltyTotalsMap.hasOwnProperty(asset.ipId)
                                            ? formatWip(royaltyTotalsMap[asset.ipId])
                                            : (isRoyaltyTotalsLoading ? (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <div className="loading-spinner-sm w-4 h-4"></div>
                                                    <span className="text-sm">Loading…</span>
                                                </div>
                                            ) : '-')}
                                    </span>
                                </td>
                                
                                {/* Status Column */}
                                <td className="py-4 px-6">
                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                                        {asset.disputeData?.totalDisputes > 0 ? 
                                            `${asset.disputeData.totalDisputes} Dispute${asset.disputeData.totalDisputes > 1 ? 's' : ''}` : 
                                            'No Disputes'
                                        }
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Export WalletFilterForm
AssetTable.WalletFilterForm = WalletFilterForm;
export default AssetTable;