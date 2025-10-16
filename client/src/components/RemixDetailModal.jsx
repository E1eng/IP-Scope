import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LicenseCard from './LicenseCard';
import DetailRow from './DetailRow';
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

// Komponen untuk menampilkan panel analitik on-chain
const AnalyticsPanel = ({ asset, loading }) => {
    const analytics = asset?.analytics;
    if (loading) return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="animate-pulse space-y-3">
                <div className="h-4 w-40 bg-gray-700 rounded" />
                <div className="h-5 w-24 bg-gray-700 rounded" />
                <div className="h-3 w-full bg-gray-700 rounded" />
                <div className="h-3 w-5/6 bg-gray-700 rounded" />
                <div className="h-3 w-4/6 bg-gray-700 rounded" />
            </div>
        </div>
    );
    if (!analytics) return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-center text-gray-400">
            No analytics available.
        </div>
    );
    // Tampilkan pesan error jika terjadi kesalahan saat mengambil analitik
    if (analytics.errorMessage) {
        return (
            <div className="bg-red-900/40 p-4 rounded-lg border border-red-700">
                <h3 className='text-md font-semibold text-red-300 mb-2'>Analytics Error</h3>
                <p className="text-xs text-red-200 font-mono break-words">{analytics.errorMessage}</p>
            </div>
        );
    }
    
    const royalties = analytics.totalRoyaltiesPaid || {};
    const royaltyEntries = Object.entries(royalties);

    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h3 className='text-md font-semibold text-purple-300 mb-3'>On-Chain Analytics</h3>
            <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-purple-900/50">
                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">Dispute Status</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${analytics.disputeStatus === 'Active' ? 'bg-red-500 text-white' : 'bg-green-500/20 text-green-300'}`}>
                        {analytics.disputeStatus || 'None'}
                    </span>
                </div>
                {royaltyEntries.length > 0 ? (
                    royaltyEntries.map(([currency, totalValue]) => (
                        <DetailRow key={currency} label={`Total Paid (${currency})`} value={totalValue} />
                    ))
                ) : (
                    <DetailRow label="Total Royalties Paid" value="0.0000" />
                )}
            </div>
        </div>
    );
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

    if (isLoading) return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="animate-pulse">
                        <div className="flex justify-between items-center mb-2">
                            <div className="h-4 w-24 bg-gray-700 rounded" />
                            <div className="h-3 w-16 bg-gray-700 rounded" />
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="h-3 w-48 bg-gray-700 rounded" />
                            <div className="h-3 w-24 bg-gray-700 rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
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

    if (isLoading) return (
        <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="animate-pulse flex justify-between items-center">
                        <div className="h-4 w-40 bg-gray-700 rounded" />
                        <div className="h-4 w-20 bg-gray-700 rounded" />
                    </div>
                </div>
            ))}
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
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    setActiveTab('details');
  }, [asset?.ipId]);

  // Fetch detail + analytics saat modal dibuka
  useEffect(() => {
    let cancelled = false;
    setDetail(asset);
    setAnalyticsLoading(true);
    const load = async () => {
      try {
        if (!asset?.ipId) return;
        const resp = await axios.get(`${API_BASE_URL}/assets/${asset.ipId}`);
        if (!cancelled) setDetail(resp.data || asset);
      } catch (_) {
        // keep minimal detail
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [asset?.ipId]);

  const formattedDate = detail?.createdAt ? new Date(detail.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not Provided';
  const creatorName = detail?.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Not Provided';
  const mediaTypeDisplay = detail?.mediaType === 'UNKNOWN' ? 'Not Specified' : (detail?.mediaType || 'Not Specified');
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
                <button onClick={() => setActiveTab('ledger')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'ledger' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Royalty Ledger</button>
                <button onClick={() => setActiveTab('licensees')} className={`py-2 px-5 font-semibold transition-colors ${activeTab === 'licensees' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>Top Licensees</button>
            </div>
        </header>

        <div className="px-6 pb-6 overflow-y-auto custom-scrollbar flex-grow">
            <div className="pt-6">
                {activeTab === 'details' && (
                    <div className="space-y-6">
                        <AnalyticsPanel asset={detail} loading={analyticsLoading} />
                        <LicenseCard asset={detail} />
                        <div className="space-y-1 pt-4 border-t border-gray-700 text-sm">
                            <h3 className="font-semibold text-purple-300 mb-2">Key Details</h3>
                            <DetailRow label="IP ID" value={detail?.ipId} />
                            <DetailRow label="Media Type" value={mediaTypeDisplay} />
                            <DetailRow label="Creator" value={creatorName} />
                            <DetailRow label="Date Created" value={formattedDate} />
                            {detail?.tokenContract && <DetailRow label="Token Contract" value={detail.tokenContract} />}
                        </div>
                    </div>
                )}
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