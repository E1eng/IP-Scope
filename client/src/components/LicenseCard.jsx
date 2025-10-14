import React from 'react';
// Menggunakan DetailRow yang Anda berikan
import DetailRow from './DetailRow'; 

const StatPill = ({ label, value, colorClass }) => (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {label}: {value}
    </span>
);

const LicenseCard = ({ asset }) => {
  // FIX: Ambil data dari lokasi API yang tepat (licenses[0])
  const firstLicense = asset.licenses && asset.licenses.length > 0 ? asset.licenses[0] : null;
  
  // Jika firstLicense ada, ambil terms dan licensingConfig
  const pilTerms = firstLicense?.terms;
  const royaltyPolicy = firstLicense?.licensingConfig;
  
  const hasPilTerms = pilTerms && pilTerms.commercialUse !== undefined;
  // Periksa apakah kebijakan royalti memiliki rate yang valid (rate dalam Story Protocol biasanya angka integer 0-10000)
  const hasRoyaltyPolicy = royaltyPolicy && royaltyPolicy.commercialRevShare !== undefined; 
  
  if (!hasPilTerms && !hasRoyaltyPolicy) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg text-gray-500 border border-gray-700/50">
        <h4 className="font-bold text-lg mb-2 text-white">License & Royalty Info</h4>
        <p>No specific PIL terms or royalty policy found for this asset.</p>
        <p className="text-xs mt-1">Default Story Protocol licensing applies.</p>
      </div>
    );
  }

  // PIL Terms (Public IP License) Analysis
  // Catatan: Menggunakan 'commercialUse' dari `pilTerms` API Response
  const termName = hasPilTerms && pilTerms.commercialUse ? 'Commercial' : 'Non-Commercial';
  const termColor = hasPilTerms && pilTerms.commercialUse ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300';
  const transferColor = hasPilTerms && pilTerms.transferable ? 'bg-blue-900/50 text-blue-300' : 'bg-red-900/50 text-red-300';
  const derivativeColor = hasPilTerms && pilTerms.derivativesAllowed ? 'bg-purple-900/50 text-purple-300' : 'bg-red-900/50 text-red-300';

  // Royalty Policy Analysis: commercialRevShare adalah integer (misal 5000000 = 5%)
  const royaltyRate = hasRoyaltyPolicy ? `${(royaltyPolicy.commercialRevShare / 10000).toFixed(2)}%` : '0.00%';
  const royaltyRateValue = hasRoyaltyPolicy ? royaltyPolicy.commercialRevShare : 0;
  
  return (
  <div className="card bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6 rounded-2xl shadow-xl border border-purple-900">
      <h4 className="font-extrabold text-lg mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 tracking-tight">
        License Summary
      </h4>
      
      {/* Royalty Section */}
      {hasRoyaltyPolicy && (
        <div className="mb-4 pb-4 border-b border-purple-900">
          <p className="text-sm font-light text-gray-300 mb-2">Royalty Policy</p>
          <div className="flex flex-wrap gap-3">
            <StatPill 
              label="Royalty Rate" 
              value={royaltyRate} 
              colorClass={royaltyRateValue > 0 ? 'bg-cyan-900/50 text-cyan-300' : 'bg-gray-700 text-gray-400'} 
            />
            {/* Menggunakan token yang dispesifikasikan dalam terms */}
            <StatPill label="Token" value={pilTerms.currency || 'ETH/Default'} colorClass="bg-gray-700 text-gray-400" /> 
          </div>
        </div>
      )}

      {/* PIL Terms Section */}
      {hasPilTerms && (
        <div>
          <p className="text-sm font-light text-gray-300 mb-2">PIL Terms</p>
          <div className="flex flex-wrap gap-3">
            <StatPill label="Usage" value={termName} colorClass={termColor} />
            <StatPill label="Transferable" value={pilTerms.transferable ? 'YES' : 'NO'} colorClass={transferColor} />
            <StatPill label="Derivatives" value={pilTerms.derivativesAllowed ? 'ALLOWED' : 'DENIED'} colorClass={derivativeColor} />
          </div>
          {pilTerms.uri && (
            <p className="text-xs text-gray-500 mt-3 truncate font-light">
              Terms URI: {pilTerms.uri}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LicenseCard;