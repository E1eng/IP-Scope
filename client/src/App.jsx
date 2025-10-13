import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // Import kembali
import Navbar from './components/Navbar';
import ExplorerPage from './pages/ExplorerPage';

function App() {
  return (
    // Bungkus semua dengan BrowserRouter
    <BrowserRouter>
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <main className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <Navbar />
                {/* Gunakan Routes dan Route untuk halaman utama */}
                <Routes>
                    <Route path="/" element={<ExplorerPage />} />
                </Routes>
            </main>
        </div>
    </BrowserRouter>
  );
}

export default App;