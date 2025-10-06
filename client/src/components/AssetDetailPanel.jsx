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
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" style={{ pointerEvents: 'auto' }} onClick={onClose}>
                <div className="w-full max-w-2xl bg-[#181A20] border border-[#23262F] rounded-2xl p-4 sm:p-8 flex flex-col overflow-hidden shadow-2xl relative" style={{ pointerEvents: 'auto', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                    {/* Tombol Close di pojok kanan atas, selalu visible dan besar */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 bg-[#23262F] hover:bg-[#8B5CF6]/20 text-[#8B5CF6] hover:text-white rounded-full p-3 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        aria-label="Close detail panel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    {/* Header: Title & Status */}
                    <div className="flex justify-between items-center pb-4 mb-8 border-b border-[#23262F]">
                        <div>
                            <h1 className="text-3xl font-bold text-[#F4F5F6] tracking-tight mb-2 line-clamp-1">
                                {asset.title}
                            </h1>
                            <span className="text-xs font-medium text-[#8B5CF6] bg-[#23262F] px-3 py-1 rounded inline-block">SELECTED</span>
                        </div>
                    </div>
                    {/* Main Content: Flex Scrollable Area */}
                    <div className="flex-grow space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                        {/* Asset Visuals & Description */}
                        <div className="flex flex-col sm:flex-row gap-8">
                {/* Image (large, soft card) */}
                <div className="w-full sm:w-1/3 h-40 bg-[#23262F] rounded-xl overflow-hidden flex items-center justify-center border border-[#23262F] flex-shrink-0">
                    {asset.mediaUrl ? (
                        <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain p-2 drop-shadow-lg" />
                    ) : (
                        <div className="p-6 text-gray-500 text-xs">No Image</div>
                    )}
                </div>
                {/* Description */}
                <div className='flex-grow flex flex-col justify-center pl-2'>
                    <p className="text-base font-semibold text-[#B1B5C3] mb-2">Description</p>
                    <p className="text-sm text-[#F4F5F6] font-light line-clamp-5 max-h-32 overflow-hidden">
                        {asset.description || 'No description available.'}
                    </p>
                </div>
            </div>
            {/* License & Royalty */}
            <LicenseCard asset={asset} />
            {/* Stat Grid (soft card style) */}
            <div className='grid grid-cols-2 gap-6 mt-2'>
                <PlaceholderStat title="Similarity Score" value={asset.similarity ? asset.similarity.toFixed(4) : 'N/A'} colorClass="bg-[#23262F] text-[#FF6F61]" />
                <PlaceholderStat title="Remix Children" value={asset.parentsCount} colorClass="bg-[#23262F] text-[#43D9AD]" />
            </div>
            {/* Detail List (clear, spaced) */}
            <div className="space-y-3 pt-6 border-t border-[#23262F] text-base">
                <h3 className="font-semibold text-[#8B5CF6] mb-3">Key Details</h3>
                <DetailRow label="IP ID" value={asset.ipId} />
                <DetailRow label="Media Type" value={asset.mediaType} />
                <DetailRow label="Parent IP" value={parentDisplay} />
                <DetailRow label="Creator" value={creatorName} />
                <DetailRow label="Contract Address" value={asset.nftMetadata?.contract_address} />
                <DetailRow label="Date Created" value={formattedDate} />
            </div>
        </div>
        {/* Footer / Action Area (soft card style) */}
        <div className="mt-10 pt-6 border-t border-[#23262F] flex flex-col gap-4 flex-shrink-0">
            <button 
                onClick={initiateEnforcement}
                className="w-full inline-flex items-center justify-center p-4 font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] rounded-xl hover:from-[#FF6F61] hover:to-[#8B5CF6] transition-colors text-white shadow-lg text-lg"
            >
                Initiate Enforcement Action
            </button>
            <a 
                href={`https://explorer.storyprotocol.xyz/ip-assets/${asset.ipId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center p-4 font-bold bg-gradient-to-r from-[#8B5CF6] to-[#43D9AD] rounded-xl hover:from-[#8B5CF6] hover:to-[#43D9AD] transition-colors text-white shadow-lg text-lg"
            >
                View on Explorer
            </a>
        </div>
      </div>
    </div>
    );
};

export default AssetDetailPanel;