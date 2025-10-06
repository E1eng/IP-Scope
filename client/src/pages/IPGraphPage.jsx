import React, { useState } from 'react';
import axios from 'axios';
import IPGraphVisualization from '../components/IPGraphVisualization';
import RemixDetailModal from '../components/RemixDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function IPGraphPage() {
  const [assetId, setAssetId] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedChildAsset, setSelectedChildAsset] = useState(null);
  const [isChildLoading, setIsChildLoading] = useState(false);
  // ▼▼▼ STATE BARU UNTUK DATA ANALITIK ON-CHAIN ▼▼▼
  const [analyticsData, setAnalyticsData] = useState(null); 
  const [selectedType, setSelectedType] = useState('node'); // 'node' atau 'link'

  // ... (handleFetchGraph dan transformTreeToGraph tetap sama)

  const handleFetchGraph = async (e) => {
    e.preventDefault();
    if (!assetId.trim()) return;

    setIsLoading(true);
    setGraphData(null);
    setError(null);
    setSelectedChildAsset(null);
    setAnalyticsData(null); // Reset analytics

    try {
      const response = await axios.get(
        `${API_BASE_URL}/assets/${assetId.trim()}/remix-tree`
      );
      
      const { nodes, links } = transformTreeToGraph(response.data);
      setGraphData({ nodes, links });

    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load IP Graph. Check backend connection or API Key.'
      );
      console.error('IP Graph Fetch Error:', err.response ? err.response.data : err.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleGraphInteraction = async (id, type) => {
      setSelectedChildAsset(null);
      setAnalyticsData(null);
      setIsChildLoading(true);
      setSelectedType(type);

      try {
          // 1. Ambil detail aset (umum)
          const assetResponse = await axios.get(`${API_BASE_URL}/assets/${id}`);
          const assetDetails = assetResponse.data;
          
          // 2. Ambil data on-chain (analitik)
          const analyticsResponse = await axios.get(`${API_BASE_URL}/assets/${id}/analytics`);
          
          // Gabungkan data
          setSelectedChildAsset(assetDetails);
          setAnalyticsData(analyticsResponse.data);
          
      } catch (err) {
          console.error(`Failed to fetch ${type} details:`, err.response ? err.response.data : err.message);
          setSelectedChildAsset({ 
            ipId: id, 
            title: `Error fetching ${type} details`, 
            description: "Failed to load full data for this component.", 
            isError: true 
          });
      } finally {
          setIsChildLoading(false);
      }
  };


  // Gabungkan handler node dan link menjadi satu
  const handleNodeClick = (ipId) => handleGraphInteraction(ipId, 'node');
  const handleLinkClick = (ipId) => handleGraphInteraction(ipId, 'link'); // Link menggunakan ID target (anak)

  // ... (transformTreeToGraph tetap sama)

  // Fungsi utilitas untuk mengubah format Tree (nested object) menjadi format Graph (flat arrays of nodes and links)
  const transformTreeToGraph = (root) => {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    const traverse = (node, parentId = null) => {
      // Mencegah duplikasi node
      if (nodeMap.has(node.ipId)) return;

      const d3Node = {
        id: node.ipId,
        title: node.title,
        mediaType: node.mediaType,
        isRoot: node.ipId === assetId.trim(),
        // Simpan data lain yang mungkin berguna
      };

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


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white border-b border-gray-700 pb-3">IP Graph Visualization</h2>
      <p className='text-gray-400'>Input an IP ID to visualize its entire remix provenance as an interactive force-directed graph.</p>

      <form onSubmit={handleFetchGraph} className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          placeholder="Paste IP Asset ID (e.g., 0x...) here..."
          className="flex-grow p-4 bg-gray-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all text-white"
          required
        />
        <button
          type="submit"
          disabled={isLoading || !assetId.trim()}
          className="p-4 px-8 font-extrabold text-white bg-pink-600 rounded-xl shadow-lg hover:bg-pink-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading Graph...' : 'Generate Graph'}
        </button>
      </form>
      
      {/* Tampilan Visualisasi D3 */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden min-h-[70vh]">
          {isLoading && (
              <div className="flex items-center justify-center p-12 text-purple-400">Loading graph data...</div>
          )}
          {error && (
              <div className="p-8 text-red-300 bg-red-900/30">Error: {error}</div>
          )}
          {graphData && graphData.nodes.length > 0 && (
              <IPGraphVisualization 
                data={graphData} 
                onNodeClick={handleNodeClick} 
                onLinkClick={handleLinkClick} // Kirim handler untuk link
                rootId={assetId.trim()}
              />
          )}
          {!isLoading && !error && !graphData && (
               <div className="flex items-center justify-center h-[70vh] text-gray-500">
                   Enter an IP Asset ID above to begin visualization.
               </div>
          )}
      </div>

      {/* Modal Detail untuk node yang diklik */}
      {selectedChildAsset && !isChildLoading && (
        <RemixDetailModal
          asset={selectedChildAsset}
          onClose={() => { setSelectedChildAsset(null); setAnalyticsData(null); }}
          analytics={analyticsData} // Kirim data analitik baru
          interactionType={selectedType}
        />
      )}
       {isChildLoading && (
           <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
               <div className="p-6 bg-gray-900 rounded-lg text-purple-400 flex items-center">
                    <div className="animate-spin h-5 w-5 mr-3 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                    Loading Asset Details...
               </div>
           </div>
       )}
    </div>
  );
}

export default IPGraphPage;