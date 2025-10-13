import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ExplorerPage from './pages/ExplorerPage';
import AssetDetailPage from './pages/AssetDetailPage';

function App() {
  return (
    <BrowserRouter>
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <Navbar />
            <main className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <Routes>
                    {/* Rute utama sekarang adalah ExplorerPage */}
                    <Route path="/" element={<ExplorerPage />} />
                    
                    {/* Rute untuk melihat detail aset individual */}
                    <Route path="/asset/:id" element={<AssetDetailPage />} />
                </Routes>
            </main>
        </div>
    </BrowserRouter>
  );
}

export default App;