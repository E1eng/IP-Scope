import React, { useState, useEffect } from 'react';
import axios from 'axios';
import IPGraphVisualization from '../components/IPGraphVisualization';
import RemixDetailModal from '../components/RemixDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BATCH_SIZE = 50;

// Fungsi untuk mengubah data API menjadi format yang dibutuhkan oleh D3
const transformApiDataToD3 = (rootNode, childrenDetails = []) => {
    const nodes = [];
    const links = [];
    
    // Selalu pastikan rootNode ada dan diformat dengan benar
    if (rootNode && rootNode.ipId) {
        nodes.push({ 
            id: rootNode.ipId, // Standarkan ke 'id'
            title: rootNode.title, 
            mediaType: rootNode.mediaType, 
            analytics: rootNode.analytics 
        });
    }

    childrenDetails.forEach(child => {
        if (child && child.ipId && !nodes.some(n => n.id === child.ipId)) {
            nodes.push({ 
                id: child.ipId, // Standarkan ke 'id'
                title: child.title, 
                mediaType: child.mediaType 
            });
            links.push({ source: rootNode.ipId, target: child.ipId });
        }
    });

    return { nodes, links };
};

function IPGraphPage() {
    const [rootId, setRootId] = useState('');
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);

    const [rootNode, setRootNode] = useState(null);
    const [allChildIds, setAllChildIds] = useState([]);
    const [loadedChildren, setLoadedChildren] = useState([]);

    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState(null);

    const handleFetchGraph = async (e) => {
        e.preventDefault();
        const id = rootId.trim().toLowerCase();
        if (!id) return;

        setIsLoading(true);
        setLoadingMessage('Fetching root asset and children list...');
        setError(null);
        setGraphData({ nodes: [], links: [] });
        setAllChildIds([]);
        setLoadedChildren([]);
        setRootNode(null);
        
        try {
            const response = await axios.get(`${API_BASE_URL}/graphs/${id}/value-flow`);
            const { rootNode: fetchedRoot, childIpIds } = response.data;

            setRootNode(fetchedRoot);
            setAllChildIds(childIpIds);

            if (childIpIds.length > 0) {
                await fetchAndAppendChildren(fetchedRoot, childIpIds, 0);
            } else {
                // --- ▼▼▼ PERBAIKAN KUNCI: Selalu gunakan fungsi transformasi ▼▼▼ ---
                // Ini memastikan rootNode diformat dengan benar bahkan jika tidak ada anak.
                setGraphData(transformApiDataToD3(fetchedRoot));
            }

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load initial graph.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const fetchAndAppendChildren = async (currentRoot, childIds, startIndex) => {
        const idsToFetch = childIds.slice(startIndex, startIndex + BATCH_SIZE);
        if (idsToFetch.length === 0) return;

        setIsLoading(true);
        setLoadingMessage(`Loading ${idsToFetch.length} more children...`);

        try {
            const response = await axios.post(`${API_BASE_URL}/assets/batch`, { ipIds: idsToFetch });
            const newChildrenDetails = response.data;
            
            const updatedChildren = [...loadedChildren, ...newChildrenDetails];
            setLoadedChildren(updatedChildren);

            setGraphData(transformApiDataToD3(currentRoot, updatedChildren));

        } catch (err) {
            setError('Failed to load more children.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleLoadMore = () => {
        fetchAndAppendChildren(rootNode, allChildIds, loadedChildren.length);
    };

    const handleNodeClick = async (clickedNode) => {
        if (!clickedNode || !clickedNode.id) return;

        setIsModalLoading(true);
        setSelectedAsset({ ipId: clickedNode.id, title: clickedNode.title });
        setAnalyticsData(null);
        
        try {
            const [assetRes, analyticsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/assets/${clickedNode.id}`),
                axios.get(`${API_BASE_URL}/assets/${clickedNode.id}/analytics`)
            ]);
            
            setSelectedAsset(assetRes.data);
            setAnalyticsData(analyticsRes.data);
        } catch (err) {
            console.error('Error fetching details for modal:', err);
            setSelectedAsset({ ipId: clickedNode.id, isError: true, title: "Error", description: "Failed to fetch details." });
        } finally {
            setIsModalLoading(false);
        }
    };

    const hasMoreToLoad = allChildIds.length > loadedChildren.length;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-lg">
                <p className="text-lg text-purple-300 mb-3">Visualize IP Provenance & Value Flow</p>
                <form onSubmit={handleFetchGraph} className="flex flex-col sm:flex-row gap-4">
                    <input type="text" value={rootId} onChange={(e) => setRootId(e.target.value)} placeholder="Enter IP Asset ID (e.g., 0x...)" className="flex-grow p-4 bg-gray-900 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all text-white shadow-md text-lg" required />
                    <button type="submit" disabled={isLoading} className="p-4 px-8 font-bold text-white bg-purple-600 rounded-xl shadow-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-lg">{isLoading ? 'Loading...' : 'Generate'}</button>
                </form>
                {isLoading && <div className="mt-4 text-purple-400 text-sm"><div className="flex items-center gap-2"><div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>{loadingMessage}</div></div>}
            </div>

            {allChildIds.length > 0 && (
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                    <p className="text-sm text-gray-300">Displaying {loadedChildren.length} of {allChildIds.length} children.</p>
                    {hasMoreToLoad && (
                        <button onClick={handleLoadMore} disabled={isLoading} className="px-4 py-2 font-bold bg-purple-600 rounded-lg disabled:bg-gray-600">
                            {isLoading ? 'Loading...' : `Load More (${Math.min(BATCH_SIZE, allChildIds.length - loadedChildren.length)})`}
                        </button>
                    )}
                </div>
            )}

            <div className="bg-gray-800/30 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden min-h-[75vh] flex flex-col">
                {error && <div className="flex-grow flex items-center justify-center p-8 text-red-300 bg-red-900/20 text-center rounded-2xl">{error}</div>}
                
                {graphData.nodes.length > 0 && (
                    <IPGraphVisualization data={graphData} onNodeClick={handleNodeClick} rootId={rootId.trim().toLowerCase()} />
                )}
                
                {!isLoading && !error && graphData.nodes.length === 0 && (
                     <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-10">
                        <svg className="w-24 h-24 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <h3 className="text-2xl font-bold text-gray-400">Enter an IP Asset ID to begin.</h3>
                        <p className="mt-2 max-w-md text-center">The provenance graph will appear here.</p>
                    </div>
                )}
            </div>

            {(selectedAsset || isModalLoading) && <RemixDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} analytics={analyticsData} isLoading={isModalLoading} />}
        </div>
    );
}

export default IPGraphPage;