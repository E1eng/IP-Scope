import React from 'react';

// --- Komponen Utama: AssetTable ---
function AssetTable({ assets, isLoading, error, onAssetClick }) {
    if (isLoading) {
        return (
            <div className="text-center p-12 text-purple-400 flex flex-col items-center">
                <div className="animate-spin h-8 w-8 mb-4 border-4 border-purple-400 border-t-transparent rounded-full"></div>
                <p>Loading Assets...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-red-900/40 p-6 rounded-xl border border-red-700 text-center text-red-300">
                <p className="font-bold">Error:</p>
                <p className="text-sm font-mono break-words mt-1">{error}</p>
            </div>
        );
    }

    if (assets.length === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
                <p className="text-gray-400">No IP assets found for the specified owner wallet.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-900/50">
                    <tr>
                        <th className="p-4">Asset Title</th>
                        <th className="p-4">Media Type</th>
                        <th className="p-4">Date Created</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map(asset => (
                        <tr 
                            key={asset.ipId} 
                            className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
                            onClick={() => onAssetClick(asset.ipId)}
                        >
                            <td className="p-4 font-semibold">{asset.title}</td>
                            <td className="p-4 text-gray-300">{asset.mediaType}</td>
                            <td className="p-4 text-gray-300">{new Date(asset.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Export hanya komponen AssetTable
export default AssetTable;