import React, { useState } from 'react';
import axios from 'axios';
import AssetTable from '../components/AssetTable'; // Import AssetTable
import { useNavigate } from 'react-router-dom'; // Import useNavigate

// Ambil URL base dari environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ExplorerPage() {
    const [address, setAddress] = useState('');
    const [assets, setAssets] = useState(null); // Ubah dari totalAssets menjadi assets (array)
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Hook untuk navigasi

    const handleFetch = async (e) => {
        e.preventDefault(); // Mencegah form refresh halaman
        const addressToFetch = address.trim();
        if (!addressToFetch) return;

        // Reset state sebelum fetch baru
        setIsLoading(true);
        setError('');
        setAssets(null); // Reset daftar aset

        try {
            // Panggil endpoint backend kita
            const response = await axios.get(`${API_BASE_URL}/owner/${addressToFetch}/assets`);
            
            // response.data adalah array aset
            const fetchedAssets = response.data || [];
            setAssets(fetchedAssets);

        } catch (err) {
            // Periksa apakah error adalah 401/403 (API Key), 400 (Bad Address), atau 500 (Server)
            const errorMessage = err.response?.data?.message || 'Gagal mengambil data. Periksa kembali alamat atau coba lagi nanti.';
            setError(errorMessage);
            console.error(err); // Log error ke console untuk debug
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssetClick = (ipId) => {
        // Navigasi ke halaman detail aset
        navigate(`/asset/${ipId}`);
    };

    const totalAssets = assets ? assets.length : null;

    return (
        <div className="space-y-8">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 text-center">
                <h1 className="text-3xl font-bold text-white mb-4">IP Asset Explorer</h1>
                <p className="text-purple-300 mb-6">Masukkan alamat Ethereum untuk melihat semua IP Asset yang dimiliki.</p>
                
                <form onSubmit={handleFetch} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Tempel alamat wallet (contoh: 0x...)"
                        className="flex-grow p-4 bg-gray-900 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white shadow-md text-lg"
                        required
                    />
                    <button type="submit" disabled={isLoading} className="p-4 px-8 font-bold text-white bg-purple-600 rounded-xl shadow-lg hover:bg-purple-700 disabled:bg-gray-600 transition-colors">
                        {isLoading ? 'Mencari...' : 'Cari Aset'}
                    </button>
                </form>
            </div>

            {/* Tampilkan hasil, loading, atau error */}
            <div className="text-center">
                {isLoading && <p className="text-xl text-gray-400">Memuat data aset...</p>}
                
                {error && <p className="text-xl text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</p>}
                
                {totalAssets !== null && !isLoading && (
                    <div className="space-y-6">
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 max-w-md mx-auto">
                            <p className="text-lg text-gray-400">Total IP Assets Ditemukan</p>
                            <p className="text-6xl font-bold mt-2 text-white">{totalAssets}</p>
                        </div>

                        {totalAssets > 0 && (
                            <div className="text-left mt-8">
                                <h2 className="text-2xl font-bold mb-4 text-purple-400">Daftar IP Assets</h2>
                                <AssetTable assets={assets} onAssetClick={handleAssetClick} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExplorerPage;