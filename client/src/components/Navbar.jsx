import React from 'react';

function Navbar() {
    return (
        <header className="mb-10 flex items-center justify-between">
            <a href="/" className="flex items-center gap-4">
                <img src="/favicon.png" alt="IP Oracle Logo" className="w-12 h-12" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-100">IP Oracle</h1>
                    <p className="text-gray-400">On-Chain IP Analytics</p>
                </div>
            </a>
        </header>
    );
}

export default Navbar;