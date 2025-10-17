import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LicenseCard from './LicenseCard';
import DetailRow from './DetailRow';
import ChildrenList from './ChildrenList';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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


// Komponen untuk tab "Royalty Ledger"
const RoyaltyLedgerTab = ({ ipId }) => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!ipId) return;
        const fetchLedger = async () => {
            setIsLoading(true);
            setError(null);
            try {
                try {
                    const response = await axios.get(`${API_BASE_URL}/assets/${ipId}/royalty-transactions`);
                    setTransactions(response.data || []);
                } catch (errPrimary) {
                    // Fallback ke alias lama jika tersedia
                    const response2 = await axios.get(`${API_BASE_URL}/assets/${ipId}/transactions`);
                    setTransactions(response2.data || []);
                }
            } catch (err) {
                const errorMessage = err.response?.data?.message || "Failed to load royalty ledger.";
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLedger();
    }, [ipId]);

   if (isLoading) return <div className="text-center p-6 text-purple-400">Loading Royalty Ledger...</div>;
    if (error) return <div className="text-center p-6 text-red-400 bg-red-900/30 rounded-lg break-words">{error}</div>;
    if (transactions.length === 0) return <div className="text-center p-6 text-gray-500">No royalty payment events found.</div>;

    return (
        <div className="space-y-3 text-sm">
            {transactions.map(tx => (
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
  const [detail, setDetail] = useState(asset);
  const [totalChildren, setTotalChildren] = useState(asset?.childrenCount || null);
  const [totalDescendants, setTotalDescendants] = useState(asset?.descendantsCount || null);
  const [loadingChildren, setLoadingChildren] = useState(!asset?.childrenCount);

  useEffect(() => {
    setActiveTab('details');
  }, [asset?.ipId]);

  // Fetch detail saat modal dibuka
  useEffect(() => {
    let cancelled = false;
    setDetail(asset);
    
    // If we already have childrenCount from props, don't show loading
    if (asset?.childrenCount !== undefined) {
      setTotalChildren(asset.childrenCount);
      setTotalDescendants(asset.descendantsCount || asset.childrenCount);
      setLoadingChildren(false);
    } else {
      setLoadingChildren(true);
    }
    
    const load = async () => {
      try {
        if (!asset?.ipId) {
          if (!cancelled) {
            setLoadingChildren(false);
          }
          return;
        }
        const resp = await axios.get(`${API_BASE_URL}/assets/${asset.ipId}`);
        if (!cancelled) {
          const assetData = resp.data || asset;
          setDetail(assetData);
          
          // Debug logging
          console.log('Asset Detail API Response:', {
            childrenCount: assetData.childrenCount,
            descendantsCount: assetData.descendantsCount,
            assetData: assetData
          });
          
          // Use childrenCount and descendantsCount from API response
          setTotalChildren(assetData.childrenCount || 0);
          setTotalDescendants(assetData.descendantsCount || 0);
          setLoadingChildren(false);
        }
      } catch (_) {
        // keep minimal detail and use asset data if available
        if (!cancelled) {
          setTotalChildren(asset?.childrenCount || 0);
          setTotalDescendants(asset?.descendantsCount || 0);
          setLoadingChildren(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [asset?.ipId]);

  const formattedDate = detail?.createdAt ? new Date(detail.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not Provided';
  const creatorName = detail?.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Not Provided';
  // Determine media type with better fallback logic
  const getMediaType = () => {
    if (detail?.mediaType && detail.mediaType !== 'UNKNOWN') {
      return detail.mediaType;
    }
    
    // Fallback: try to determine from nftMetadata
    const imageUrl = detail?.nftMetadata?.image?.cachedUrl || 
                    detail?.nftMetadata?.raw?.metadata?.image || 
                    detail?.nftMetadata?.image?.originalUrl;
    
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
  
  const mediaTypeDisplay = getMediaType();
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
                      src={getImageUrl(detail)}
                      alt="Asset Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight line-clamp-2">{detail?.title || 'Untitled Asset'}</h2>
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
                <button onClick={() => setActiveTab('details')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'details' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Details</button>
                <button onClick={() => setActiveTab('derivatives')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'derivatives' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Derivative Works</button>
                <button onClick={() => setActiveTab('ledger')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'ledger' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Royalty Ledger</button>
                <button onClick={() => setActiveTab('licensees')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'licensees' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Top Licensees</button>
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
                                        src={getImageUrl(detail)}
                                        alt={detail?.title || 'Asset Preview'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }}
                                    />
                                </div>
                                
                                {/* Description */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-purple-300 mb-3">Description</h3>
                                    <p className="text-gray-300 leading-relaxed">
                                        {detail?.description || detail?.nftMetadata?.description || 'No description available.'}
                                    </p>
                                    
                                    {/* Additional Metadata */}
                                    <div className="mt-4 space-y-2 text-sm">
                                        {detail?.nftMetadata?.raw?.metadata?.attributes && (
                                            <div>
                                                <span className="text-purple-300 font-medium">Attributes:</span>
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    {detail.nftMetadata.raw.metadata.attributes.slice(0, 4).map((attr, index) => (
                                                        <span 
                                                            key={index}
                                                            className="bg-gray-700/50 px-2 py-1 rounded text-xs text-gray-300"
                                                        >
                                                            {attr.trait_type}: {attr.value}
                                                        </span>
                                                    ))}
                                                    {detail.nftMetadata.raw.metadata.attributes.length > 4 && (
                                                        <span className="text-gray-500 text-xs">
                                                            +{detail.nftMetadata.raw.metadata.attributes.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {detail?.uri && (
                                            <div>
                                                <span className="text-purple-300 font-medium">URI:</span>
                                                <a 
                                                    href={detail.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 ml-2 transition-colors break-all"
                                                    title="View on IPFS"
                                                >
                                                    {detail.uri}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <LicenseCard asset={detail} />
                        <div className="space-y-1 pt-4 border-t border-gray-700 text-sm">
                            <h3 className="font-semibold text-purple-300 mb-2">Key Details</h3>
                            <DetailRow label="IP ID" value={detail?.ipId} />
                            <DetailRow label="Media Type" value={mediaTypeDisplay} />
                            <DetailRow label="Creator" value={creatorName} />
                            <DetailRow label="Date Created" value={formattedDate} />
                            <DetailRow 
                                label="Direct Derivative Works" 
                                value={loadingChildren ? "Loading..." : (totalChildren !== null ? totalChildren.toLocaleString() : "0")} 
                            />
                            <DetailRow 
                                label="Total Descendants" 
                                value={loadingChildren ? "Loading..." : (totalDescendants !== null ? totalDescendants.toLocaleString() : "0")} 
                            />
                            {detail?.tokenContract && <DetailRow label="Token Contract" value={detail.tokenContract} />}
                        </div>
                    </div>
                )}
                {activeTab === 'derivatives' && <ChildrenList ipId={detail?.ipId} isOpen={true} totalCount={totalChildren || 0} />}
                {activeTab === 'ledger' && <RoyaltyLedgerTab ipId={detail?.ipId} />}
                {activeTab === 'licensees' && <TopLicenseesTab ipId={detail?.ipId} />}
            </div>
        </div>
        <footer className="p-6 flex-shrink-0 border-t border-purple-900/50">
            <a href={`https://explorer.story.foundation/ipa/${detail?.ipId}`} target="_blank" rel="noopener noreferrer" className="w-full text-center block p-3 font-bold bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors text-white">
                View on Explorer
            </a>
        </footer>
      </div>
    </div>
  );
};

// Ubah nama export agar sesuai dengan import di AssetDetailPage
export default RemixDetailModalContent;