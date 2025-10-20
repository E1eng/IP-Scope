import React from 'react';

const DetailRow = ({ label, value, isLink = false }) => {
  if (value === null || value === undefined || value === '') return null;
  
  const displayValue = String(value);

  return (
    <div className="flex justify-between items-center py-2 border-b border-purple-900 last:border-b-0">
      <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">{label}</span>
      {isLink ? (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs font-bold text-blue-400 hover:text-blue-300 underline break-words max-w-[60%]"
          title={displayValue}
        >
          {displayValue.substring(0, 30)}...
        </a>
      ) : (
        <span className="text-xs font-bold text-white break-words max-w-[60%]">{displayValue}</span>
      )}
    </div>
  );
};


export default DetailRow;