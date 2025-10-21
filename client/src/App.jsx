import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ExplorerPage from './pages/ExplorerPage';
import AssetDetailPage from './pages/AssetDetailPage';
import { SearchProvider } from './SearchContext'; 
import { 
  Search, 
  CheckCircle, 
  Zap, 
  BarChart3, 
  Menu, 
  X, 
  ExternalLink 
} from 'lucide-react';
import { getSkipLinkProps, announceToScreenReader } from './utils/accessibility'; 

const IPGraphPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-6 animate-fade-in">
      <h2 className="text-4xl font-bold text-gradient">Flow Graph</h2>
      <p className="text-xl text-gray-400">Coming Soon</p>
    </div>
  </div>
);

const MonitoringPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-6 animate-fade-in">
      <h2 className="text-4xl font-bold text-gradient">Monitoring</h2>
      <p className="text-xl text-gray-400">Coming Soon</p>
    </div>
  </div>
);

// --- Navigation Items ---
const navItems = [
    { to: '/', label: 'Explorer', icon: Search },
    { to: '/ip-graph', label: 'Flow Graph', icon: Zap },
    { to: '/monitoring', label: 'Monitoring', icon: BarChart3 },
];

function Sidebar() {
    return (
        <aside 
          className="fixed left-0 top-0 h-screen w-72 bg-gray-950/95 backdrop-blur-xl border-r border-gray-800/50 p-8 z-50 flex flex-col animate-slide-down hidden lg:flex"
          role="navigation"
          aria-label="Main navigation"
        >
            <div className="flex items-center gap-4 mb-12 border-b pb-6 border-gray-800/50">
                <img src="/favicon.ico" alt="IPScope Logo" className="w-16 h-16" />
                <div>
                  <span className="text-2xl font-black text-gray-100">IPScope</span>
                  <p className="text-xs text-gray-500 font-medium">v1.0.0</p>
                </div>
            </div>
            <nav className="flex flex-col gap-3 mt-4" role="list">
                {navItems.map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                                `flex items-center gap-4 px-6 py-4 rounded-2xl font-semibold transition-smooth group animate-slide-up focus-ring-primary ${
                                  isActive 
                                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-300 shadow-lg border border-indigo-500/30' 
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white hover:scale-105'
                                }`
                            }
                            style={{ animationDelay: `${index * 0.1}s` }}
                            aria-current={({ isActive }) => isActive ? 'page' : undefined}
                            role="listitem"
                        >
                            <div className={`p-2 rounded-lg transition-smooth ${
                              navItems.find(nav => nav.to === item.to) ? 'group-hover:bg-indigo-500/20' : ''
                            }`}>
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <span className="text-lg">{item.label}</span>
                    </NavLink>
                    );
                })}
            </nav>
            
            {/* Footer */}
            <div className="mt-auto p-6 border-t border-gray-800/50">
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">Developed by</p>
                    <a 
                        href="https://twitter.com/EL3NG" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 transition-smooth font-medium text-sm flex items-center justify-center gap-2"
                        aria-label="Follow @EL3NG on Twitter"
                    >
                        @EL3NG
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </aside>
    );
}

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle escape key for closing modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        announceToScreenReader('Mobile menu closed');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  return (
    <BrowserRouter>
        <SearchProvider> 
            <div className="min-h-screen w-full bg-gray-950 text-white font-sans flex">
                {/* Skip to content link */}
                <a {...getSkipLinkProps()}>
                  Skip to main content
                </a>
                
                <Sidebar />
                
                {/* Mobile Menu Button */}
                {!mobileMenuOpen && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(true);
                      announceToScreenReader('Mobile menu opened');
                    }}
                    className="lg:hidden fixed top-5 left-4 z-50 p-2.5 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg hover:bg-gray-800 transition-smooth shadow-xl focus-ring-primary"
                    aria-label="Open mobile menu"
                    aria-expanded={false}
                    aria-controls="mobile-menu"
                  >
                    <Menu className="w-5 h-5 text-gray-300" />
                  </button>
                )}

                {/* Mobile Sidebar Overlay */}
                {mobileMenuOpen && (
                  <div className="lg:hidden fixed inset-0 z-40">
                    {/* Backdrop */}
                    <div 
                      className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-hidden="true"
                    />
                    
                    {/* Sidebar */}
                    <div 
                      id="mobile-menu"
                      className="relative h-screen w-80 max-w-[85vw] bg-gray-950/95 border-r border-gray-800 flex flex-col animate-slide-in"
                      role="navigation"
                      aria-label="Mobile navigation"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-800">
                        <div className="flex items-center gap-4">
                          <img src="/favicon.ico" alt="IPScope Logo" className="w-16 h-16" />
                          <div>
                            <h1 className="text-xl font-bold text-gray-100">IPScope</h1>
                            <p className="text-xs text-gray-500">v1.0.0</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMobileMenuOpen(false);
                            announceToScreenReader('Mobile menu closed');
                          }}
                          className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors focus-ring-primary"
                          aria-label="Close mobile menu"
                        >
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>

                      {/* Navigation */}
                      <nav className="flex-1 p-6">
                        <div className="space-y-2">
                          {navItems.map((item, index) => {
                            const IconComponent = item.icon;
                            return (
                              <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMobileMenuOpen(false);
                                  announceToScreenReader(`Navigated to ${item.label}`);
                                }}
                                className={({ isActive }) =>
                                  `flex items-center gap-4 px-4 py-4 rounded-xl font-medium transition-smooth group focus-ring-primary ${
                                    isActive 
                                      ? 'bg-indigo-600/20 text-indigo-300 border-l-4 border-indigo-500' 
                                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                  }`
                                }
                                style={{ animationDelay: `${index * 50}ms` }}
                                aria-current={({ isActive }) => isActive ? 'page' : undefined}
                              >
                                <div className="p-2 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                                  <IconComponent className="w-5 h-5" />
                                </div>
                                <span className="text-base">{item.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      </nav>

                      {/* Footer */}
                      <div className="p-6 border-t border-gray-800">
                        <div className="text-center space-y-2">
                          <p className="text-xs text-gray-500">
                            Developed by
                          </p>
                          <a
                            href="https://x.com/EL3NG"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            <span>@EL3NG</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Content Area: padding kiri 72 untuk menampung sidebar */}
                <div className="flex-grow lg:pl-72 w-full bg-gray-950">
                    <main 
                      id="main-content"
                      className="w-full max-w-full mx-auto py-8 px-4 sm:px-6 lg:px-8"
                      role="main"
                      aria-label="Main content"
                    >
                        <Routes>
                            <Route path="/" element={<ExplorerPage />} />
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