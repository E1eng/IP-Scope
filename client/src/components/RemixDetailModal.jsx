import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LicenseCard from './LicenseCard';
import DetailRow from './DetailRow';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Komponen untuk menampilkan panel analitik on-chain
const AnalyticsPanel = ({ asset }) => {
    const analytics = asset?.analytics;

    // Tampilkan pesan loading jika data analitik belum ada
    if (!analytics) {
        return <div className="p-4 text-center text-purple-400">Loading analytics...</div>;
    }
    // Tampilkan pesan error jika terjadi kesalahan saat mengambil analitik
    if (analytics.errorMessage) {
        return (
            <div className="bg-red-900/40 p-4 rounded-lg border border-red-700">
                <h3 className='text-md font-semibold text-red-300'>Analytics Error</h3>
                <p className="text-xs text-red-200 font-mono">{analytics.errorMessage}</p>
            </div>
        );
    }
    
    // Menggunakan struktur data 'totalRoyaltiesPaid' yang baru (object)
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
                // Endpoint ini perlu ada di backend Anda
                const response = await axios.get(`${API_BASE_URL}/assets/${ipId}/royalty-transactions`);
                setTransactions(response.data || []);
            } catch (err) {
                setError("Failed to load royalty ledger.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLedger();
    }, [ipId]);

    if (isLoading) return <div className="text-center p-6 text-purple-400">Loading Royalty Ledger...</div>;
    if (error) return <div className="text-center p-6 text-red-400 bg-red-900/30 rounded-lg">{error}</div>;
    if (transactions.length === 0) return <div className="text-center p-6 text-gray-500">No royalty payment events found.</div>;

    return (
        <div className="space-y-3 text-sm">
            {transactions.map(tx => (
                <div key={tx.txHash} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-xs text-blue-400">{tx.txHash.substring(0, 12)}...</span>
                        <span className="font-bold text-lg text-green-400">{tx.value}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>From: <span className="font-mono">{tx.from.substring(0, 12)}...</span></span>
                        <span>{new Date(tx.timestamp).toLocaleString('en-US')}</span>
                        <a href={`https://storyscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline font-semibold">
                            &#x2197; View on Explorer
                        </a>
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
                // Endpoint ini perlu ada di backend Anda
                const response = await axios.get(`${API_BASE_URL}/assets/${ipId}/top-licensees`);
                setLicensees(response.data || []);
            } catch (err) {
                setError("Failed to load top licensees.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLicensees();
    }, [ipId]);

    if (isLoading) return <div className="text-center p-4">Loading Top Licensees...</div>;
    if (error) return <div className="text-center p-4 text-red-400 bg-red-900/30 rounded-lg">{error}</div>;
    if (licensees.length === 0) return <div className="text-center p-4 text-gray-500">No licensees found.</div>;
    
    return (
        <div className="space-y-2 text-xs">
            {licensees.map((lic, index) => (
                <div key={lic.address} className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex justify-between items-center">
                        <p className="font-mono text-white">#{index + 1}: {lic.address.substring(0, 12)}...</p>
                        <p className="font-bold text-purple-400">{lic.count} payments</p>
                    </div>
                    <p className="text-right text-sm font-semibold text-green-400 mt-1">{lic.totalValue}</p>
                </div>
            ))}
        </div>
    );
};

// Komponen Utama Modal
const RemixDetailModal = ({ asset, onClose, isLoading }) => {
  const [activeTab, setActiveTab] = useState('details');

  // Efek untuk mereset tab ke 'details' setiap kali aset baru dipilih
  useEffect(() => {
    setActiveTab('details');
  }, [asset?.ipId]);

  // Tampilan saat memuat
  if (isLoading || !asset) {
    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
            <div className="p-6 bg-gray-800 rounded-2xl text-purple-400 flex items-center shadow-2xl border border-purple-800">
                <div className="animate-spin h-6 w-6 mr-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                Loading Asset Details...
            </div>
        </div>
    );
  }
  
  // Tampilan saat terjadi error
  if (asset.isError) {
      return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-red-900/50 border border-red-700 rounded-lg w-full max-w-lg p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-red-400 mb-2">{asset.title || 'Error'}</h2>
                <p className="text-red-300 mb-4">{asset.description || 'Could not load asset details.'}</p>
                <p className="text-sm text-gray-400">Asset ID: {asset.ipId}</p>
                <button onClick={onClose} className="mt-4 p-3 font-bold bg-red-600 rounded-xl hover:bg-red-700 text-white">Close</button>
            </div>
        </div>
      );
  }

  // Format data dengan nilai default yang informatif
  const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not Provided';
  const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Not Provided';
  const mediaTypeDisplay = asset.mediaType === 'UNKNOWN' ? 'Not Specified' : asset.mediaType;

  return (
    <div 
      id="remix-modal"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-purple-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 flex-shrink-0 border-b border-purple-900/50">
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-white tracking-tight line-clamp-2 pr-10">{asset.title || 'Untitled Asset'}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
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
                        <AnalyticsPanel asset={asset} />
                        <LicenseCard asset={asset} />
                        <div className="space-y-1 pt-4 border-t border-gray-700 text-sm">
                            <h3 className="font-semibold text-purple-300 mb-2">Key Details</h3>
                            <DetailRow label="IP ID" value={asset.ipId} />
                            <DetailRow label="Media Type" value={mediaTypeDisplay} />
                            <DetailRow label="Creator" value={creatorName} />
                            <DetailRow label="Date Created" value={formattedDate} />
                        </div>
                    </div>
                )}
                {activeTab === 'ledger' && <RoyaltyLedgerTab ipId={asset.ipId} />}
                {activeTab === 'licensees' && <TopLicenseesTab ipId={asset.ipId} />}
            </div>
        </div>
        <footer className="p-6 flex-shrink-0 border-t border-purple-900/50">
            <a href={`https://explorer.story.foundation/ipa/${asset.ipId}`} target="_blank" rel="noopener noreferrer" className="w-full text-center block p-3 font-bold bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors text-white">
                View on Explorer
            </a>
        </footer>
      </div>
    </div>
  );
};

export default RemixDetailModal;