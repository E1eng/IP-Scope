import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import IPGraphVisualization from '../components/IPGraphVisualization';
import RemixDetailModal from '../components/RemixDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Transform tree to D3 graph format
const transformTreeToGraph = (root, startAssetId) => {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    const traverse = (node, parentId = null) => {
        if (!node || !node.ipId || nodeMap.has(node.ipId)) return;
        
        const d3Node = { 
            id: node.ipId, 
            title: node.title, 
            mediaType: node.mediaType, 
            isRoot: node.ipId === startAssetId,
            analytics: node.analytics 
        };

        nodes.push(d3Node);
        nodeMap.set(node.ipId, d3Node);
        
        if (parentId) {
            links.push({ source: parentId, target: node.ipId });
        }
        
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => traverse(child, node.ipId));
        }
    };
    
    traverse(root);
    return { nodes, links };
};

function IPGraphPage() {
    const [rootId, setRootId] = useState('');
    const [treeData, setTreeData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState(null);

    // Fetch complete graph with value flow
    const handleFetchGraph = async (e) => {
        e.preventDefault();
        const id = rootId.trim();
        if (!id) return;

        setIsLoading(true);
        setTreeData(null);
        setError(null);
        
        try {
            console.log('Fetching value flow graph for:', id);
            const response = await axios.get(`${API_BASE_URL}/graphs/${id}/value-flow`);
            
            if (response.data) {
                setTreeData(response.data);
                console.log('Graph data loaded successfully');
            } else {
                throw new Error("API returned no data");
            }
        } catch (err) {
            console.error('Error fetching graph:', err);
            setError(err.response?.data?.message || 'Failed to load IP Graph. Check IP ID or backend connection.');
        } finally {
            setIsLoading(false);
        }
    };

    // Transform tree data to graph format
    const graphData = useMemo(() => {
        if (!treeData) return { nodes: [], links: [] };
        return transformTreeToGraph(treeData, rootId.trim());
    }, [treeData, rootId]);

    // Handle node click to show details
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
            console.error('Error fetching asset details:', err);
            setSelectedAsset({ 
                ipId, 
                isError: true, 
                title: "Error", 
                description: "Failed to fetch full asset details." 
            });
        } finally {
            setIsModalLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg">
                <p className="text-lg text-purple-300 mb-3">Visualize IP Provenance & Value Flow</p>
                <form onSubmit={handleFetchGraph} className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={rootId}
                        onChange={(e) => setRootId(e.target.value)}
                        placeholder="Enter IP Asset ID (e.g., 0x...) to generate provenance graph..."
                        className="flex-grow p-4 bg-gray-900 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all text-white shadow-md text-lg"
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="p-4 px-8 font-bold text-white bg-purple-600 rounded-xl shadow-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-lg"
                    >
                        {isLoading ? 'Loading...' : 'Generate'}
                    </button>
                </form>
                {isLoading && (
                    <div className="mt-4 text-purple-400 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                            Fetching provenance tree and value flow data... This may take a moment.
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-800/30 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden min-h-[75vh] flex flex-col">
                {error && (
                    <div className="flex-grow flex items-center justify-center p-8 text-red-300 bg-red-900/20 text-center rounded-2xl">
                        {error}
                    </div>
                )}
                
                {graphData.nodes.length > 0 && !isLoading && (
                    <IPGraphVisualization 
                        data={graphData} 
                        onNodeClick={handleNodeClick} 
                        rootId={rootId.trim()} 
                    />
                )}
                
                {!isLoading && !error && graphData.nodes.length === 0 && (
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-10">
                        <svg className="w-24 h-24 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <h3 className="text-2xl font-bold text-gray-400">Enter an IP Asset ID to begin.</h3>
                        <p className="mt-2 max-w-md text-center">
                            The complete provenance graph with value flow will appear here.
                        </p>
                    </div>
                )}
            </div>

            {(selectedAsset || isModalLoading) && (
                <RemixDetailModal 
                    asset={selectedAsset} 
                    onClose={() => setSelectedAsset(null)} 
                    analytics={analyticsData} 
                    isLoading={isModalLoading} 
                />
            )}
        </div>
    );
}

export default IPGraphPage;