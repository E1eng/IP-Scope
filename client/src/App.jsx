import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ExplorerPage from './pages/ExplorerPage';
import AssetDetailPage from './pages/AssetDetailPage'; // FIX: Impor yang hilang di sini!
import { SearchProvider } from './SearchContext'; 

// Placeholder untuk fitur masa depan
const IPGraphPage = () => <div className="text-xl text-gray-400 p-8">IP Graph Analysis is coming soon...</div>;
const MonitoringPage = () => <div className="text-xl text-gray-400 p-8">Asset Monitoring Dashboard is coming soon...</div>;

// --- Komponen Sidebar (Dashboard Look) ---
const navItems = [
    { to: '/', label: 'Explorer', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
    { to: '/ip-graph', label: 'Flow Graph', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { to: '/monitoring', label: 'Monitoring', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6a2 2 0 00-2-2H5a2 2 0 00-2 2v13M17 19V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v13M13 19V6a2 2 0 00-2-2H9a2 2 0 00-2 2v13" /></svg> },
];

function Sidebar() {
    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-950 border-r border-purple-900/40 p-6 z-50 flex flex-col">
            <div className="flex items-center gap-3 mb-10 border-b pb-4 border-gray-800">
                <img src="/favicon.png" alt="RoyaltyFlow Logo" className="w-10 h-10" />
                <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400">RoyaltyFlow</span>
            </div>
            <nav className="flex flex-col gap-2 mt-4">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${isActive ? 'bg-purple-900/30 text-purple-300 shadow-md border-l-4 border-purple-500' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`
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
        <SearchProvider> 
            <div className="min-h-screen bg-gray-900 text-white font-sans flex">
                <Sidebar />
                {/* Main Content Area: padding kiri 64 untuk menampung sidebar */}
                <div className="flex-grow md:pl-64 w-full">
                    <main className="w-full max-w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                        <Routes>
                            <Route path="/" element={<ExplorerPage />} />
                            {/* Rute baru untuk fitur masa depan */}
                            <Route path="/ip-graph" element={<IPGraphPage />} />
                            <Route path="/monitoring" element={<MonitoringPage />} />
                            <Route path="/asset/:id" element={<AssetDetailPage />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </SearchProvider>
    </BrowserRouter>
  );
}

export default App;