import React from 'react';
import TreeNode from './TreeNode';

const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2 p-12 text-purple-400">
        <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Fetching Asset and Building Remix Tree...
    </div>
);

const RemixTreeView = ({ treeData, isLoading, error, startAssetId }) => {
    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="p-8 text-red-300 bg-red-900/30 rounded-xl border border-red-700/50">
                <p className="font-bold">Error Loading Tree:</p>
                <p>{error}</p>
                <p className="text-sm mt-2 text-gray-400">Pastikan Asset ID/Address yang dimasukkan valid.</p>
            </div>
        );
    }
    
    if (treeData && treeData.ipId) {
        return (
            <div className="p-6 border border-gray-700 rounded-xl bg-gray-800 shadow-xl">
                <h4 className="text-xl font-bold mb-4 text-purple-400">Remix Tree Structure for ID: {startAssetId}</h4>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <TreeNode node={treeData} startNodeId={startAssetId} />
                </div>
                <p className="text-xs text-gray-500 mt-4 italic">Struktur ini adalah representasi pohon remix, data turunan/induk bersifat tiruan (mock) di backend untuk tujuan demo/visualisasi.</p>
            </div>
        );
    }

    return (
        <div className="p-8 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <p>Masukkan IP Asset ID di atas dan tekan "View Tree" untuk memulai visualisasi pohon remix.</p>
        </div>
    );
};

export default RemixTreeView;