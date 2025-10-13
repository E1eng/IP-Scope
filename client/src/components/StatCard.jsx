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

function StatCard({ title, value, isWarning = false, icon }) {
    return (
        <div className={`bg-gray-800 p-6 rounded-xl border ${isWarning ? 'border-red-500' : 'border-gray-700'} shadow-xl`}>
            <div className="flex justify-between items-start">
                <p className="text-sm text-gray-400 uppercase tracking-wider">{title}</p>
                {icon && <Icons type={icon} />}
            </div>
            <p className={`text-3xl font-bold mt-2 ${isWarning ? 'text-red-400' : 'text-white'}`}>{value}</p>
        </div>
    );
}

export default StatCard;