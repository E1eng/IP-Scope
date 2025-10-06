import React, { useState, useEffect } from 'react';

const DetailRow = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="py-2 border-b border-gray-800">
      <p className="text-sm font-bold text-gray-400">{label}</p>
      <p className="text-base text-white break-words">{value}</p>
    </div>
  );
};

const AssetDetailModal = ({ asset, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50); 
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300); 
  };
  
  if (!asset) return null;

  const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : null;

  const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name;

  return (
    <div 
      className={`fixed inset-0 bg-black flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out ${show ? 'bg-opacity-75' : 'bg-opacity-0'}`}
      onClick={handleClose}
    >
      <div 
        className={`bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden transition-all duration-300 ease-in-out ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-95'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full md:w-1/2 bg-gray-800 flex items-center justify-center">
          {asset.mediaUrl ? ( <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain rounded-l-lg" /> ) : ( <div className="p-8 text-gray-500">No Image Available</div> )}
        </div>
        <div className="w-full md:w-1/2 p-6 overflow-y-auto">
          <h2 className="text-3xl font-bold text-white mb-4">{asset.title || 'Untitled Asset'}</h2>
          
          <DetailRow label="Description" value={asset.description} />
          <DetailRow label="IP ID" value={asset.ipId} />
          <DetailRow label="Similarity" value={asset.similarity?.toFixed(4)} />
          <DetailRow label="Score" value={asset.score?.toFixed(4)} />
          <DetailRow label="Media Type" value={asset.mediaType} />
          <DetailRow label="Parents Count" value={asset.parentsCount} />
          <DetailRow label="Creator" value={creatorName} />
          <DetailRow label="Contract Address" value={asset.nftMetadata?.contract_address} />
          <DetailRow label="Created At" value={formattedDate} />

          <button
            onClick={handleClose}
            className="mt-6 w-full p-3 font-bold bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal;