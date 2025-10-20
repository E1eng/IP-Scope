import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import LicenseCard from './LicenseCard';
import DetailRow from './DetailRow';
import ChildrenList from './ChildrenList';
import { ModalSkeleton, TextSkeleton, ImageSkeleton } from './SkeletonComponents';
import { NoRoyaltyData, NoDerivatives, NoTransactions } from './EmptyState';
import { getModalProps, getButtonProps, announceToScreenReader } from '../utils/accessibility';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Helper untuk konversi URL gambar (mirip dengan card di tabel)
const getImageUrl = (asset) => {
    let url = asset?.nftMetadata?.image?.cachedUrl ||
              asset?.nftMetadata?.raw?.metadata?.image ||
              asset?.nftMetadata?.image?.originalUrl ||
              asset?.nftMetadata?.uri;
    if (typeof url === 'string') {
        if (url.startsWith('ipfs://')) return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
        return url.trim();
    }
    return '/favicon.png';
};


// Komponen untuk menampilkan semua currency royalty flow
const CurrencyFlowDisplay = ({ asset }) => {
    const [currencyData, setCurrencyData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!asset?.ipId) return;

        // 1) Coba gunakan data yang SUDAH ADA di asset (hindari panggilan ulang)
        const fromProp = asset?.analytics?.totalRoyaltiesPaid;
        if (fromProp && Object.keys(fromProp).length > 0) {
            const parsedFromProp = {};
            Object.entries(fromProp).forEach(([symbol, value]) => {
                if (!value) return;
                const displaySymbol = symbol === 'ETH' ? 'IP' : symbol;
                parsedFromProp[displaySymbol] = value;
            });
            setCurrencyData(parsedFromProp);
            setIsLoading(false);
            return; // cukup pakai data yang sudah ada
        }

        // 2) Jika belum ada di prop, baru fetch detail
        const fetchCurrencyData = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(`${API_BASE_URL}/assets/${asset.ipId}`);
                const assetData = response.data;

                if (assetData?.analytics?.totalRoyaltiesPaid) {
                    const parsedCurrencies = {};
                    Object.entries(assetData.analytics.totalRoyaltiesPaid).forEach(([symbol, value]) => {
                        if (value && value !== '0' && value !== '0.000000') {
                            const displaySymbol = symbol === 'ETH' ? 'IP' : symbol;
                            parsedCurrencies[displaySymbol] = value;
                        }
                    });
                    setCurrencyData(parsedCurrencies);
                } else {
                    setCurrencyData({});
                }
            } catch (error) {
                console.error('Error fetching currency data:', error);
                setCurrencyData({});
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrencyData();
    }, [asset?.ipId]);

    if (isLoading) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700/50">
                <h3 className="font-medium text-base mb-3 text-gray-200">
                    Royalty Flow
                </h3>
                <div className="space-y-2">
                    <TextSkeleton lines={3} />
                </div>
        </div>
    );
    }

    if (!currencyData || Object.keys(currencyData).length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700/50">
                <h3 className="font-medium text-base mb-3 text-gray-200">
                    💰 Royalty Flow
                </h3>
                <div className="text-center text-gray-400">No royalty data available</div>
            </div>
        );
    }
    
    // Sort currencies: WIP first, then by amount descending
    const sortedCurrencies = Object.entries(currencyData).sort((a, b) => {
        if (a[0] === 'WIP' && b[0] !== 'WIP') return -1;
        if (b[0] === 'WIP' && a[0] !== 'WIP') return 1;
        return parseFloat(b[1]) - parseFloat(a[1]);
    });

    return (
        <div className="bg-gray-800/30 rounded-lg p-4 mb-4 border border-gray-700/30">
            <h4 className="font-medium text-base mb-3 text-gray-200">
                Royalty Flow
            </h4>
            
            <div className="space-y-2">
                {sortedCurrencies.map(([symbol, value]) => (
                    <div key={symbol} className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm font-medium">{symbol}</span>
                        <span className="text-cyan-400 font-medium text-sm">{value}</span>
                </div>
                ))}
            </div>
        </div>
    );
};

