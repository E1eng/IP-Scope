import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // FIX: Tambahkan useNavigate di sini
import axios from 'axios';
import RemixDetailModalContent from '../components/RemixDetailModal'; 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
            
            {asset && <RemixDetailModalContent asset={asset} isPage={true} />}
        </div>
    );
}

export default AssetDetailPage;