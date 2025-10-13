import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import AssetTable from '../components/AssetTable';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ExplorerPage() {
    const [address, setAddress] = useState('');
    const [assets, setAssets] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleFetch = async (e) => {
        if (e) e.preventDefault();
        const addressToFetch = address.trim();
        if (!addressToFetch) return;

        setIsLoading(true);
        setError('');
        setAssets([]);
        setStats(null);

        try {
            const assetsRes = await axios.get(`${API_BASE_URL}/owner/${addressToFetch}/assets`);
            const ownedAssets = assetsRes.data;

            if (ownedAssets.length === 0) {
                setAssets([]);
                setStats({ totalAssets: 0, totalRoyalties: '0.00', activeDisputes: 0 });
                setIsLoading(false);
                return;
            }

            // Untuk performa, kita hanya akan menghitung statistik ringkas di sini
            let activeDisputes = 0;
            const analyticsPromises = ownedAssets.map(asset => 
                axios.get(`${API_BASE_URL}/assets/${asset.ipId}/details`).then(res => {
                    if (res.data.analytics?.disputeStatus === 'Active') {
                        activeDisputes++;
                    }
                    return res.data; // Mengembalikan data lengkap
                })
            );

            const assetsWithDetails = await Promise.all(analyticsPromises);
            
            let totalRoyalties = 0;
            assetsWithDetails.forEach(asset => {
                if(asset.analytics && asset.analytics.totalRoyaltiesPaid){
                    Object.values(asset.analytics.totalRoyaltiesPaid).forEach(val => {
                        totalRoyalties += parseFloat(val);
                    });
                }
            });
            
            setAssets(assetsWithDetails);
            setStats({
                totalAssets: ownedAssets.length,
                totalRoyalties: totalRoyalties.toFixed(2),
                activeDisputes: activeDisputes,
            });

        } catch (err) {
            setError('Failed to fetch data. Please check the address and try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                <h1 className="text-3xl font-bold text-white mb-4">IP Oracle Explorer</h1>
                <p className="text-purple-300 mb-6">Enter an Ethereum address to analyze its IP asset portfolio.</p>
                <form onSubmit={handleFetch} className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Paste wallet address (e.g., 0x...)"
                        className="flex-grow p-4 bg-gray-900 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600/50 focus:border-purple-500 transition-all text-white shadow-md text-lg"
                        required
                    />
                    <button type="submit" disabled={isLoading} className="p-4 px-8 font-bold text-white bg-purple-600 rounded-xl shadow-lg hover:bg-purple-700 disabled:bg-gray-600">
                        {isLoading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </form>
                {error && <p className="mt-4 text-red-400">{error}</p>}
            </div>

            {isLoading && <div className="text-center p-10 text-lg">Analyzing portfolio... This may take a moment.</div>}

            {stats && !isLoading && (
                 <div>
                    <h2 className="text-2xl font-bold mb-6">Portfolio Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Total IP Assets" value={stats.totalAssets} />
                        <StatCard title="Total Royalties (Aggregated)" value={`$${stats.totalRoyalties}`} />
                        <StatCard title="Active Disputes" value={stats.activeDisputes} isWarning={stats.activeDisputes > 0} />
                    </div>
                </div>
            )}
            
            {assets.length > 0 && !isLoading && (
                <div className="mt-10">
                    <h2 className="text-2xl font-bold mb-4">Owned Assets</h2>
                    <AssetTable assets={assets} onAssetClick={(id) => navigate(`/asset/${id}`)} />
                </div>
            )}
        </div>
    );
}

export default ExplorerPage;