import React from 'react';
import LicenseCard from './LicenseCard';
import DetailRow from './DetailRow'; // Import komponen baru

const RemixDetailModal = ({ asset, onClose }) => {
  // Penanganan error jika detail gagal dimuat
  if (!asset || asset.isError) {
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

  const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

  const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name || 'Unknown Creator';

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-300`}
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-purple-600 rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-3">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{asset.title || 'Untitled Asset'}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
          </div>

          {/* Image Preview */}
          <div className="w-full h-48 bg-gray-800 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
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

          <p className="text-gray-300 text-sm mb-6 line-clamp-3">{asset.description || 'No description available for this asset.'}</p>

          <div className="space-y-2">
              <DetailRow label="IP ID" value={asset.ipId} />
              <DetailRow label="Media Type" value={asset.mediaType} />
              <DetailRow label="Creator" value={creatorName} />
              <DetailRow label="Parents Count" value={asset.parentsCount} />
              <DetailRow label="Date Created" value={formattedDate} />
              <DetailRow label="Contract Address" value={asset.nftMetadata?.contract_address} />
          </div>
          
          <a 
              href={`https://explorer.storyprotocol.xyz/ip-assets/${asset.ipId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-6 w-full inline-flex items-center justify-center p-3 font-bold bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors text-white"
          >
              View on Story Explorer
          </a>
        </div>
      </div>
    </div>
  );
};

export default RemixDetailModal;