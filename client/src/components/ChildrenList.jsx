import React, { useState, useEffect } from 'react';
import axios from 'axios';


const API_BASE_URL = 'http://localhost:3001/api';

const ChildrenList = ({ ipId, isOpen, totalCount }) => {
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(totalCount || 0);
    const [offset, setOffset] = useState(0);
    const limit = 50; // safer page size



    const fetchChildren = async (reset = false) => {
        if (!ipId || !isOpen) return;
        
        const currentOffset = reset ? 0 : offset;
        setLoading(reset);
        setError(null);

        try {
            let response = await axios.get(`${API_BASE_URL}/assets/${ipId}/children`, {
                params: { limit, offset: currentOffset }
            });

            const root = response.data || {};
            
            const payloadLevel1 = (root && typeof root === 'object') ? (root.data ?? {}) : {};
            const payload = (payloadLevel1 && typeof payloadLevel1 === 'object') ? (payloadLevel1.data ?? payloadLevel1) : {};
            
            let newChildren = Array.isArray(payload.children) ? payload.children : [];
            let newTotal = (typeof payload.total === 'number') ? payload.total : (root.pagination?.total || root.total || totalCount || 0);
            let newHasMore = (typeof payload.hasMore === 'boolean') ? payload.hasMore : (root.pagination?.hasMore || root.hasMore || false);
            if ((!Array.isArray(newChildren) || newChildren.length === 0) && Array.isArray(root?.data?.children)) {
                newChildren = root.data.children;
                
            }
            if ((!Array.isArray(newChildren) || newChildren.length === 0) && Array.isArray(root.children)) {
                newChildren = root.children;
                
            }

            // Fallback: if empty but we know there should be children, try lowercase ipId and smaller limit
            if ((!Array.isArray(newChildren) || newChildren.length === 0) && totalCount > 0) {
                try {
                    const low = String(ipId).toLowerCase();
                    response = await axios.get(`${API_BASE_URL}/assets/${low}/children`, {
                        params: { limit: 20, offset: 0 }
                    });
                    const altRoot = response.data || {};
                    const altPayloadL1 = (altRoot && typeof altRoot === 'object') ? (altRoot.data ?? {}) : {};
                    const altPayload = (altPayloadL1 && typeof altPayloadL1 === 'object') ? (altPayloadL1.data ?? altPayloadL1) : {};
                    newChildren = Array.isArray(altPayload.children) ? altPayload.children : [];
                    const altTotal = (typeof altPayload.total === 'number') ? altPayload.total : (altRoot.pagination?.total || altRoot.total || totalCount);
                    newTotal = altTotal;
                    newHasMore = newChildren.length < newTotal;
                } catch {}
            }

            // Trust larger of API total vs prop totalCount (from card)
            if ((totalCount || 0) > (newTotal || 0)) newTotal = totalCount;
            // If exactly one full page returned, assume there are more unless API explicitly says otherwise
            if (Array.isArray(newChildren) && newChildren.length === limit && newHasMore === false) {
                newHasMore = true;
            }
            
            // Debug logging (can be removed in production)
            

            if (reset) {
                setChildren(Array.isArray(newChildren) ? newChildren : []);
                setOffset(limit);
            } else {
                setChildren(prev => [...prev, ...(Array.isArray(newChildren) ? newChildren : [])]);
                setOffset(prev => prev + limit);
            }
            
            // Update total from API response if we have data
            if (newTotal > 0) {
                setTotal(newTotal);
            }
            setHasMore(newHasMore);
            
            
        } catch (err) {
            console.error('ChildrenList fetch error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load children assets');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            fetchChildren(false);
        }
    };

    useEffect(() => {
        if (isOpen && ipId) {
            fetchChildren(true);
        }
    }, [ipId, isOpen]);

    // Update total when totalCount prop changes
    useEffect(() => {
        if (totalCount !== undefined && totalCount !== null) {
            setTotal(totalCount);
        }
    }, [totalCount]);

    if (!isOpen) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-purple-400">Loading derivative works...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-4xl mb-4">⚠️</div>
                <h4 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Derivative Works</h4>
                <p className="text-red-300 text-sm">{error}</p>
                <button
                    onClick={() => fetchChildren(true)}
                    className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-purple-300 flex items-center">
                    <span className="mr-2">👇</span>
                    Direct Derivative Works ({total ? total.toLocaleString() : '...'})
                </h3>
                <div className="text-sm text-gray-400">
                    Showing {children ? children.length : 0} of {total ? total.toLocaleString() : '...'}
                </div>
            </div>

            {!children || !Array.isArray(children) || children.length === 0 ? (
                total > 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-4xl mb-4">🧩</div>
                        <p className="mb-4">Derivatives detected ({total.toLocaleString()}) but not loaded yet.</p>
                        <button
                            onClick={() => fetchChildren(true)}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            Load Derivative Works
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <div className="text-4xl mb-4">🆕</div>
                        <p>No derivative works found</p>
                    </div>
                )
            ) : (
                <div className="space-y-3">
                    {children.map((child, index) => (
                        <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
                                        <img
                                            src={getImageUrl(child)}
                                            alt={child.name || 'Derivative Work'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = '/favicon.png';
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-white truncate">
                                            {child.name || 'Unnamed Asset'}
                                        </h4>
                                        <a
                                            href={`https://explorer.story.foundation/ipa/${child.ipId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-400 hover:text-blue-300 truncate font-mono transition-colors duration-200 hover:underline"
                                            title={`View ${child.ipId} on Story Protocol Explorer`}
                                        >
                                            {child.ipId}
                                        </a>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                            <span>Processed: {child.processedAt ? new Date(child.processedAt).toLocaleDateString('en-US') : 'N/A'}</span>
                                            {child.caller && (
                                                <span title={child.caller}>
                                                    Caller: {child.caller.slice(0, 6)}...{child.caller.slice(-4)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                                        Derivative
                                    </span>
                                </div>
                            </div>
                            
                        </div>
                    ))}

                    {hasMore && (
                        <div className="text-center pt-6">
                            <div className="bg-gray-800/30 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                                    <span>Progress</span>
                                    <span>{children.length} / {total.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(children.length / total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                {loadingMore ? (
                                    <div className="flex items-center space-x-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>Loading More...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-3">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>Load More Derivative Works</span>
                                    </div>
                                )}
                            </button>
                            
                            <p className="text-xs text-gray-500 mt-3">
                                {total - children.length} more derivative works available
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper function untuk mendapatkan URL gambar
const getImageUrl = (asset) => {
    if (!asset) return '/favicon.png';
    
    // Cek metadata untuk URL gambar
    const metadata = asset.nftMetadata?.raw?.metadata;
    if (metadata?.image) {
        return metadata.image;
    }
    
    // Cek metadata alternatif
    if (asset.metadata?.image) {
        return asset.metadata.image;
    }
    
    // Cek di level asset langsung
    if (asset.image) {
        return asset.image;
    }
    
    // Cek di nftMetadata
    if (asset.nftMetadata?.image) {
        return asset.nftMetadata.image;
    }
    
    // Cek di raw metadata
    if (asset.nftMetadata?.raw?.image) {
        return asset.nftMetadata.raw.image;
    }
    
    // Fallback ke favicon
    return '/favicon.png';
};

export default ChildrenList;
