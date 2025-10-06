import React, { useState } from 'react';
import axios from 'axios';
import RemixTreeView from '../components/RemixTreeView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function RemixTreePage() {
  const [assetId, setAssetId] = useState('');
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFetchTree = async (e) => {
    e.preventDefault();
    if (!assetId.trim()) return;

    setIsLoading(true);
    setTreeData(null);
    setError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/assets/${assetId.trim()}/remix-tree`
      );
      setTreeData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load Remix Tree. Check console for API details.'
      );
      console.error('Remix Tree Fetch Error:', err.response ? err.response.data : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white border-b border-gray-700 pb-3">Remix Tree View</h2>

      <form onSubmit={handleFetchTree} className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          placeholder="Paste IP Asset ID or Contract Address here..."
          className="flex-grow p-4 bg-gray-800 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all text-white"
          required
        />
        <button
          type="submit"
          disabled={isLoading || !assetId.trim()}
          className="p-4 px-8 font-extrabold text-white bg-pink-600 rounded-xl shadow-lg hover:bg-pink-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading Tree...' : 'View Tree'}
        </button>
      </form>
      
      {/* Tampilan Remix Tree */}
      <RemixTreeView 
        treeData={treeData} 
        isLoading={isLoading} 
        error={error} 
        startAssetId={assetId.trim()} 
      />
    </div>
  );
}

export default RemixTreePage;