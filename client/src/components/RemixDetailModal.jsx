import React from 'react';
import LicenseCard from './LicenseCard';
import DetailRow from './DetailRow';

const RemixDetailModal = ({ asset, onClose, analytics, interactionType }) => {
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

  const modalTitle = interactionType === 'link' ? `Link/License Details (${asset.ipId.substring(0, 8)})` : asset.title;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-300`}
      onClick={onClose}
    >
    <div 
    className="modal bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border border-purple-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 shadow-2xl animate-fade-in"
    onClick={e => e.stopPropagation()}
    >
    <div className="p-7 overflow-y-auto">
      <div className="flex justify-between items-start mb-6 border-b border-purple-900 pb-4">
        <h2 className="text-2xl font-extrabold text-purple-300 tracking-tight line-clamp-2">{modalTitle}</h2>
        <button onClick={onClose} className="text-purple-400 hover:text-white transition-colors p-2 rounded-lg bg-purple-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Image Preview (Kecil) */}
      <div className="w-full h-32 bg-gradient-to-tr from-purple-900/30 via-gray-800/60 to-blue-900/30 rounded-xl mb-5 overflow-hidden flex items-center justify-center border border-purple-900">
        {asset.mediaUrl ? (
          <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain p-2 drop-shadow-lg" />
        ) : (
          <div className="p-8 text-gray-500 text-sm">No Image Preview</div>
        )}
      </div>
      {/* License Card */}
      <div className='mb-5'>
        <LicenseCard asset={asset} />
      </div>

          {/* DYNAMIC TOOLTIPS SECTION (On-Chain Analytics) */}
          {analytics && (
              <div className="bg-gray-700/50 p-4 rounded-lg mb-4 border border-gray-600 shadow-inner">
                  <h3 className='text-md font-semibold text-white mb-2'>On-Chain Analytics</h3>
                  <DetailRow label="License Terms ID" value={analytics.licenseTermsId} />
                  <DetailRow label="Royalty Split" value={analytics.royaltySplit} />
                  <DetailRow label="Total Royalties Claimed" value={analytics.totalRoyaltiesClaimed} />
                  <DetailRow label="Dispute Status" value={analytics.disputeStatus} />
              </div>
          )}
          {/* Deskripsi */}
          <p className="text-gray-400 text-xs mb-4">{asset.description || 'No description available.'}</p>


          {/* Detail List (Kecil) */}
          <div className="space-y-1 border-t border-gray-700 pt-3 text-sm">
              <DetailRow label="IP ID" value={asset.ipId} />
              <DetailRow label="Media Type" value={asset.mediaType} />
              <DetailRow label="Creator" value={creatorName} />
              <DetailRow label="Date Created" value={formattedDate} />
          </div>
          
          <a 
              href={`https://explorer.storyprotocol.xyz/ip-assets/${asset.ipId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-6 w-full inline-flex items-center justify-center p-3 font-bold bg-purple-600 rounded-md hover:bg-purple-700 transition-colors text-white"
          >
              View on Explorer
          </a>
        </div>
      </div>
    </div>
  );
};

export default RemixDetailModal;