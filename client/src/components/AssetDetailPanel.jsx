import React from 'react';

const DetailRow = ({ label, value }) => {
  if (value === null || value === undefined || value === '' || value === 0) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-700/50 last:border-b-0">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-white break-words max-w-[60%]">{value}</p>
    </div>
  );
};

const StatCard = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg shadow-lg ${color} flex flex-col justify-center items-center h-24`}>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-200">{title}</p>
    </div>
);

const AssetDetailPanel = ({ asset, onClose }) => {
    if (!asset) {
        return (
            <div className="sticky top-4 h-[calc(100vh-6rem)] bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-purple-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">Select an Asset</h3>
                <p className="text-gray-400 text-sm mt-1">Click on any search result card to view its detailed analytics here.</p>
            </div>
        );
    }

    const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'N/A';

    const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Unknown Creator';

    return (
        <div className="sticky top-4 h-[calc(100vh-6rem)] bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 line-clamp-2">{asset.title || 'Untitled Asset'}</h2>
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
            
            <p className="text-gray-300 text-sm mb-6 line-clamp-3">{asset.description || 'No description available for this asset.'}</p>

            {/* Key Stats Section */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <StatCard title="Similarity Score" value={asset.similarity ? asset.similarity.toFixed(4) : 'N/A'} color="bg-purple-900/40 border border-purple-700/50" />
                <StatCard title="Remix Parents" value={asset.parentsCount || 0} color="bg-pink-900/40 border border-pink-700/50" />
            </div>

            {/* Details List (Scrollable) */}
            <div className="flex-grow space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                <DetailRow label="IP ID" value={asset.ipId} />
                <DetailRow label="Media Type" value={asset.mediaType} />
                <DetailRow label="Creator" value={creatorName} />
                <DetailRow label="Contract Address" value={asset.nftMetadata?.contract_address} />
                <DetailRow label="Date Created" value={formattedDate} />
                <DetailRow label="Score" value={asset.score?.toFixed(4)} />
            </div>
            
            {/* Footer / Action Area */}
            <div className="mt-6 pt-4 border-t border-gray-700/50">
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