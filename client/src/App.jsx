import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import IPGraphPage from './pages/IPGraphPage';

const navItems = [
  { to: '/', label: 'Asset Search', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
  ) },
  { to: '/ip-graph', label: 'IP Graph', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
  ) },
];

function Sidebar() {
  // ... (Kode Sidebar tidak perlu diubah, tetap sama seperti yang Anda berikan)
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border-r border-purple-900/40 shadow-2xl p-6 z-50 hidden md:flex flex-col">
      <div className="flex items-center gap-3 mb-10">
        <img src="/favicon.png" alt="IP Scope Logo" className="w-10 h-10" />
        <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-pink-500 animate-gradient-x">IP Scope</span>
      </div>
      <nav className="flex flex-col gap-2 mt-4">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-5 py-3 rounded-xl font-semibold text-lg transition-all duration-200 ${isActive ? 'bg-purple-900/30 text-purple-300 shadow-lg border-l-4 border-purple-500' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white flex">
        <Sidebar />
        {/* Konten Utama dengan padding kiri untuk memberi ruang bagi sidebar di desktop */}
        <div className="flex-grow md:pl-72">
          <div className="w-full max-w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <main className="flex-grow min-h-[70vh]">
              <Routes>
                <Route path="/" element={<SearchPage />} />
                <Route path="/ip-graph" element={<IPGraphPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;