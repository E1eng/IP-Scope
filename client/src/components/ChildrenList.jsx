import React, { useState, useEffect } from 'react';
import axios from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="loading-wave">
                    <div></div><div></div><div></div><div></div><div></div>
                </div>
                <p className="text-gray-400 text-sm">Loading derivative works...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center">
                    <span className="text-red-400 text-2xl">⚠️</span>
                </div>
                <p className="text-red-400 text-center break-words">{error}</p>
                <button
                    onClick={() => fetchChildren(true)}
                    className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-indigo-400 border border-gray-600/50 hover:border-indigo-500/50 rounded-lg transition-smooth text-sm"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Minimalist Header - Same as Royalty Ledger */}
            {/* Minimalist Header - Same as Royalty Ledger */}
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                <h4 className="font-medium text-base mb-3 text-gray-200">
                    Derivative Works
                </h4>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total Count:</span>
                        <span className="text-gray-200 font-medium text-sm">
                            {total ? total.toLocaleString() : '...'}
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Showing:</span>
                        <span className="text-cyan-400 font-medium text-sm">
                            {children ? children.length : 0} of {total ? total.toLocaleString() : '...'}
                        </span>
                    </div>
                </div>
            </div>

            {!children || !Array.isArray(children) || children.length === 0 ? (
                total > 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center">
                            <span className="text-gray-500 text-2xl">🧩</span>
                        </div>
                        <p className="text-gray-500 text-center">Derivatives detected but not loaded yet</p>
                        <button
                            onClick={() => fetchChildren(true)}
                            className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-cyan-400 border border-gray-600/50 hover:border-cyan-500/50 rounded-lg transition-smooth text-sm"
                        >
                            Load Derivative Works
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center">
                            <span className="text-gray-500 text-2xl">🆕</span>
                        </div>
                        <p className="text-gray-500 text-center">No derivative works found</p>
                    </div>
                )
            ) : (
                <div className="space-y-2">
                {children.map((child, index) => (
                    <div key={index} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30 hover:border-cyan-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                    <span className="text-cyan-400 text-xs font-bold">{index + 1}</span>
                                </div>
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-600 flex-shrink-0">
                                    <img
                                        src={getImageUrl(child)}
                                        alt={child.name || 'Derivative Work'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = '/favicon.ico';
                                        }}
                                    />
                                </div>
                                <div>
                                    <div className="text-cyan-400 font-semibold text-sm">{child.name || 'Unnamed Asset'}</div>
                                    <div className="text-gray-400 text-xs font-mono">
                                        {child.ipId?.length > 20 
                                            ? `${child.ipId.substring(0, 10)}...${child.ipId.substring(child.ipId.length - 10)}`
                                            : child.ipId
                                        }
                                    </div>
                                </div>
                            </div>
                            <a 
                                href={`https://explorer.story.foundation/ipa/${child.ipId}`}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold"
                            >
                                View ↗
                            </a>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-mono">
                                {child.processedAt ? new Date(child.processedAt).toLocaleDateString('en-US') : 'N/A'}
                            </span>
                            <div className="flex items-center space-x-1">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                <span>Derivative</span>
                            </div>
                        </div>
                    </div>
                ))}

                    {hasMore && (
                        <div className="text-center pt-4">
                            <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                    <span>Progress</span>
                                    <span>{children.length} / {total.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-cyan-500 h-2 rounded-full transition-smooth"
                                        style={{ width: `${(children.length / total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="px-6 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-cyan-400 border border-gray-600/50 hover:border-cyan-500/50 rounded-lg transition-smooth text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingMore ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="loading-spinner-sm w-4 h-4"></div>
                                        <span>Loading More...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <span>Load More Derivative Works</span>
                                        <span className="text-sm">↓</span>
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

// Helper function
const getImageUrl = (asset) => {
    if (!asset) return '/favicon.ico';
    
    const metadata = asset.nftMetadata?.raw?.metadata;
    if (metadata?.image) {
        return metadata.image;
    }
    
    if (asset.metadata?.image) {
        return asset.metadata.image;
    }
    
    if (asset.image) {
        return asset.image;
    }
    
    if (asset.nftMetadata?.image) {
        return asset.nftMetadata.image;
    }
    
    if (asset.nftMetadata?.raw?.image) {
        return asset.nftMetadata.raw.image;
    }
    
    return '/favicon.ico';
};

export default ChildrenList;
