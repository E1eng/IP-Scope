import React from 'react';

// Komponen utilitas untuk render SVG Icons
const Icons = ({ type }) => {
    switch (type) {
        case 'royalty':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V3m0 9v3m0 3.01V21M12 21A9 9 0 0012 3m0 18A9 9 0 0012 3" /></svg>;
        case 'asset':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
        case 'volume':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
        case 'license':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.49 9.356 5 8 5c-4 0-4 4-4 8s0 8 4 8c3.54 0 4.86-.443 6-2m0 0c1.14 1.557 2.46 2 4 2 4 0 4-4 4-8s0-8-4-8c-1.356 0-2.832.49-4 1.253" /></svg>;
        default:
            return null;
    }
}

// Loading Skeleton Component
const LoadingSkeleton = () => (
    <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-700 rounded w-32"></div>
    </div>
);

// Error State Component
const ErrorState = ({ message }) => (
    <div className="text-red-400">
        <p className="text-sm font-semibold mb-1">Failed to Load</p>
        <p className="text-xs text-gray-500">{message || 'Failed to load data'}</p>
    </div>
);

function StatCard({ title, value, isWarning = false, icon, isLoading = false, error = null, progressPercent = null }) {
    // Determine if value indicates an error state
    const isError = error || value === 'Error' || value === 'N/A';
    
    return (
        <div className={`stat-card ${isWarning ? 'border-red-500/50' : isError ? 'border-yellow-500/50' : 'border-gray-700/50'} group animate-scale-in`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
                </div>
                {icon && <div className="opacity-80 group-hover:opacity-100 transition-opacity duration-300">{icon}</div>}
            </div>
            
            <div className="space-y-3">
                {isLoading ? (
                    <LoadingSkeleton />
                ) : error ? (
                    <ErrorState message={error} />
                ) : (
                    <>
                        <div className="flex items-baseline space-x-2">
                          <p className={`text-4xl font-black ${isWarning ? 'text-red-400' : isError ? 'text-yellow-500' : 'text-white'}`}>
                              {value}
                          </p>
                          {isError && (value === 'N/A' || value === 'Error') && (
                              <p className="text-sm text-gray-500">No data available</p>
                          )}
                        </div>
                        
                        {/* Optional progress bar */}
                        {typeof progressPercent === 'number' && progressPercent >= 0 && progressPercent < 100 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                  <span>Progress</span>
                                  <span>{progressPercent}%</span>
                                </div>
                                <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500 ease-out" 
                                      style={{ width: `${progressPercent}%` }} 
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {/* Loading indicator overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-900/50 rounded-xl flex items-center justify-center">
                    <div className="animate-spin h-6 w-6 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                </div>
            )}
        </div>
    );
}

export default StatCard;