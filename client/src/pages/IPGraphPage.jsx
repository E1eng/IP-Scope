import React, { useState, useCallback } from 'react';
import axios from 'axios';
import IPGraphVisualization from '../components/IPGraphVisualization';
import RemixDetailModal from '../components/RemixDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function IPGraphPage() {
  const [rootId, setRootId] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  const expandNode = useCallback(async (nodeId) => {
    setGraphData(currentData => ({
        ...currentData,
        nodes: currentData.nodes.map(n => n.ipId === nodeId ? { ...n, isLoading: true } : n)
    }));
    try {
        const response = await axios.get(`${API_BASE_URL}/assets/${nodeId}/children`);
        const children = response.data;
        setGraphData(currentData => {
            const newNodes = [...currentData.nodes];
            const newLinks = [...currentData.links];
            const parentNode = newNodes.find(n => n.ipId === nodeId);
            if (parentNode) {
                parentNode.expanded = true;
                parentNode.isLoading = false;
            }
            children.forEach(child => {
                if (!newNodes.some(n => n.ipId === child.ipId)) {
                    newNodes.push({ ...child, id: child.ipId, expanded: false });
                }
                if (!newLinks.some(l => l.source === nodeId && l.target === child.ipId)) {
                    newLinks.push({ source: nodeId, target: child.ipId });
                }
            });
            return { nodes: newNodes, links: newLinks };
        });
    } catch (error) {
        console.error("Failed to expand node:", error);
        setGraphData(currentData => ({
            ...currentData,
            nodes: currentData.nodes.map(n => n.ipId === nodeId ? { ...n, isLoading: false } : n)
        }));
    }
  }, []);

  const handleFetchGraph = async (e) => {
    e.preventDefault();
    const id = rootId.trim();
    if (!id) return;

    setIsLoading(true);
    setGraphData({ nodes: [], links: [] });
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/assets/${id}`);
      if (response.data) {
        const rootNode = { ...response.data, id: response.data.ipId, isRoot: true, expanded: false };
        setGraphData({ nodes: [rootNode], links: [] });
        if (rootNode.childrenCount > 0) {
            expandNode(rootNode.ipId);
        }
      } else {
        throw new Error("API returned no data");
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load IP Graph. Check IP ID or backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = async (ipId) => {
      setIsModalLoading(true);
      setSelectedAsset({ ipId }); 
      try {
          const [assetRes, analyticsRes] = await Promise.all([
              axios.get(`${API_BASE_URL}/assets/${ipId}`),
              axios.get(`${API_BASE_URL}/assets/${ipId}/analytics`)
          ]);
          setSelectedAsset(assetRes.data);
          setAnalyticsData(analyticsRes.data);
      } catch (err) {
          setSelectedAsset({ ipId, isError: true, title: "Error", description: "Failed to fetch full asset details." });
      } finally {
          setIsModalLoading(false);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg">
            <p className="text-lg text-purple-300 mb-3">Visualize IP Provenance</p>
            <form onSubmit={handleFetchGraph} className="flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    value={rootId}
                    onChange={(e) => setRootId(e.target.value)}
                    placeholder="Paste IP Asset ID (e.g., 0x...) to generate its provenance graph..."
                    className="flex-grow p-4 bg-gray-900 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all text-white shadow-md text-lg"
                    required
                />
                <button type="submit" disabled={isLoading} className="p-4 px-8 font-bold text-white bg-purple-600 rounded-xl shadow-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-lg">
                    {isLoading ? 'Loading...' : 'Generate'}
                </button>
            </form>
        </div>
      <div className="bg-gray-800/30 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden min-h-[75vh] flex flex-col">
        {isLoading && <div className="flex-grow flex items-center justify-center text-purple-400 text-xl">Fetching Root IP...</div>}
        {error && <div className="flex-grow flex items-center justify-center p-8 text-red-300 bg-red-900/20 text-center rounded-2xl">{error}</div>}
        {graphData.nodes.length > 0 && <IPGraphVisualization data={graphData} onNodeClick={handleNodeClick} onExpandNode={expandNode} rootId={rootId.trim()} />}
        {!isLoading && !error && graphData.nodes.length === 0 && (
          <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-10">
            <svg className="w-24 h-24 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <h3 className="text-2xl font-bold text-gray-400">Enter an IP Asset ID to begin.</h3>
            <p className="mt-2 max-w-md text-center">The provenance graph will appear here. Double-click nodes to expand their derivatives.</p>
          </div>
        )}
      </div>
      {(selectedAsset || isModalLoading) && (
        <RemixDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} analytics={analyticsData} isLoading={isModalLoading} />
      )}
    </div>
  );
}

export default IPGraphPage;