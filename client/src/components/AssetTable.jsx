import React from 'react';

function AssetTable({ assets, title, onAssetClick }) {
    if (assets.length === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
                <p className="text-gray-400">No assets to display in this category.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-900/50">
                    <tr>
                        <th className="p-4">Asset</th>
                        <th className="p-4">Media Type</th>
                        <th className="p-4">Date Created</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map(asset => (
                        <tr 
                            key={asset.ipId} 
                            className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer"
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

export default AssetTable;