import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import RemixTreePage from './pages/RemixTreePage';

// Komponen Sidebar/Navigasi Baru
const Sidebar = () => {
  const baseClasses = "flex items-center p-3 my-1 rounded-xl text-gray-300 font-semibold transition-colors";
  const activeClasses = "bg-purple-600/20 text-purple-400 border-l-4 border-purple-500";
  const hoverClasses = "hover:bg-gray-700/50";

  return (
    <div className="w-full lg:w-64 bg-gray-800 p-4 rounded-2xl shadow-xl sticky top-4 h-fit">
      <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-3">IP Scope</h2>
      <nav className="space-y-2">
        <NavLink 
          to="/" 
          className={({ isActive }) => `${baseClasses} ${hoverClasses} ${isActive ? activeClasses : ''}`}
        >
          {/* Ikon Pencarian */}
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Asset Search
        </NavLink>
        <NavLink 
          to="/remix-tree" 
          className={({ isActive }) => `${baseClasses} ${hoverClasses} ${isActive ? activeClasses : ''}`}
        >
          {/* Ikon Pohon Remix */}
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Remix Tree View
        </NavLink>
      </nav>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
        <header className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                IP Asset Analyzer
            </h1>
            <p className="text-gray-400 mt-2">
                Analytic dashboard built with Story Protocol API.
            </p>
        </header>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <Sidebar />
          
          <main className="flex-grow">
            <Routes>
              {/* Route untuk halaman utama (pencarian) */}
              <Route path="/" element={<SearchPage />} />
              {/* Route baru untuk halaman Remix Tree */}
              <Route path="/remix-tree" element={<RemixTreePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;