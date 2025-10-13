import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import IPGraphPage from './pages/IPGraphPage';

function App() {
  return (
    <BrowserRouter>
      {/* --- ▼▼▼ PERBAIKAN: Layout disederhanakan, Sidebar dihapus ▼▼▼ --- */}
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <header className="mb-10 flex items-center gap-4">
            <img src="/favicon.png" alt="IP Scope Logo" className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-extrabold text-white">IP Scope</h1>
              <p className="text-purple-400">An On-Chain Provenance Visualization Tool</p>
            </div>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<IPGraphPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;