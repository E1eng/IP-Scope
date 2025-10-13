import React from 'react';

function StatCard({ title, value, isWarning = false }) {
    return (
        <div className={`bg-gray-800 p-6 rounded-xl border ${isWarning ? 'border-red-500' : 'border-gray-700'}`}>
            <p className="text-sm text-gray-400">{title}</p>
            <p className={`text-3xl font-bold mt-2 ${isWarning ? 'text-red-400' : 'text-white'}`}>{value}</p>
        </div>
    );
}

export default StatCard;