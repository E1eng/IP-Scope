import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LicenseCard from './LicenseCard';
import DetailRow from './DetailRow';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Komponen Panel Analitik DIPERBARUI ---
const AnalyticsPanel = ({ analytics }) => {
    if (!analytics) {
        return <div className="p-4 text-yellow-400">Loading analytics...</div>;
    }

    if (analytics.errorMessage) {
        return (
            <div className="bg-red-900/40 p-4 rounded-lg mb-4 border border-red-700">
                <h3 className='text-md font-semibold text-red-300 mb-2'>Analytics Failed</h3>
                <p className="text-xs text-red-200 font-mono">{analytics.errorMessage}</p>
            </div>
        );
    }

    // Cek jika totalRoyaltiesPaid adalah array dan tidak kosong
    const hasRoyalties = Array.isArray(analytics.totalRoyaltiesPaid) && analytics.totalRoyaltiesPaid.length > 0;

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg mb-4 border border-gray-600">
            <h3 className='text-md font-semibold text-white mb-2'>On-Chain Analytics</h3>
            <DetailRow label="License Terms ID" value={analytics.licenseTermsId} />
            <DetailRow label="Royalty Split" value={analytics.royaltySplit} />
            
            {/* ▼▼▼ Logika Tampilan Baru untuk Total Royalti ▼▼▼ */}
            {hasRoyalties ? (
                analytics.totalRoyaltiesPaid.map(item => (
                    <DetailRow 
                        key={item.currency}
                        label={`Total Paid (${item.currency})`} 
                        value={item.totalValue} 
                    />
                ))
            ) : (
                <DetailRow label="Total Royalties Paid" value="0.0000" />
            )}

            <div className="flex justify-between items-center py-2">
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">Dispute Status</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${analytics.disputeStatus === 'Active' ? 'bg-red-500 text-white' : 'text-white'}`}>
                    {analytics.disputeStatus}
                </span>
            </div>
        </div>
    );
};
// ... (sisa kode modal tetap sama) ...
const RoyaltyLedgerTab = ({ ipId }) => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/assets/${ipId}/royalty-transactions`);
                setTransactions(response.data);
            } catch (err) {
                setError("Failed to load royalty ledger.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLedger();
    }, [ipId]);

    if (isLoading) return <div className="text-center p-4">Loading Royalty Ledger...</div>;
    if (error) return <div className="text-center p-4 text-red-400">{error}</div>;
    if (transactions.length === 0) return <div className="text-center p-4 text-gray-500">No royalty payment events found.</div>;

    return (
        <div className="space-y-2 text-xs">
            {transactions.map(tx => (
                <div key={tx.txHash} className="p-3 bg-gray-800/50 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-mono text-white">From: {tx.from.substring(0, 10)}...</p>
                        <p className="text-gray-400">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-green-400">{tx.value}</p>
                        <a href={`https://storyscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View on Story Scan</a>
                    </div>
                </div>
            ))}
        </div>
    );
};

const TopLicenseesTab = ({ ipId }) => {
    const [licensees, setLicensees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLicensees = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/assets/${ipId}/top-licensees`);
                setLicensees(response.data);
            } catch (err) {
                setError("Failed to load top licensees.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLicensees();
    }, [ipId]);

    if (isLoading) return <div className="text-center p-4">Loading Top Licensees...</div>;
    if (error) return <div className="text-center p-4 text-red-400">{error}</div>;
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

const RemixDetailModal = ({ asset, onClose, analytics, interactionType }) => {
    const [activeTab, setActiveTab] = useState('details');

    if (!asset || asset.isError) {
        // ... (penanganan error tetap sama)
      const title = asset?.title || 'Error Loading Details';
      const description = asset?.description || 'Could not fetch full details for this asset.';
      return (
        <div className={`fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-300`} onClick={onClose}>
            <div className="bg-red-900/50 border border-red-700 rounded-lg w-full max-w-lg p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-red-400 mb-2">{title}</h2>
                <p className="text-red-300 mb-4">{description}</p>
                <p className="text-sm text-gray-400">Asset ID: {asset?.ipId || 'N/A'}</p>
                <button onClick={onClose} className="mt-4 p-3 font-bold bg-red-600 rounded-xl hover:bg-red-700 text-white">Close</button>
            </div>
        </div>
      );
    }
  const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'N/A';

  const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Unknown Creator';

  const modalTitle = interactionType === 'link' ? `Link/License Details (${asset.ipId.substring(0, 8)})` : asset.title;


    return (
        <div 
          className={`fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-300`}
          onClick={onClose}
        >
        <div 
        className="modal bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border border-purple-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 shadow-2xl animate-fade-in"
        onClick={e => e.stopPropagation()}
        >
            <div className="p-7 flex-shrink-0">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-extrabold text-purple-300 tracking-tight line-clamp-2 pr-10">{modalTitle}</h2>
                    <button onClick={onClose} className="text-purple-400 hover:text-white transition-colors p-2 rounded-lg bg-purple-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {/* Navigasi Tab */}
                <div className="flex border-b border-purple-900 gap-2">
                    <button onClick={() => setActiveTab('details')} className={`py-2 px-6 font-semibold rounded-t-lg transition-colors ${activeTab === 'details' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>Details</button>
                    <button onClick={() => setActiveTab('ledger')} className={`py-2 px-6 font-semibold rounded-t-lg transition-colors ${activeTab === 'ledger' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>Royalty Ledger</button>
                    <button onClick={() => setActiveTab('licensees')} className={`py-2 px-6 font-semibold rounded-t-lg transition-colors ${activeTab === 'licensees' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>Top Licensees</button>
                </div>
            </div>

            <div className="px-7 pb-7 overflow-y-auto custom-scrollbar flex-grow">
                {/* Konten Tab */}
                {activeTab === 'details' && (
                    <div>
                        <div className="w-full h-32 bg-gradient-to-tr from-purple-900/30 via-gray-800/60 to-blue-900/30 rounded-xl my-5 overflow-hidden flex items-center justify-center border border-purple-900">
                            {asset.mediaUrl ? <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain p-2 drop-shadow-lg" /> : <div className="p-8 text-gray-500 text-sm">No Image</div>}
                        </div>
                        <div className='mb-5'><LicenseCard asset={asset} /></div>
                        <AnalyticsPanel analytics={analytics} />
                        <p className="text-gray-400 text-xs mb-4">{asset.description || 'No description.'}</p>
                        <div className="space-y-1 border-t border-gray-700 pt-3 text-sm">
                            <DetailRow label="IP ID" value={asset.ipId} />
                            <DetailRow label="Media Type" value={asset.mediaType} />
                            <DetailRow label="Creator" value={creatorName} />
                            <DetailRow label="Date Created" value={formattedDate} />
                        </div>
                    </div>
                )}
                {activeTab === 'ledger' && <RoyaltyLedgerTab ipId={asset.ipId} />}
                {activeTab === 'licensees' && <TopLicenseesTab ipId={asset.ipId} />}
            </div>
            <div className="p-7 flex-shrink-0 border-t border-purple-900">
                <a href={`https://explorer.story.foundation/ipa/${asset.ipId}`} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center p-3 font-bold bg-purple-600 rounded-md hover:bg-purple-700 transition-colors text-white">
                    View on Explorer
                </a>
            </div>
        </div>
        </div>
    );
};

export default RemixDetailModal;