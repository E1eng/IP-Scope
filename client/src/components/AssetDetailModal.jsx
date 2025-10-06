import React, { useState, useEffect } from 'react';
import RemixTreeView from './RemixTreeView'; // Import komponen baru

const DetailRow = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="py-2 border-b border-gray-800">
      <p className="text-sm font-bold text-gray-400">{label}</p>
      <p className="text-base text-white break-words">{value}</p>
    </div>
  );
};

// Tambahkan prop baru untuk fitur tree
const AssetDetailModal = ({ asset, onClose, onViewTree, remixTreeData, isTreeLoading }) => {
  const [show, setShow] = useState(false);
  // State lokal untuk mengontrol tampilan: detail atau tree
  const [view, setView] = useState('details'); // 'details' atau 'tree'

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50); 
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    // Reset view state saat modal ditutup
    setView('details');
    setShow(false);
    setTimeout(onClose, 300); 
  };
  
  // Logic untuk beralih tampilan dan memuat tree
  const handleViewTreeClick = () => {
      setView('tree');
      // Panggil fungsi fetch tree dari App.jsx
      if (!remixTreeData && !isTreeLoading) {
          onViewTree(asset.ipId);
      }
  }

  const handleViewDetailsClick = () => {
      setView('details');
  }

  if (!asset) return null;

  const formattedDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : null;

  const creatorName = asset.nftMetadata?.raw?.metadata?.creators?.[0]?.name;

  return (
    <div 
      className={`fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out ${show ? 'bg-opacity-80' : 'bg-opacity-0'}`}
      onClick={handleClose}
    >
      <div 
        className={`modal bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border border-purple-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl transition-all duration-300 ease-in-out ${show ? 'opacity-100 translate-y-0 scale-100 animate-fade-in' : 'opacity-0 -translate-y-10 scale-95'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Kolom Kiri: Gambar */}
        <div className="w-full md:w-1/2 bg-gradient-to-tr from-purple-900/30 via-gray-800/60 to-blue-900/30 flex items-center justify-center p-6 border-r border-purple-900">
          {asset.mediaUrl ? ( <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain rounded-xl drop-shadow-lg" /> ) : ( <div className="p-8 text-gray-500">No Image Available</div> )}
        </div>
        {/* Kolom Kanan: Detail & Tree View */}
        <div className="w-full md:w-1/2 p-8 overflow-y-auto flex flex-col">
          <h2 className="text-3xl font-extrabold text-purple-300 mb-6 tracking-tight">{asset.title || 'Untitled Asset'}</h2>
          {/* Tab/Selector View (UX Improvement) */}
          <div className="flex mb-6 border-b border-purple-900 gap-2">
            <button 
              onClick={handleViewDetailsClick}
              className={`py-2 px-6 font-semibold rounded-t-xl transition-colors ${view === 'details' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500 shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Details
            </button>
            <button 
              onClick={handleViewTreeClick}
              disabled={isTreeLoading}
              className={`py-2 px-6 font-semibold rounded-t-xl transition-colors disabled:opacity-50 ${view === 'tree' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500 shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              {isTreeLoading ? 'Loading Tree...' : 'Remix Tree'}
            </button>
          </div>
          {/* Content Area */}
          <div className="flex-grow">
            {view === 'details' ? (
              <div className="space-y-3">
                <DetailRow label="Description" value={asset.description} />
                <DetailRow label="IP ID" value={asset.ipId} />
                <DetailRow label="Similarity" value={asset.similarity?.toFixed(4)} />
                <DetailRow label="Score" value={asset.score?.toFixed(4)} />
                <DetailRow label="Media Type" value={asset.mediaType} />
                <DetailRow label="Parents Count" value={asset.parentsCount} />
                <DetailRow label="Creator" value={creatorName} />
                <DetailRow label="Contract Address" value={asset.nftMetadata?.contract_address} />
                <DetailRow label="Created At" value={formattedDate} />
              </div>
            ) : (
              <RemixTreeView 
                treeData={remixTreeData}
                isTreeLoading={isTreeLoading}
                startAssetId={asset.ipId}
              />
            )}
          </div>
          <button
            onClick={handleClose}
            className="mt-8 w-full p-3 font-bold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-colors shadow-lg text-white text-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal;