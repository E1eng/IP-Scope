import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import LicenseCard from './LicenseCard';
import DetailRow from './DetailRow';
import ChildrenList from './ChildrenList';
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
                <h3 className="font-semibold text-lg mb-3 text-purple-300">
                    💰 Royalty Flow
                </h3>
                <div className="text-center text-gray-400">Loading currency data...</div>
            </div>
        );
    }

    if (!currencyData || Object.keys(currencyData).length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700/50">
                <h3 className="font-semibold text-lg mb-3 text-purple-300">
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
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700/50">
            <h3 className="font-semibold text-lg mb-3 text-purple-300">
                💰 Royalty Flow
            </h3>
            <div className="space-y-3">
                {sortedCurrencies.map(([symbol, value]) => (
                    <div key={symbol} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                symbol === 'WIP' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                                symbol === 'IP' ? 'bg-gradient-to-br from-blue-500 to-purple-500' :
                                'bg-gradient-to-br from-purple-500 to-blue-500'
                            }`}>
                                {symbol.charAt(0)}
                            </div>
                            <div>
                                <span className="text-gray-300 font-medium">{symbol}</span>
                                <div className="text-xs text-gray-400">Royalty Token</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-yellow-400 font-bold text-lg">{value}</span>
                            <div className="text-xs text-gray-400">Total Earned</div>
                        </div>
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

   if (isLoading) return <div className="text-center p-6 text-purple-400">Loading Royalty Ledger...</div>;
    if (error) return <div className="text-center p-6 text-red-400 bg-red-900/30 rounded-lg break-words">{error}</div>;
    if (transactions.length === 0) return <div className="text-center p-6 text-gray-500">No royalty payment events found.</div>;

    return (
        <div className="space-y-3 text-sm">
            {/* Header dengan total count */}
            <div className="flex justify-between items-center mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <span className="text-purple-300 font-semibold">
                    Showing {totalCount === 0 ? 0 : startIndex + 1}-{endIndex} of {totalCount} transactions
                </span>
                <span className="text-gray-400 text-sm">
                    Total Royalty: {transactions.reduce((sum, tx) => {
                        // Parse value string like "0.05 WIP" or "0.1 IP"
                        const valueStr = tx.value || '0';
                        const match = valueStr.match(/(\d+\.?\d*)/);
                        return sum + (match ? parseFloat(match[1]) : 0);
                    }, 0).toFixed(6)} WIP
                </span>
            </div>

            {/* Progress bar removed per request */}
            
            {/* Transactions list */}
            {visibleTransactions.map(tx => (
                <div key={tx.txHash} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-purple-600 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-sm text-green-400 font-bold">{tx.value}</span>
                        <a href={`https://storyscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-xs font-semibold flex items-center">
                            View Tx &#x2197;
                        </a>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                        {/* --- PERUBAHAN UTAMA DI SINI --- */}
                        <span className="truncate max-w-[40%]">
                            From: <span className="font-mono">
                                {typeof tx.from === 'string' ? `${tx.from.substring(0, 8)}...` : 'N/A'}
                            </span>
                        </span>
                        <span>{tx.timestamp}</span>
                    </div>
                </div>
            ))}
            
            {/* Pagination Controls */}
            {totalCount > pageSize && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <button onClick={goPrev} disabled={currentPage === 1} className="px-3 py-1 rounded bg-gray-800 text-gray-200 disabled:opacity-50">
                        Prev
                    </button>
                    <span className="text-gray-400 text-xs">
                        Page {currentPage} / {totalPages}
                    </span>
                    <button onClick={goNext} disabled={currentPage === totalPages} className="px-3 py-1 rounded bg-gray-800 text-gray-200 disabled:opacity-50">
                        Next
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

    if (isLoading) return <div className="text-center p-4 text-purple-400">Loading Top Licensees...</div>;
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
                        <p className="font-mono text-gray-300 text-xs truncate max-w-[150px]" title={lic.address}>
                            {lic.address.substring(0, 10)}...
                        </p>
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

  // DEBUG: Log asset data to see what we're receiving
  // console.log('[MODAL DEBUG] Asset prop received:', {
  //   title: asset?.title,
  //   creator: asset?.creator,
  //   ipId: asset?.ipId,
  //   fullAsset: asset
  // });

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
    
    // console.log('[MODAL DEBUG] currentAsset recalculated:', {
    //   hasDetail: !!detail,
    //   hasAsset: !!asset,
    //   title: result?.title,
    //   creator: result?.creator,
    //   mediaType: result?.mediaType,
    //   nftMetadata: result?.nftMetadata ? 'exists' : 'missing',
    //   merged: detail && asset ? 'yes' : 'no'
    // });
    return result;
  }, [detail, asset]);
  
  // Calculate derived values that depend on currentAsset
  const formattedDate = useMemo(() => {
    const result = currentAsset?.createdAt ? new Date(currentAsset.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not Provided';
    // console.log('[MODAL DEBUG] formattedDate recalculated:', result);
    return result;
  }, [currentAsset]);
  
  const creatorName = useMemo(() => {
    const result = asset?.creator || currentAsset?.creator || currentAsset?.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Not Provided';
    // console.log('[MODAL DEBUG] creatorName recalculated:', result);
    return result;
  }, [currentAsset, asset]);
  // Determine media type with better fallback logic
  const mediaTypeDisplay = useMemo(() => {
    // First try: nftMetadata.raw.metadata.mediaType
    if (currentAsset?.nftMetadata?.raw?.metadata?.mediaType) {
      // console.log('[MODAL DEBUG] mediaType from nftMetadata.raw.metadata:', currentAsset.nftMetadata.raw.metadata.mediaType);
      return currentAsset.nftMetadata.raw.metadata.mediaType;
    }
    
    // Second try: nftMetadata.image.contentType
    if (currentAsset?.nftMetadata?.image?.contentType) {
      const contentType = currentAsset.nftMetadata.image.contentType.toLowerCase();
      if (contentType.startsWith('image/')) {
        // console.log('[MODAL DEBUG] mediaType from contentType: IMAGE');
        return 'IMAGE';
      }
      if (contentType.startsWith('video/')) {
        // console.log('[MODAL DEBUG] mediaType from contentType: VIDEO');
        return 'VIDEO';
      }
      if (contentType.startsWith('audio/')) {
        // console.log('[MODAL DEBUG] mediaType from contentType: AUDIO');
        return 'AUDIO';
      }
    }
    
    // Third try: currentAsset.mediaType
    if (currentAsset?.mediaType && currentAsset.mediaType !== 'UNKNOWN') {
      // console.log('[MODAL DEBUG] mediaType from currentAsset.mediaType:', currentAsset.mediaType);
      return currentAsset.mediaType;
    }
    
    // Fourth try: determine from image URL extension
    const imageUrl = currentAsset?.nftMetadata?.image?.cachedUrl || 
                    currentAsset?.nftMetadata?.raw?.metadata?.image || 
                    currentAsset?.nftMetadata?.image?.originalUrl;
    
    if (imageUrl) {
      const extension = imageUrl.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        // console.log('[MODAL DEBUG] mediaType from extension: IMAGE');
        return 'IMAGE';
      }
      if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
        // console.log('[MODAL DEBUG] mediaType from extension: VIDEO');
        return 'VIDEO';
      }
      if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
        // console.log('[MODAL DEBUG] mediaType from extension: AUDIO');
        return 'AUDIO';
      }
    }
    
    // console.log('[MODAL DEBUG] mediaType: Not Specified');
    return 'Not Specified';
  }, [currentAsset]);
  // UI/UX: Rombak tampilan agar sesuai untuk halaman penuh.
return (
    <div 
      id="remix-modal"
      // Backdrop: Hitam/transparan, fixed, di tengah.
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in"
    >
      <div 
        // FIX KRITIS: Membatasi lebar (max-w-2xl) dan tinggi (max-h-[90vh]) agar modal muncul sebagai pop-up di tengah.
        className="bg-gray-900 border border-purple-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 flex-shrink-0 border-b border-purple-900/50">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4 pr-10">
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
                    <img
                      src={getImageUrl(currentAsset)}
                      alt="Asset Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight line-clamp-2">{currentAsset?.title || asset?.title || asset?.name || 'Untitled Asset'}</h2>
                </div>
                <button 
                    onClick={onClose} 
                    className="text-gray-400 hover:text-red-400 p-2 rounded-full transition-colors bg-gray-800"
                    title="Close and Back to Explorer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="flex mt-4 border-b border-gray-700">
                <button onClick={() => setActiveTab('details')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'details' ? 'text-gray-100 border-b-2 border-gray-300' : 'text-gray-400 hover:text-gray-200'}`}>Details</button>
                <button onClick={() => setActiveTab('derivatives')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'derivatives' ? 'text-gray-100 border-b-2 border-gray-300' : 'text-gray-400 hover:text-gray-2'}`}>Derivative Works</button>
                <button onClick={() => setActiveTab('ledger')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'ledger' ? 'text-gray-100 border-b-2 border-gray-300' : 'text-gray-400 hover:text-gray-200'}`}>Royalty Ledger</button>
                <button onClick={() => setActiveTab('licensees')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'licensees' ? 'text-gray-100 border-b-2 border-gray-300' : 'text-gray-400 hover:text-gray-200'}`}>Top Licensees</button>
            </div>
        </header>

        <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-grow">
            <div className="pt-6">
                {activeTab === 'details' && (
                    <div className="space-y-6">
                        {/* Asset Image and Description */}
                        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
                            <div className="flex gap-6">
                                {/* Large Image */}
                                <div className="w-48 h-48 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
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
                                                    className="text-gray-400 hover:text-gray-300 ml-2 transition-colors break-all"
                                                    title="View on IPFS"
                                                >
                                                    {currentAsset.uri}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <LicenseCard asset={currentAsset} />
                            <CurrencyFlowDisplay asset={currentAsset} />
                        <div className="space-y-1 pt-4 border-t border-gray-700 text-sm">
                            <h3 className="font-semibold text-purple-300 mb-2">Key Details</h3>
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
                )}
                {activeTab === 'derivatives' && <ChildrenList ipId={currentAsset?.ipId} isOpen={true} totalCount={currentAsset?.childrenCount || 0} />}
      {activeTab === 'ledger' && <RoyaltyLedgerTab ipId={currentAsset?.ipId} />}
                {activeTab === 'licensees' && <TopLicenseesTab ipId={currentAsset?.ipId} />}
            </div>
        </div>
        <footer className="p-6 flex-shrink-0 border-t border-purple-900/50">
            <a href={`https://explorer.story.foundation/ipa/${currentAsset?.ipId}`} target="_blank" rel="noopener noreferrer" className="w-full text-center block p-3 font-bold bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-gray-100 border border-gray-700">
                View on Explorer
            </a>
        </footer>
      </div>
    </div>
  );
};

// Ubah nama export agar sesuai dengan import di AssetDetailPage
export default RemixDetailModalContent;