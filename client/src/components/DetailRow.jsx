import React from 'react';

const DetailRow = ({ label, value, isLink = false }) => {
  // Hanya tampilkan jika value valid dan bukan 0 (kecuali explicitly 0)
  if (value === null || value === undefined || value === '') return null;
  
  const displayValue = String(value);

  return (
    <div className="flex justify-between py-2 border-b border-gray-700/50 last:border-b-0">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      {isLink ? (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm font-semibold text-blue-400 hover:text-blue-300 underline break-words max-w-[60%]"
          title={displayValue}
        >
          {displayValue.substring(0, 30)}...
        </a>
      ) : (
        <p className="text-sm font-semibold text-white break-words max-w-[60%]">{displayValue}</p>
      )}
    </div>
  );
};

export default DetailRow;