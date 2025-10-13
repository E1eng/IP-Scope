import React from 'react';
// Tidak perlu Link lagi karena kita hanya akan me-refresh halaman ke root
// atau bisa tetap menggunakan Link jika BrowserRouter sudah ada. Mari kita gunakan cara yang lebih sederhana.

function Navbar() {
    return (
        <header className="mb-10 flex items-center justify-between">
            {/* Menggunakan tag <a> biasa untuk kembali ke halaman utama */}
            <a href="/" className="flex items-center gap-4">
                <img src="/favicon.png" alt="IP Oracle Logo" className="w-12 h-12" />
                <div>
                    <h1 className="text-3xl font-extrabold text-white">IP Oracle</h1>
                    <p className="text-purple-400">On-Chain IP Analytics</p>
                </div>
            </a>
        </header>
    );
}

export default Navbar;