import React from 'react';
import LicenseCard from './LicenseCard'; 
import DetailRow from './DetailRow'; 

// Placeholder Chart Component (tetap sama)
const PlaceholderChart = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg shadow-lg bg-gray-700/50 border border-gray-700/80`}>
        <p className="text-sm font-medium text-gray-400 mb-2">{title}</p>
        <div className={`h-20 flex items-end p-2 bg-gray-800 rounded-md relative overflow-hidden`}>
            {/* Simulation of a bar chart */}
            <div className={`w-full absolute bottom-0 left-0 h-[${value}%] ${color} rounded-t-sm transition-all duration-1000`}></div>
            <p className="relative text-lg font-bold text-white z-10">{value}K</p>
        </div>
    </div>
);

const AssetDetailPanel = ({ asset, onClose }) => {
    // ... (Logika Asset Null tetap sama)
    if (!asset) {
        return (
            <div className="sticky top-4 h-[calc(100vh-6rem)] bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-purple-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">Pilih Aset</h3>
                <p className="text-gray-400 text-sm mt-1">Klik pada kartu hasil pencarian untuk melihat analitik detail di sini.</p>
            </div>
        );
    }

    const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'N/A';

    const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Unknown Creator';
    
    // Tampilkan Parent IP ID jika ada
    const parentIpId = asset.parents && asset.parents.length > 0 && asset.parents[0].ipId !== '0x0000000000000000000000000000000000000000' ? asset.parents[0].ipId : null;
    const parentIpName = asset.parents && asset.parents.length > 0 && asset.parents[0].name || 'N/A';
    
    const parentDisplay = parentIpId ? `${parentIpName} (ID: ${parentIpId.substring(0, 6)}...)` : 'Original/Root Asset';

    // Handler Simulasi Enforcement
    const initiateEnforcement = () => {
        alert(`Simulasi: Initiating enforcement action for asset ID ${asset.ipId}. In a real application, this would trigger an on-chain dispute or DMCA notice.`);
    };

    return (
        <div className="sticky top-4 h-[calc(100vh-6rem)] bg-gray-800 border border-purple-600 rounded-2xl shadow-2xl p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-3">
                <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 line-clamp-2">
                    {asset.title} 
                    <span className="ml-2 text-xs font-semibold text-purple-400 bg-purple-900/30 px-2 py-1 rounded-full">SELECTED</span>
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 -mt-1 -mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {/* Image Preview */}
            <div className="w-full h-48 bg-gray-700 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                {asset.mediaUrl ? (
                    <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain p-2" />
                ) : (
                    <div className="p-8 text-gray-500">No Image Preview</div>
                )}
            </div>
            
            {/* License Card */}
            <div className='mb-6'>
                <LicenseCard asset={asset} />
            </div>

            {/* Placeholder Visualisasi Data */}
            <div className='grid grid-cols-2 gap-4 mb-6'>
                <PlaceholderChart title="Estimated Views (30D)" value="24" color="bg-pink-500" />
                <PlaceholderChart title="License Minted (Total)" value="8" color="bg-cyan-500" />
            </div>

            {/* Details List (Scrollable) */}
            <div className="flex-grow space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                <DetailRow label="Description" value={asset.description} />
                <DetailRow label="IP ID" value={asset.ipId} />
                <DetailRow label="Parent IP" value={parentDisplay} />
                <DetailRow label="Media Type" value={asset.mediaType} />
                <DetailRow label="Similarity Score" value={asset.similarity ? asset.similarity.toFixed(4) : 'N/A'} />
                <DetailRow label="Remix Children" value={asset.parentsCount} />
                <DetailRow label="Creator" value={creatorName} />
                <DetailRow label="Contract Address" value={asset.nftMetadata?.contract_address} />
                <DetailRow label="Date Created" value={formattedDate} />
            </div>
            
            {/* Footer / Action Area (Menambahkan Tombol Enforcement) */}
            <div className="mt-6 pt-4 border-t border-gray-700/50 flex flex-col gap-3">
                <button 
                    onClick={initiateEnforcement}
                    className="w-full inline-flex items-center justify-center p-3 font-bold bg-red-600 rounded-xl hover:bg-red-700 transition-colors text-white shadow-lg"
                >
                    Initiate Enforcement Action
                </button>
                <a 
                    href={`https://explorer.storyprotocol.xyz/ip-assets/${asset.ipId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center p-3 font-bold bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors text-white"
                >
                    View on Story Explorer
                </a>
            </div>
        </div>
    );
};

export default AssetDetailPanel;