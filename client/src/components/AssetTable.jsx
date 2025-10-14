import React, { useState } from 'react';

// Helper untuk mengkonversi IPFS URI ke HTTP URL dan menangani kasus NULL/UNDEFINED
const getImageUrl = (asset) => {
    // 1. Prioritas tinggi dari metadata yang kaya (berdasarkan struktur yang Anda konfirmasi)
    let url = asset.nftMetadata?.image?.cachedUrl ||
              asset.nftMetadata?.raw?.metadata?.image || // Path dari raw metadata
              asset.nftMetadata?.image?.originalUrl || // Path lain dari image object
              asset.nftMetadata?.uri; // Fallback ke token URI

    // 2. FIX KRITIS: Pastikan URL adalah string sebelum memanggil .startsWith
    if (typeof url === 'string') { 
        // 3. Handle IPFS URI conversion
        if (url.startsWith('ipfs://')) {
            return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        return url.trim(); 
    }
    // 4. Fallback to local logo if no valid URL is found
    return "/favicon.png"; 
};


// --- Sub-Komponen: WalletFilterForm (Simplified) ---
const WalletFilterForm = ({ onFetch, initialOwnerAddress, isSubmitting }) => {
    // Hanya satu state untuk alamat input
    const [addressInput, setAddressInput] = useState(initialOwnerAddress || ''); 

    const handleSubmit = (e) => {
        e.preventDefault();
        const cleanedAddress = addressInput.trim();

        if (!cleanedAddress) return;

        // onFetch akan mengatur global loading state di ExplorerPage
        onFetch(cleanedAddress); 
    };

    const inputClasses = "flex-grow p-3 bg-gray-900 border border-purple-800 rounded-lg focus:ring-2 focus:ring-purple-500 text-white placeholder:text-gray-500";
    const buttonClasses = "p-3 px-6 font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-700";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Tunggal */}
            <div className="flex flex-col md:flex-row gap-3">
                <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Masukkan Alamat Wallet atau Token Contract"
                    className={inputClasses}
                    required
                    disabled={isSubmitting} // Disable input saat loading
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !addressInput.trim()} // Menggunakan isSubmitting
                    className={buttonClasses}
                >
                    {isSubmitting ? 'Loading...' : 'Load Assets'}
                </button>
            </div>
        </form>
    );
};

// --- Komponen Utama: AssetTable ---
function AssetTable({ assets, isLoading, error, onAssetClick, royaltyTotalsMap }) {
    const formatUsdt = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '-';
        try {
            return `$${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
        } catch {
            return '-';
        }
    };
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
                        <th className="p-4">Preview</th>
                        <th className="p-4">Asset Title</th>
                        <th className="p-4">Media Type</th>
                        <th className="p-4">Date Created</th>
                        <th className="p-4">Total Royalty Claimed</th>
                        <th className="p-4">Dispute Status</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map(asset => (
                        <tr 
                            key={asset.ipId} 
                            className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
                            onClick={() => onAssetClick(asset.ipId)} // FIX: Mengirim ipId sebagai string
                        >
                            {/* Image Column */}
                            <td className="p-2 w-16">
                                <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                                    {/* Menggunakan getImageUrl helper */}
                                    <img 
                                        src={getImageUrl(asset)} 
                                        alt="Asset Preview" 
                                        className="w-full h-full object-cover" 
                                        // Fallback jika gambar gagal dimuat
                                        onError={(e) => { e.target.onerror = null; e.target.src="/favicon.png"; }} 
                                    />
                                </div>
                            </td>
                            <td className="p-4 font-semibold">{asset.title}</td>
                            <td className="p-4 text-gray-300">{asset.mediaType}</td>
                            <td className="p-4 text-gray-300">{new Date(asset.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 font-semibold text-green-300">
                                {formatUsdt(royaltyTotalsMap?.[asset.ipId])}
                            </td>
                            {/* Dispute Status Cell */}
                            <td className="p-4">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full 
                                    ${asset.disputeStatus === 'Active' ? 'bg-red-500 text-white' : 
                                    asset.disputeStatus === 'Pending' ? 'bg-yellow-500/50 text-yellow-300' : 
                                    'bg-green-500/20 text-green-300'}`
                                }>
                                    {asset.disputeStatus || 'None'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Export WalletFilterForm sebagai sub-komponen statis
AssetTable.WalletFilterForm = WalletFilterForm;
export default AssetTable;