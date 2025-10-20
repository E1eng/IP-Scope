import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // FIX: Tambahkan useNavigate di sini
import axios from 'axios';
import RemixDetailModalContent from '../components/RemixDetailModal';

// Komponen untuk menampilkan token breakdown di halaman detail
const TokenBreakdownCard = ({ asset }) => {
    const [tokenBreakdown, setTokenBreakdown] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!asset?.ipId) return;
        
        const fetchTokenBreakdown = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(`${API_BASE_URL}/assets/${asset.ipId}`);
                const assetData = response.data;
                
                if (assetData?.analytics?.totalRoyaltiesPaid) {
                    setTokenBreakdown(assetData.analytics.totalRoyaltiesPaid);
                }
            } catch (error) {
                console.error('Error fetching token breakdown:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokenBreakdown();
    }, [asset?.ipId]);

    if (isLoading) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">💰 Token Breakdown</h3>
                <div className="text-center text-purple-400">Loading token breakdown...</div>
            </div>
        );
    }

    if (!tokenBreakdown || Object.keys(tokenBreakdown).length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">💰 Token Breakdown</h3>
                <div className="text-center text-gray-500">No token breakdown available</div>
            </div>
        );
    }

    const totalValue = Object.values(tokenBreakdown).reduce((sum, token) => sum + parseFloat(token.total || 0), 0);

    return (
        <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-purple-300 mb-4">💰 Token Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(tokenBreakdown).map(([symbol, data]) => {
                    const amount = parseFloat(data.total || 0);
                    const percentage = totalValue > 0 ? (amount / totalValue * 100).toFixed(1) : 0;
                    
                    return (
                        <div key={symbol} className="bg-gray-700/30 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        {symbol.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white text-lg">{symbol}</div>
                                        <div className="text-sm text-gray-400">
                                            {data.count || 0} transactions
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-white text-lg">
                                        {amount.toFixed(6)} {symbol}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        {percentage}% of total
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-purple-300 text-lg">Total Value:</span>
                    <span className="font-bold text-white text-xl">
                        {totalValue.toFixed(6)} tokens
                    </span>
                </div>
            </div>
        </div>
    );
}; 

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function AssetDetailPage() {
    const { id } = useParams();
    const [asset, setAsset] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate(); 

    useEffect(() => {
        const fetchAsset = async () => {
            if (!id) return;
            setIsLoading(true);
            setError('');
            try {
                // Memanggil endpoint detail
                const response = await axios.get(`${API_BASE_URL}/assets/${id}/details`);
                setAsset(response.data);
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Failed to load asset details.';
                setError(errorMessage);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAsset();
    }, [id]);

    const handleGoBack = () => {
        // Mengarahkan ke halaman Explorer
        navigate('/'); 
    };

    if (isLoading) {
        return (
            <div className="text-center py-20">
                <div className="animate-spin h-10 w-10 mx-auto border-4 border-purple-400 border-t-transparent rounded-full"></div>
                <p className="mt-4 text-lg">Loading IP Asset Data...</p>
            </div>
        );
    }

    if (error) {
         return (
            <div className="text-center py-20 bg-red-900/20 p-8 rounded-xl">
                <h2 className="text-2xl font-bold text-red-300">Error Loading Asset</h2>
                <p className="text-red-400 mt-2">{error}</p>
                 <button onClick={handleGoBack} className="mt-6 inline-block bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors">
                    &larr; Kembali ke Daftar Aset
                </button>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-5xl mx-auto">
            <button 
                onClick={handleGoBack} 
                className="text-purple-400 hover:text-purple-300 mb-6 inline-flex items-center space-x-2 transition-colors font-semibold"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span>Kembali ke Daftar Aset</span>
            </button>
            
            {asset && (
                <>
                    <TokenBreakdownCard asset={asset} />
                    <RemixDetailModalContent asset={asset} isPage={true} />
                </>
            )}
        </div>
    );
}

export default AssetDetailPage;