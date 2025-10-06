import React from 'react';

const StatPill = ({ label, value, colorClass }) => (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {label}: {value}
    </span>
);

const LicenseCard = ({ asset }) => {
  // Data sudah dinormalisasi di backend, termasuk pilTerms dan royaltyPolicy
  const { pilTerms, royaltyPolicy } = asset;
  
  if (!pilTerms && !royaltyPolicy) {
    return (
      <div className="bg-gray-800 p-4 rounded-xl text-gray-500 border border-gray-700/50">
        <h4 className="font-bold text-lg mb-2 text-white">License & Royalty Info</h4>
        <p>No specific PIL terms or royalty policy found for this asset.</p>
        <p className="text-xs mt-1">Default Story Protocol licensing applies.</p>
      </div>
    );
  }

  // PIL Terms (Public IP License) Analysis
  const termName = pilTerms?.commercialUse ? 'Commercial' : 'Non-Commercial';
  const termColor = pilTerms?.commercialUse ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300';
  const transferColor = pilTerms?.transferable ? 'bg-blue-900/50 text-blue-300' : 'bg-red-900/50 text-red-300';
  const derivativeColor = pilTerms?.derivativesAllowed ? 'bg-purple-900/50 text-purple-300' : 'bg-red-900/50 text-red-300';

  // Royalty Policy Analysis: Konversi 10000 menjadi 100%
  const royaltyRate = royaltyPolicy?.rate ? `${(royaltyPolicy.rate / 10000).toFixed(2)}%` : 'N/A';

  return (
    <div className="bg-gray-800 p-5 rounded-2xl shadow-inner border border-purple-700/50">
      <h4 className="font-extrabold text-xl mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">
        License Summary
      </h4>
      
      {/* Royalty Section */}
      <div className="mb-4 pb-3 border-b border-gray-700">
          <p className="text-sm font-semibold text-gray-300 mb-2">Royalty Policy</p>
          <div className="flex flex-wrap gap-2">
              <StatPill label="Royalty Rate" value={royaltyRate} colorClass={royaltyPolicy?.rate ? 'bg-cyan-900/50 text-cyan-300' : 'bg-gray-700 text-gray-400'} />
              <StatPill label="Token" value={royaltyPolicy?.payoutToken || 'ETH/Default'} colorClass="bg-gray-700 text-gray-400" />
          </div>
      </div>

      {/* PIL Terms Section */}
      {pilTerms && (
        <div>
          <p className="text-sm font-semibold text-gray-300 mb-2">Public IP License (PIL) Terms</p>
          <div className="flex flex-wrap gap-2">
              <StatPill label="Usage" value={termName} colorClass={termColor} />
              <StatPill label="Transferable" value={pilTerms.transferable ? 'YES' : 'NO'} colorClass={transferColor} />
              <StatPill label="Derivatives" value={pilTerms.derivativesAllowed ? 'ALLOWED' : 'DENIED'} colorClass={derivativeColor} />
          </div>
          {pilTerms.uri && (
              <p className="text-xs text-gray-500 mt-3 truncate">
                  URI: {pilTerms.uri}
              </p>
          )}
        </div>
      )}
      
      <p className="text-xs text-gray-600 mt-4 pt-3 border-t border-gray-800">
        Note: This is a simplified summary of on-chain configuration.
      </p>
    </div>
  );
};

export default LicenseCard;