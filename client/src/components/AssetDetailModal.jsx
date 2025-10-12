import React, { useState, useEffect, useMemo } from 'react';
import IPGraphVisualization from './IPGraphVisualization';
import DetailRow from './DetailRow';
import LicenseCard from './LicenseCard';

const transformTreeToGraph = (root, startAssetId) => {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    const traverse = (node, parentId = null) => {
      if (!node || !node.ipId || nodeMap.has(node.ipId)) return;
      const d3Node = { id: node.ipId, title: node.title, mediaType: node.mediaType, isRoot: node.ipId === startAssetId };
      nodes.push(d3Node);
      nodeMap.set(node.ipId, d3Node);
      if (parentId) {
        links.push({ source: parentId, target: node.ipId });
      }
      if (node.children) {
        node.children.forEach(child => traverse(child, node.ipId));
      }
    };
    
    traverse(root);
    return { nodes, links };
};

const AssetDetailModal = ({ asset, onClose, onViewTree, remixTreeData, isTreeLoading }) => {
  const [show, setShow] = useState(false);
  const [view, setView] = useState('details');

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50); 
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setView('details');
    setShow(false);
    setTimeout(onClose, 300); 
  };
  
  const handleViewTreeClick = () => {
      setView('tree');
      if (!remixTreeData && !isTreeLoading) {
          onViewTree(asset.ipId);
      }
  }

  const handleViewDetailsClick = () => {
      setView('details');
  }

  const graphData = useMemo(() => {
      if (view === 'tree' && remixTreeData && !remixTreeData.error) {
          return transformTreeToGraph(remixTreeData, asset.ipId);
      }
      return null;
  }, [remixTreeData, view, asset.ipId]);

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
        className={`bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border border-purple-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl transition-all duration-300 ease-in-out ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-95'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full md:w-1/2 bg-gradient-to-tr from-purple-900/30 via-gray-800/60 to-blue-900/30 flex items-center justify-center p-2 border-r border-purple-900">
          {view === 'details' ? (
            asset.mediaUrl ? <img src={asset.mediaUrl} alt={asset.title} className="max-w-full max-h-full object-contain rounded-xl drop-shadow-lg" /> : <div className="p-8 text-gray-500">No Image</div>
          ) : (
            isTreeLoading ? <div className="text-purple-400">Loading Graph...</div> :
            graphData ? <IPGraphVisualization data={graphData} rootId={asset.ipId} /> : <div className="p-8 text-gray-500">No graph data to display.</div>
          )}
        </div>

        <div className="w-full md:w-1/2 p-6 overflow-y-auto flex flex-col custom-scrollbar">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-extrabold text-purple-300 tracking-tight pr-10">{asset.title || 'Untitled Asset'}</h2>
            <button
                onClick={handleClose}
                className="bg-gray-800/50 hover:bg-purple-900/50 text-purple-300 hover:text-white rounded-full p-2 shadow-lg transition-colors"
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex mb-4 border-b border-purple-900 gap-2">
            <button 
              onClick={handleViewDetailsClick}
              className={`py-2 px-6 font-semibold rounded-t-lg transition-colors ${view === 'details' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}
            >
              Details
            </button>
            <button 
              onClick={handleViewTreeClick}
              disabled={isTreeLoading}
              className={`py-2 px-6 font-semibold rounded-t-lg transition-colors disabled:opacity-50 ${view === 'tree' ? 'bg-purple-900/40 text-purple-300 border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}
            >
              {isTreeLoading ? 'Loading...' : 'Remix Graph'}
            </button>
          </div>

          <div className="flex-grow space-y-4">
            <LicenseCard asset={asset} />
            <div className="space-y-2 pt-4 border-t border-purple-900/40 text-sm">
                <h3 className="font-semibold text-purple-300 mb-2">Key Details</h3>
                <DetailRow label="IP ID" value={asset.ipId} />
                <DetailRow label="Media Type" value={asset.mediaType} />
                <DetailRow label="Creator" value={creatorName} />
                <DetailRow label="Created At" value={formattedDate} />
                <DetailRow label="Similarity" value={asset.similarity?.toFixed(4)} />
                <DetailRow label="Score" value={asset.score?.toFixed(4)} />
                <DetailRow label="Parents" value={asset.parentsCount} />
                <DetailRow label="Dispute Status" value={asset.disputeStatus || 'None'} />
            </div>
          </div>
            <div className="flex gap-4 mt-6">
              <a 
                  href={`https://explorer.storyprotocol.xyz/ip-assets/${asset.ipId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center p-3 font-bold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-colors text-white"
              >
                  View on Explorer
              </a>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal;