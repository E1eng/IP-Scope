import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ExplorerPage from './pages/ExplorerPage';
import AssetDetailPage from './pages/AssetDetailPage'; // FIX: Impor yang hilang di sini!
import FeaturesList from './components/FeaturesList';
import { SearchProvider } from './SearchContext'; 

// Placeholder untuk fitur masa depan
const IPGraphPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-6 animate-fade-in">
      <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto animate-float">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 className="text-4xl font-bold text-gradient">Flow Graph</h2>
      <p className="text-xl text-gray-400">Coming Soon</p>
    </div>
  </div>
);

const MonitoringPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-6 animate-fade-in">
      <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto animate-float">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6a2 2 0 00-2-2H5a2 2 0 00-2 2v13M17 19V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v13M13 19V6a2 2 0 00-2-2H9a2 2 0 00-2 2v13" />
        </svg>
      </div>
      <h2 className="text-4xl font-bold text-gradient">Monitoring</h2>
      <p className="text-xl text-gray-400">Coming Soon</p>
    </div>
  </div>
);

// --- Komponen Sidebar (Dashboard Look) ---
const navItems = [
    { to: '/', label: 'Explorer', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
    { to: '/features', label: 'Features', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { to: '/ip-graph', label: 'Flow Graph', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { to: '/monitoring', label: 'Monitoring', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6a2 2 0 00-2-2H5a2 2 0 00-2 2v13M17 19V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v13M13 19V6a2 2 0 00-2-2H9a2 2 0 00-2 2v13" /></svg> },
];

function Sidebar() {
    return (
        <aside className="fixed left-0 top-0 h-screen w-72 bg-gray-950/95 backdrop-blur-xl border-r border-purple-900/20 p-8 z-50 flex flex-col animate-slide-down hidden lg:flex">
            <div className="flex items-center gap-4 mb-12 border-b pb-6 border-gray-800/50">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center animate-float">
                    <img src="/favicon.png" alt="RoyaltyFlow Logo" className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-2xl font-black text-gradient">RoyaltyFlow</span>
                  <p className="text-xs text-gray-500 font-medium">IP Analytics</p>
                </div>
            </div>
            <nav className="flex flex-col gap-3 mt-4">
                {navItems.map((item, index) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-6 py-4 rounded-2xl font-semibold transition-all duration-300 group animate-slide-up ${
                              isActive 
                                ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-300 shadow-lg border border-purple-500/30' 
                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white hover:scale-105'
                            }`
                        }
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className={`p-2 rounded-lg transition-all duration-300 ${
                          navItems.find(nav => nav.to === item.to) ? 'group-hover:bg-purple-500/20' : ''
                        }`}>
                          {item.icon}
                        </div>
                        <span className="text-lg">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <BrowserRouter>
        <SearchProvider> 
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white font-sans flex">
                <Sidebar />
                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 hover:bg-gray-700/80 transition-all duration-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Mobile Sidebar Overlay */}
                {mobileMenuOpen && (
                  <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
                    <div className="fixed left-0 top-0 h-screen w-80 bg-gray-950/95 backdrop-blur-xl border-r border-purple-900/20 p-6 flex flex-col animate-slide-down">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                            <img src="/favicon.png" alt="RoyaltyFlow Logo" className="w-6 h-6" />
                          </div>
                          <span className="text-xl font-black text-gradient">RoyaltyFlow</span>
                        </div>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <nav className="flex flex-col gap-2">
                        {navItems.map((item, index) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                isActive 
                                  ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-300 shadow-lg border border-purple-500/30' 
                                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                              }`
                            }
                          >
                            <div className="p-1.5 rounded-lg">
                              {item.icon}
                            </div>
                            <span>{item.label}</span>
                          </NavLink>
                        ))}
                      </nav>
                    </div>
                  </div>
                )}

                {/* Main Content Area: padding kiri 72 untuk menampung sidebar */}
                <div className="flex-grow lg:pl-72 w-full">
                    <main className="w-full max-w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
                        <Routes>
                            <Route path="/" element={<ExplorerPage />} />
                            <Route path="/features" element={<FeaturesList />} />
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