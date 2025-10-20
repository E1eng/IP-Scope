import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
        const timestamp = new Date().toISOString();

        console.log(`[FRONTEND] BUTTON_CLICK timestamp=${timestamp} address=${cleanedAddress}`);
        
        if (!cleanedAddress) return;

        // onFetch akan mengatur global loading state di ExplorerPage
        onFetch(cleanedAddress); 
    };

    const inputClasses = "flex-grow input-modern text-base w-full min-w-0 px-4 py-3";
    const buttonClasses = "btn-primary text-base px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
            {/* Input Tunggal */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Alamat Wallet atau Kontrak Token
                  </label>
                  <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder="Masukkan alamat wallet atau kontrak token..."
                      className={`${inputClasses} focus-ring transition-smooth`}
                      required
                      disabled={isSubmitting}
                  />
                </div>
                <div className="flex items-end">
                  <button
                      type="submit"
                      disabled={isSubmitting || !addressInput.trim()}
                      className={`${buttonClasses} focus-ring transition-smooth`}
                  >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="loading-spinner w-5 h-5"></div>
                          <span>Mencari...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>Cari Karya Digital</span>
                        </div>
                      )}
                  </button>
                </div>
            </div>
        </form>
    );
};


// --- Komponen Utama: AssetTable ---
function AssetTable({ assets, isLoading, error, onAssetClick, royaltyTotalsMap, isRoyaltyTotalsLoading }) {
    const [hoveredAssetId, setHoveredAssetId] = useState(null);
    
    const formatWip = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '-';
        try {
            return `${Number(num).toFixed(6)} WIP`;
        } catch {
            return '-';
        }
    };
    if (isLoading) {
        return (
            <div className="text-center p-16 text-gray-300 flex flex-col items-center animate-fade-in">
                <div className="relative mb-6">
                  <div className="loading-spinner w-12 h-12"></div>
                  <div className="pulse-ring"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Loading assets…</h3>
                <p className="text-sm text-gray-500">Fetching on-chain data</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="glass-card p-8 text-center animate-slide-down">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gray-800/60 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-100 mb-2">Error loading assets</h3>
                    <p className="text-gray-400 font-mono text-sm break-words">{error}</p>
                  </div>
                </div>
            </div>
        );
    }

    if (assets.length === 0) {
        return (
            <div className="glass-card p-12 text-center animate-fade-in">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-200 mb-2">No assets found</h3>
                    <p className="text-gray-500">No IP assets found for the specified owner wallet.</p>
                  </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card-modern overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
                      <tr>
                          <th className="p-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">Preview</th>
                          <th className="p-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                            Asset Title
                            <span className="text-xs text-gray-500 ml-2">(click address to view)</span>
                          </th>
                          <th className="p-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">Media Type</th>
                          <th className="p-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">Date Created</th>
                          <th className="p-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">Total Royalty</th>
                          <th className="p-6 text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                      {assets.map((asset, index) => (
                          <tr 
                              key={asset.ipId} 
                              className="hover:bg-gray-800/50 cursor-pointer transition-all duration-300 group animate-slide-up"
                              style={{ animationDelay: `${index * 0.1}s` }}
                              onClick={() => onAssetClick(asset)}
                          >
                            {/* Image Column */}
                            <td className="p-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                    <img 
                                        src={getImageUrl(asset)} 
                                        alt="Asset Preview" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => { e.target.onerror = null; e.target.src="/favicon.png"; }} 
                                    />
                                </div>
                            </td>
                            <td className="p-6">
                                <div className="max-w-xs">
                  <h3 className="font-semibold text-gray-100 group-hover:text-gray-200 transition-colors duration-300 truncate">
                                    {asset.title}
                                  </h3>
                                  <a
                                    href={`https://explorer.story.foundation/ipa/${asset.ipId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-sm text-gray-400 hover:text-gray-300 font-mono mt-1 transition-colors duration-200 hover:underline"
                                    title={`View ${asset.ipId} on Story Protocol Explorer`}
                                  >
                                    {asset.ipId?.slice(0, 8)}...
                                  </a>
                                </div>
                            </td>
                            <td className="p-6">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-800/60 text-gray-300 border border-gray-700/60">
                                    {asset.mediaType}
                                </span>
                            </td>
                            <td className="p-6 text-gray-300">
                                {new Date(asset.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                            </td>
                            <td className="p-6">
                                <div className="text-right relative">
                                  <span 
                                    className="font-bold text-gray-100 text-lg cursor-pointer hover:text-gray-200 transition-colors"
                                    onMouseEnter={() => setHoveredAssetId(asset.ipId)}
                                    onMouseLeave={() => setHoveredAssetId(null)}
                                  >
                                    {royaltyTotalsMap && royaltyTotalsMap.hasOwnProperty(asset.ipId)
                                      ? formatWip(royaltyTotalsMap[asset.ipId])
                                      : (isRoyaltyTotalsLoading ? (
                                        <div className="flex items-center space-x-2">
                                          <div className="loading-spinner w-4 h-4"></div>
                                          <span className="text-sm">Loading…</span>
                                        </div>
                                      ) : '-')}
                                  </span>
                                </div>
                            </td>
                            {/* Dispute Status Cell */}
                            <td className="p-6">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-gray-700/60 bg-gray-800/60 text-gray-300`}>
                                    <div className={`w-2 h-2 rounded-full mr-2 bg-gray-500`}></div>
                                    {asset.disputeData?.totalDisputes > 0 ? 
                                        `${asset.disputeData.totalDisputes} Dispute${asset.disputeData.totalDisputes > 1 ? 's' : ''}` : 
                                        'No Disputes'
                                    }
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </div>
    );
}

// Export WalletFilterForm sebagai sub-komponen statis
AssetTable.WalletFilterForm = WalletFilterForm;
export default AssetTable;