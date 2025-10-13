import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import RemixDetailModal from '../components/RemixDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function AssetDetailPage() {
    const { id } = useParams();
    const [asset, setAsset] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAsset = async () => {
            if (!id) return;
            setIsLoading(true);
            setError('');
            try {
                const response = await axios.get(`${API_BASE_URL}/assets/${id}/details`);
                setAsset(response.data);
            } catch (err) {
                setError('Failed to load asset details.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAsset();
    }, [id]);

    const handleClose = () => {
        // Karena ini halaman, kita tidak perlu fungsi close, tapi komponen modal membutuhkannya.
    };

    if (isLoading) {
        return (
            <div className="text-center py-20">
                <div className="animate-spin h-10 w-10 mx-auto border-4 border-purple-400 border-t-transparent rounded-full"></div>
                <p className="mt-4 text-lg">Loading Asset Details...</p>
            </div>
        );
    }

    if (error) {
         return (
            <div className="text-center py-20 bg-red-900/20 p-8 rounded-xl">
                <h2 className="text-2xl font-bold text-red-300">Error</h2>
                <p className="text-red-400 mt-2">{error}</p>
                 <Link to="/" className="mt-6 inline-block bg-purple-600 text-white font-bold py-2 px-6 rounded-lg">
                    &larr; Back to Explorer
                </Link>
            </div>
        );
    }
    
    return (
        <div>
            <Link to="/" className="text-purple-400 hover:text-purple-300 mb-6 inline-block">
                &larr; Back to Explorer
            </Link>
            {/* Trik: Kita merender komponen modal seolah-olah itu adalah halaman.
              Ini memungkinkan kita menggunakan kembali semua UI yang sudah sempurna.
            */}
            {asset && <RemixDetailModal asset={asset} isLoading={false} onClose={handleClose} />}
        </div>
    );
}

export default AssetDetailPage;