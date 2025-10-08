import React from 'react';
import LicenseCard from './LicenseCard'; 
import DetailRow from './DetailRow'; 

const PlaceholderStat = ({ title, value, colorClass }) => (
    <div className={`p-3 rounded-lg ${colorClass} flex flex-col justify-center items-start border border-gray-700/50 shadow-sm`}>
        <p className="text-xs font-light text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-semibold text-white mt-1">{value}</p>
    </div>
);

const AssetDetailPanel = ({ asset, onClose }) => {
    // Jika tidak ada aset terpilih, jangan render apapun.
    if (!asset) {
        return null;
    }

    const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'N/A';

    const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Unknown Creator';
    
    const parentIpId = asset.parents && asset.parents.length > 0 && asset.parents[0].ipId !== '0x0000000000000000000000000000000000000000' ? asset.parents[0].ipId : null;
    const parentIpName = asset.parents && asset.parents.length > 0 && asset.parents[0].name || 'N/A';
    const parentDisplay = parentIpId ? `${parentIpName} (ID: ${parentIpId.substring(0, 6)}...)` : 'Original/Root Asset';

    return (
        // Backdrop modal
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            {/* Konten Modal */}
            <div className="w-full max-w-2xl bg-gray-900 border border-purple-900/50 rounded-2xl p-6 flex flex-col overflow-hidden shadow-2xl relative" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                
                {/* Tombol Close di pojok kanan atas */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 bg-gray-800/50 hover:bg-purple-900/50 text-purple-300 hover:text-white rounded-full p-2 shadow-lg transition-colors"
                    aria-label="Close detail panel"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="pb-4 mb-6 border-b border-purple-900/50">
                    <h1 className="text-2xl font-bold text-white tracking-tight line-clamp-1 pr-12">
                        {asset.title}
                    </h1>
                </div>

                <div className="flex-grow space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="w-full sm:w-1/3 h-40 bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center border border-purple-900/30 flex-shrink-0">
                            {asset.mediaUrl ? (
                                <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain p-2" />
                            ) : (
                                <div className="p-6 text-gray-500 text-xs">No Image</div>
                            )}
                        </div>
                        <div className='flex-grow flex flex-col justify-center'>
                            <p className="text-sm text-gray-300 font-light line-clamp-5 max-h-32 overflow-hidden">
                                {asset.description || 'No description available.'}
                            </p>
                        </div>
                    </div>
                    <LicenseCard asset={asset} />
                    <div className='grid grid-cols-2 gap-4'>
                        <PlaceholderStat title="Similarity Score" value={asset.similarity ? asset.similarity.toFixed(4) : 'N/A'} colorClass="bg-gray-800/50" />
                        <PlaceholderStat title="Children Count" value={asset.childrenCount} colorClass="bg-gray-800/50" />
                    </div>
                    <div className="space-y-2 pt-4 border-t border-purple-900/50 text-sm">
                        <h3 className="font-semibold text-purple-300 mb-2">Key Details</h3>
                        <DetailRow label="IP ID" value={asset.ipId} />
                        <DetailRow label="Media Type" value={asset.mediaType} />
                        <DetailRow label="Parent IP" value={parentDisplay} />
                        <DetailRow label="Creator" value={creatorName} />
                        <DetailRow label="Contract Address" value={asset.nftMetadata?.contract_address} />
                        <DetailRow label="Date Created" value={formattedDate} />
                    </div>
                </div>

                {/* Tombol Aksi Utama di Bawah */}
                <div className="mt-8 pt-6 border-t border-purple-900/50 flex-shrink-0">
                    <a 
                        href={`https://explorer.storyprotocol.xyz/ip-assets/${asset.ipId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center p-3 font-bold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-colors text-white shadow-lg text-base"
                    >
                        View on Explorer
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AssetDetailPanel;