import React from 'react';
import LicenseCard from './LicenseCard'; 
import DetailRow from './DetailRow'; 

// Placeholder Stat dibuat lebih halus
const PlaceholderStat = ({ title, value, colorClass }) => (
    <div className={`p-3 rounded-lg ${colorClass} flex flex-col justify-center items-start border border-gray-700/50 shadow-sm`}>
        <p className="text-xs font-light text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-semibold text-white mt-1">{value}</p>
    </div>
);

const AssetDetailPanel = ({ asset, onClose }) => {
    if (!asset) {
        // ... (Asset Null placeholder)
        return (
            <div className="sticky top-4 h-[calc(100vh-5rem)] bg-gray-800 border border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-purple-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">Select Asset</h3>
                <p className="text-gray-400 text-sm mt-1 font-light">View details and analytics here.</p>
            </div>
        );
    }

    const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'N/A';

    const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Unknown Creator';
    
    const parentIpId = asset.parents && asset.parents.length > 0 && asset.parents[0].ipId !== '0x0000000000000000000000000000000000000000' ? asset.parents[0].ipId : null;
    const parentIpName = asset.parents && asset.parents.length > 0 && asset.parents[0].name || 'N/A';
    const parentDisplay = parentIpId ? `${parentIpName} (ID: ${parentIpId.substring(0, 6)}...)` : 'Original/Root Asset';

    const initiateEnforcement = () => {
        alert(`Simulasi: Initiating enforcement action for asset ID ${asset.ipId}. In a real application, this would trigger an on-chain dispute or DMCA notice.`);
    };

    return (
        // Container Utama (Fixed Height, Minimalist Border)
        <div className="sticky top-4 h-[calc(100vh-5rem)] bg-gray-800 border border-gray-700 rounded-lg p-5 flex flex-col overflow-hidden shadow-2xl">
            
            {/* Header: Title dan Close Button */}
            <div className="flex justify-between items-start pb-3 mb-4 border-b border-gray-700">
                <div>
                    <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 line-clamp-1">
                        {asset.title} 
                    </h1>
                    <span className="text-xs font-light text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded mt-1 inline-block">SELECTED</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 -mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {/* KONTEN UTAMA: Flex Scrollable Area */}
            <div className="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">

                {/* Compact Asset Visuals & Description */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image (Kecil, Border Halus) */}
                    <div className="w-full sm:w-1/3 h-28 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center border border-gray-600 flex-shrink-0">
                        {asset.mediaUrl ? (
                            <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain p-1" />
                        ) : (
                            <div className="p-4 text-gray-500 text-xs">No Image</div>
                        )}
                    </div>
                    {/* Short Description */}
                    <div className='flex-grow'>
                        <p className="text-sm font-light text-gray-400 mb-1">Description</p>
                        <p className="text-xs text-gray-300 font-light line-clamp-5 max-h-24 overflow-hidden">
                            {asset.description || 'No description available.'}
                        </p>
                    </div>
                </div>

                {/* Lisensi & Royalti (Di bawah Description) */}
                <LicenseCard asset={asset} />

                {/* Stat Grid (Minimalis) */}
                <div className='grid grid-cols-2 gap-3'>
                    <PlaceholderStat title="Similarity Score" value={asset.similarity ? asset.similarity.toFixed(4) : 'N/A'} colorClass="bg-pink-900/10 text-pink-300" />
                    <PlaceholderStat title="Remix Children" value={asset.parentsCount} colorClass="bg-cyan-900/10 text-cyan-300" />
                </div>


                {/* Detail List */}
                <div className="space-y-1 pt-3 border-t border-gray-700/50 text-sm">
                    <h3 className="font-semibold text-white mb-2">Key Details</h3>
                    <DetailRow label="IP ID" value={asset.ipId} />
                    <DetailRow label="Media Type" value={asset.mediaType} />
                    <DetailRow label="Parent IP" value={parentDisplay} />
                    <DetailRow label="Creator" value={creatorName} />
                    <DetailRow label="Contract Address" value={asset.nftMetadata?.contract_address} />
                    <DetailRow label="Date Created" value={formattedDate} />
                </div>
            </div>
            
            {/* Footer / Action Area (Fixed Position) */}
            <div className="mt-5 pt-3 border-t border-gray-700 flex flex-col gap-2 flex-shrink-0">
                <button 
                    onClick={initiateEnforcement}
                    className="w-full inline-flex items-center justify-center p-3 font-semibold bg-red-600 rounded-md hover:bg-red-700 transition-colors text-white shadow-md"
                >
                    Initiate Enforcement Action
                </button>
                <a 
                    href={`https://explorer.storyprotocol.xyz/ip-assets/${asset.ipId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center p-3 font-semibold bg-purple-600 rounded-md hover:bg-purple-700 transition-colors text-white"
                >
                    View on Explorer
                </a>
            </div>
        </div>
    );
};

export default AssetDetailPanel;