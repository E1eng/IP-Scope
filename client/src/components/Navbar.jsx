import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
    return (
        <header className="mb-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-4">
                <img src="/favicon.png" alt="IP Oracle Logo" className="w-12 h-12" />
                <div>
                    <h1 className="text-3xl font-extrabold text-white">IP Oracle</h1>
                    <p className="text-purple-400">On-Chain IP Analytics</p>
                </div>
            </Link>
        </header>
    );
}

export default Navbar;