// Komponen untuk tab "Royalty Ledger"
const RoyaltyLedgerTab = ({ ipId }) => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!ipId) return;
        const fetchLedger = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Set timeout untuk mencegah stuck loading
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
                
                try {
                    const response = await axios.get(`${API_BASE_URL}/assets/${ipId}/royalty-transactions`, {
                        signal: controller.signal,
                        timeout: 60000 // Increased to 60 seconds for large datasets
                    });
                    clearTimeout(timeoutId);
                    const data = response.data || [];
                    setTransactions(data);
                    setTotalCount(data.length);
                    setCurrentPage(1);
                } catch (errPrimary) {
                    clearTimeout(timeoutId);
                    // Fallback ke alias lama jika tersedia
                    const response2 = await axios.get(`${API_BASE_URL}/assets/${ipId}/transactions`, {
                        signal: controller.signal,
                        timeout: 15000
                    });
                    const data = response2.data || [];
                    setTransactions(data);
                    setTotalCount(data.length);
                    setCurrentPage(1);
                }
            } catch (err) {
                let errorMessage = "Failed to load royalty ledger.";
                if (err.name === 'AbortError') {
                    errorMessage = "Request timeout. Please try again.";
                } else if (err.response?.data?.message) {
                    errorMessage = err.response.data.message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLedger();
    }, [ipId]);

    // (Removed) Progress polling UI

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalCount);
    const visibleTransactions = transactions.slice(startIndex, endIndex);
    const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
    const goNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

   if (isLoading) return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-gray-100">Royalty Ledger</h3>
                <div className="loading-skeleton h-4 w-16 rounded"></div>
            </div>
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <div className="loading-skeleton h-4 w-32 rounded"></div>
                            <div className="loading-skeleton h-4 w-20 rounded"></div>
                        </div>
                        <div className="loading-skeleton h-3 w-24 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    if (error) return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center">
                <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <p className="text-red-400 text-center break-words">{error}</p>
        </div>
    );
    
    if (transactions.length === 0) return <NoTransactions />;

    return (
        <div className="space-y-3">
            {/* Minimalist Header - Same as License Summary */}
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                <h4 className="font-medium text-base mb-3 text-gray-200">
                    Royalty Ledger
                </h4>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Transactions:</span>
                        <span className="text-gray-200 font-medium text-sm">
                            {totalCount === 0 ? 0 : startIndex + 1}-{endIndex} of {totalCount}
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total Collected:</span>
                        <span className="text-cyan-400 font-medium text-sm">
                            {transactions.reduce((sum, tx) => {
                                const valueStr = tx.value || '0';
                                const match = valueStr.match(/(\d+\.?\d*)/);
                                return sum + (match ? parseFloat(match[1]) : 0);
                            }, 0).toFixed(6)} WIP
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Minimalist Transaction List */}
            <div className="space-y-2">
                {visibleTransactions.map((tx, index) => (
                    <div key={tx.txHash} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30 hover:border-cyan-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                    <span className="text-cyan-400 text-xs font-bold">{index + 1}</span>
                                </div>
                                <div>
                                    <div className="text-cyan-400 font-mono text-sm font-bold">{tx.value}</div>
                                    <div className="text-gray-400 text-xs">
                                        {typeof tx.from === 'string' ? `${tx.from.substring(0, 6)}...${tx.from.substring(tx.from.length - 4)}` : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            <a 
                                href={`https://storyscan.io/tx/${tx.txHash}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold"
                            >
                                View ↗
                        </a>
                    </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-mono">{tx.timestamp}</span>
                            <div className="flex items-center space-x-1">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                <span>Confirmed</span>
                            </div>
                    </div>
                </div>
            ))}
            </div>
            
            {/* Minimalist Pagination */}
            {totalCount > pageSize && (
                <div className="flex items-center justify-center space-x-3 pt-4">
                    <button 
                        onClick={goPrev} 
                        disabled={currentPage === 1} 
                        className="px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-cyan-400 border border-gray-600/50 hover:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm"
                    >
                        ← Prev
                    </button>
                    <span className="text-gray-400 text-sm">
                        Page {currentPage} / {totalPages}
                    </span>
                    <button 
                        onClick={goNext} 
                        disabled={currentPage === totalPages} 
                        className="px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-cyan-400 border border-gray-600/50 hover:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};

// Komponen untuk tab "Top Licensees"
const TopLicenseesTab = ({ ipId }) => {
    const [licensees, setLicensees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!ipId) return;
        const fetchLicensees = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axios.get(`${API_BASE_URL}/assets/${ipId}/top-licensees`);
                setLicensees(response.data || []);
            } catch (err) {
                const errorMessage = err.response?.data?.message || "Failed to load top licensees.";
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLicensees();
    }, [ipId]);

    if (isLoading) return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-gray-100">Top Licensees</h3>
                <div className="loading-skeleton h-4 w-16 rounded"></div>
            </div>
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <div className="loading-skeleton h-4 w-32 rounded"></div>
                            <div className="loading-skeleton h-4 w-20 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    if (error) return <div className="text-center p-4 text-red-400 bg-red-900/30 rounded-lg break-words">{error}</div>;
    if (licensees.length === 0) return <div className="text-center p-4 text-gray-500">No licensees found.</div>;
    
    return (
        <div className="space-y-2 text-xs">
            {licensees.map((lic, index) => (
                <div key={lic.address} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 flex justify-between items-center hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-3">
                        <span className={`text-lg font-extrabold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : 'text-orange-400'}`}>
                            #{index + 1}
                        </span>
                        <a 
                            href={`https://explorer.story.foundation/ipa/${lic.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-blue-400 hover:text-blue-300 text-xs transition-colors break-all"
                            title={`View ${lic.address} on Story Protocol Explorer`}
                        >
                            {lic.address}
                        </a>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-sm text-green-400">{lic.totalValue || lic.totalValueFormatted}</p>
                        <p className="text-gray-500 mt-0.5">{lic.count} payments</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Komponen Utama KONTEN (Bukan Modal Sebenarnya Lagi)
const RemixDetailModalContent = ({ asset, onClose, isLoading }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [detail, setDetail] = useState(null); // Start with null to avoid showing incomplete data
  const [totalChildren, setTotalChildren] = useState(asset?.childrenCount || null);
  const [totalDescendants, setTotalDescendants] = useState(asset?.descendantsCount || null);
        const [loadingChildren, setLoadingChildren] = useState(false); // No loading needed


  useEffect(() => {
    setActiveTab('details');
  }, [asset?.ipId]);

  // Fetch detail saat modal dibuka
  useEffect(() => {
    let cancelled = false;
    
    // Initialize with asset data first
    setTotalChildren(asset?.childrenCount || 0);
    setTotalDescendants(asset?.descendantsCount || asset?.childrenCount || 0);
    
        // Always fetch from API to get complete data including pilTerms and royaltyPolicy
    
    const load = async () => {
      try {
        if (!asset?.ipId) {
          return;
        }
        const resp = await axios.get(`${API_BASE_URL}/assets/${asset.ipId}`);
        if (!cancelled) {
          const assetData = resp.data || asset;
          // Set detail with complete data from API immediately
          setDetail(assetData);
          
          // Update children counts from API data
          if (assetData.childrenCount !== undefined) {
            setTotalChildren(assetData.childrenCount);
          }
          if (assetData.descendantsCount !== undefined) {
            setTotalDescendants(assetData.descendantsCount);
          }
        }
      } catch (error) {
        // On error, fallback to asset prop data
        if (!cancelled) {
          console.error('Error loading asset details:', error);
          setDetail(asset);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [asset?.ipId]);

  // Use detail if available, otherwise fallback to asset prop
  // But prioritize better data from asset prop when detail has incomplete data
  const currentAsset = useMemo(() => {
    let result = detail || asset;
    
    // Ensure title is properly set from asset data
    if (asset && !result.title) {
      result.title = asset.title || asset.name || 'Untitled Asset';
    }
    
    // If we have both detail and asset, merge them intelligently
    if (detail && asset) {
      result = {
        ...detail,
        // Keep better data from asset prop when detail has incomplete data
        title: asset?.title || asset?.name || detail?.title || detail?.name || 'Untitled Asset',
        creator: detail.creator && detail.creator !== 'Not Provided' ? detail.creator : asset.creator,
        mediaType: detail.mediaType && detail.mediaType !== 'Not Specified' ? detail.mediaType : asset.mediaType,
        description: asset.description || detail.description,
        nftMetadata: asset.nftMetadata || detail.nftMetadata,
        // Keep license data from detail (this is what we want from API)
        pilTerms: detail.pilTerms,
        royaltyPolicy: detail.royaltyPolicy,
        // Keep other important data from detail, but prioritize asset data if it's better
        childrenCount: asset.childrenCount || detail.childrenCount,
        descendantsCount: asset.descendantsCount || detail.descendantsCount,
        totalRoyaltyCollected: detail.totalRoyaltyCollected
      };
    }
    
    return result;
  }, [detail, asset]);
  
  // Calculate derived values that depend on currentAsset
  const formattedDate = useMemo(() => {
    const result = currentAsset?.createdAt ? new Date(currentAsset.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not Provided';
    return result;
  }, [currentAsset]);
  
  const creatorName = useMemo(() => {
    const result = asset?.creator || currentAsset?.creator || currentAsset?.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Not Provided';
    return result;
  }, [currentAsset, asset]);
  // Determine media type with better fallback logic
  const mediaTypeDisplay = useMemo(() => {
    // First try: nftMetadata.raw.metadata.mediaType
    if (currentAsset?.nftMetadata?.raw?.metadata?.mediaType) {
      return currentAsset.nftMetadata.raw.metadata.mediaType;
    }
    
    // Second try: nftMetadata.image.contentType
    if (currentAsset?.nftMetadata?.image?.contentType) {
      const contentType = currentAsset.nftMetadata.image.contentType.toLowerCase();
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
    
    // Third try: currentAsset.mediaType
    if (currentAsset?.mediaType && currentAsset.mediaType !== 'UNKNOWN') {
      return currentAsset.mediaType;
    }
    
    // Fourth try: determine from image URL extension
    const imageUrl = currentAsset?.nftMetadata?.image?.cachedUrl || 
                    currentAsset?.nftMetadata?.raw?.metadata?.image || 
                    currentAsset?.nftMetadata?.image?.originalUrl;
    
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
  }, [currentAsset]);
  // UI/UX: Rombak tampilan agar sesuai untuk halaman penuh.
return (
    <div 
      id="remix-modal"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div 
        {...getModalProps({
          isOpen: true,
          onClose,
          title: 'Asset Details',
          describedBy: 'modal-description'
        })}
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl mx-4 sm:mx-0"
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 bg-gray-950 p-4 sm:p-6 flex-shrink-0 border-b border-gray-800">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 sm:gap-4 pr-8 sm:pr-10 flex-1 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
                    <img
                      src={getImageUrl(currentAsset)}
                      alt={`Preview of ${currentAsset?.title || asset?.title || asset?.name || 'Untitled Asset'}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-white truncate">
                      {currentAsset?.title || asset?.title || asset?.name || 'Untitled Asset'}
                    </h2>
                    <p id="modal-description" className="text-gray-400 text-xs sm:text-sm truncate">
                      {currentAsset?.description || currentAsset?.nftMetadata?.description || 'No description available'}
                    </p>
                  </div>
                </div>
                <button 
                  {...getButtonProps({
                    variant: 'secondary',
                    ariaLabel: 'Close asset details and return to explorer'
                  })}
                  onClick={() => {
                    onClose();
                    announceToScreenReader('Asset details closed');
                  }}
                  className="text-gray-400 hover:text-white p-2 rounded-lg transition-smooth hover:bg-gray-800 focus-ring-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {/* Tabs with underline style */}
            <div className="flex mt-4 sm:mt-6 border-b border-gray-800 overflow-x-auto" role="tablist" aria-label="Asset detail sections">
                <button 
                    onClick={() => {
                        setActiveTab('details');
                        announceToScreenReader('Switched to details tab');
                    }}
                    className={`py-2 sm:py-3 px-3 sm:px-4 font-medium transition-smooth border-b-2 whitespace-nowrap ${
                        activeTab === 'details' 
                            ? 'text-gray-100 border-indigo-500' 
                            : 'text-gray-400 hover:text-gray-200 border-transparent'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'details'}
                    aria-controls="details-panel"
                    id="details-tab"
                >
                    Details
                </button>
                <button 
                    onClick={() => {
                        setActiveTab('derivatives');
                        announceToScreenReader('Switched to derivative works tab');
                    }}
                    className={`py-2 sm:py-3 px-3 sm:px-4 font-medium transition-smooth border-b-2 whitespace-nowrap ${
                        activeTab === 'derivatives' 
                            ? 'text-gray-100 border-indigo-500' 
                            : 'text-gray-400 hover:text-gray-200 border-transparent'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'derivatives'}
                    aria-controls="derivatives-panel"
                    id="derivatives-tab"
                >
                    Derivative Works
                </button>
                <button 
                    onClick={() => {
                        setActiveTab('ledger');
                        announceToScreenReader('Switched to royalty ledger tab');
                    }}
                    className={`py-2 sm:py-3 px-3 sm:px-4 font-medium transition-smooth border-b-2 whitespace-nowrap ${
                        activeTab === 'ledger' 
                            ? 'text-gray-100 border-indigo-500' 
                            : 'text-gray-400 hover:text-gray-200 border-transparent'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'ledger'}
                    aria-controls="ledger-panel"
                    id="ledger-tab"
                >
                    Royalty Ledger
                </button>
                <button 
                    onClick={() => {
                        setActiveTab('licensees');
                        announceToScreenReader('Switched to top licensees tab');
                    }}
                    className={`py-2 sm:py-3 px-3 sm:px-4 font-medium transition-smooth border-b-2 whitespace-nowrap ${
                        activeTab === 'licensees' 
                            ? 'text-gray-100 border-indigo-500' 
                            : 'text-gray-400 hover:text-gray-200 border-transparent'
                    }`}
                    role="tab"
                    aria-selected={activeTab === 'licensees'}
                    aria-controls="licensees-panel"
                    id="licensees-tab"
                >
                    Top Licensees
                </button>
            </div>
        </header>

        <div className="px-4 sm:px-6 pb-6 overflow-y-auto custom-scrollbar flex-grow">
            <div className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
                {activeTab === 'details' && (
                    <div 
                        id="details-panel"
                        role="tabpanel"
                        aria-labelledby="details-tab"
                        tabIndex={0}
                    >
                    <div className="space-y-6">
                        {/* Asset Image and Description */}
                        <div className="bg-gray-900/30 rounded-lg p-6 border border-gray-800/30">
                            {/* Mobile: Vertical layout, Desktop: Horizontal layout */}
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Large Image */}
                                <div className="w-full lg:w-48 h-48 lg:h-48 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0 mx-auto lg:mx-0">
                                    <img
                                        src={getImageUrl(currentAsset)}
                                        alt={currentAsset?.title || asset?.title || asset?.name || 'Asset Preview'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }}
                                    />
                                </div>
                                
                                {/* Description */}
                                <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-200 mb-3">Description</h3>
                                    <p className="text-gray-300 leading-relaxed">
                                        {currentAsset?.description || 'No description available.'}
                                    </p>
                                    
                                    {/* Additional Metadata */}
                                    <div className="mt-4 space-y-2 text-sm">
                                        {(currentAsset?.nftMetadata?.raw?.metadata?.attributes && 
                                          currentAsset.nftMetadata.raw.metadata.attributes.length > 0) && (
                                            <div>
                                                <span className="text-gray-300 font-medium">Attributes:</span>
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    {currentAsset.nftMetadata.raw.metadata.attributes.slice(0, 4).map((attr, index) => (
                                                        <span 
                                                            key={index}
                                                            className="bg-gray-700/50 px-2 py-1 rounded text-xs text-gray-300"
                                                        >
                                                            {attr.trait_type}: {attr.value}
                                                        </span>
                                                    ))}
                                                    {currentAsset.nftMetadata.raw.metadata.attributes.length > 4 && (
                                                        <span className="text-gray-500 text-xs">
                                                            +{currentAsset.nftMetadata.raw.metadata.attributes.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {currentAsset?.uri && (
                                            <div>
                                                <span className="text-gray-300 font-medium">URI:</span>
                                                <a 
                                                    href={currentAsset.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 ml-2 transition-colors block mt-1"
                                                    title={`View on IPFS: ${currentAsset.uri}`}
                                                >
                                                    <span className="break-all">
                                                        {currentAsset.uri.length > 50 
                                                            ? `${currentAsset.uri.substring(0, 30)}...${currentAsset.uri.substring(currentAsset.uri.length - 20)}`
                                                            : currentAsset.uri
                                                        }
                                                    </span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <LicenseCard asset={currentAsset} />
                            <CurrencyFlowDisplay asset={currentAsset} />
                        <div className="space-y-4 pt-6 border-t border-gray-800">
                            <h3 className="text-lg font-semibold text-gray-100 mb-4">Key Details</h3>
                            <DetailRow label="IP ID" value={currentAsset?.ipId} />
                            <DetailRow label="Media Type" value={mediaTypeDisplay} />
                            <DetailRow label="Creator" value={creatorName} />
                            <DetailRow label="Date Created" value={formattedDate} />
                            <DetailRow 
                                label="Direct Derivative Works" 
                                value={currentAsset?.childrenCount?.toLocaleString() || "0"} 
                            />
                            <DetailRow 
                                label="Total Descendants" 
                                value={currentAsset?.descendantsCount?.toLocaleString() || "0"}
                            />
                            {currentAsset?.tokenContract && <DetailRow label="Token Contract" value={currentAsset.tokenContract} />}
                        </div>
                        </div>
                    </div>
                )}
                {activeTab === 'derivatives' && (
                    <div 
                        id="derivatives-panel"
                        role="tabpanel"
                        aria-labelledby="derivatives-tab"
                        tabIndex={0}
                    >
                        <ChildrenList ipId={currentAsset?.ipId} isOpen={true} totalCount={currentAsset?.childrenCount || 0} />
                    </div>
                )}
                {activeTab === 'ledger' && (
                    <div 
                        id="ledger-panel"
                        role="tabpanel"
                        aria-labelledby="ledger-tab"
                        tabIndex={0}
                    >
                        <RoyaltyLedgerTab ipId={currentAsset?.ipId} />
                    </div>
                )}
                {activeTab === 'licensees' && (
                    <div 
                        id="licensees-panel"
                        role="tabpanel"
                        aria-labelledby="licensees-tab"
                        tabIndex={0}
                    >
                        <TopLicenseesTab ipId={currentAsset?.ipId} />
                    </div>
                )}
            </div>
        </div>
        <footer className="p-4 sm:p-6 flex-shrink-0 border-t border-gray-800">
            <a 
                href={`https://explorer.story.foundation/ipa/${currentAsset?.ipId}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full text-center block p-3 font-medium bg-gray-800 rounded-lg hover:bg-gray-700 transition-smooth text-gray-100 border border-gray-700 hover:border-gray-600 focus-ring-primary"
                aria-label={`View ${currentAsset?.title || 'this asset'} on Story Protocol Explorer (opens in new tab)`}
            >
                View on Explorer
            </a>
        </footer>
      </div>
    </div>
  );
};

// Ubah nama export agar sesuai dengan import di AssetDetailPage
export default RemixDetailModalContent;