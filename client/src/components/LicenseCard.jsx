import React from 'react';

const StatPill = ({ label, value, colorClass }) => (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {label}: {value}
    </span>
);

const LicenseCard = ({ asset }) => {
  const { pilTerms, royaltyPolicy } = asset;
  
  // ▼▼▼ PERBAIKAN KRITIS BUG LISENSI: Cek apakah properti kunci lisensi ada (bukan undefined), terlepas dari nilainya (true/false/0) ▼▼▼
  const hasPilTerms = pilTerms && pilTerms.commercialUse !== undefined;
  // Cek apakah properti rate ada, bahkan jika rate-nya 0
  const hasRoyaltyPolicy = royaltyPolicy && royaltyPolicy.rate !== undefined;


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
  const termName = hasPilTerms && pilTerms.commercialUse ? 'Commercial' : 'Non-Commercial';
  const termColor = hasPilTerms && pilTerms.commercialUse ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300';
  const transferColor = hasPilTerms && pilTerms.transferable ? 'bg-blue-900/50 text-blue-300' : 'bg-red-900/50 text-red-300';
  const derivativeColor = hasPilTerms && pilTerms.derivativesAllowed ? 'bg-purple-900/50 text-purple-300' : 'bg-red-900/50 text-red-300';

  // Royalty Policy Analysis: Konversi 10000 menjadi 100%
  const royaltyRate = hasRoyaltyPolicy && royaltyPolicy.rate ? `${(royaltyPolicy.rate / 10000).toFixed(2)}%` : '0.00%';

  return (
    <div className="bg-gray-800 p-5 rounded-lg shadow-inner border border-purple-700/50">
      <h4 className="font-semibold text-lg mb-3 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">
        License Summary
      </h4>
      
      {/* Royalty Section */}
      {hasRoyaltyPolicy && (
          <div className="mb-3 pb-3 border-b border-gray-700">
              <p className="text-sm font-light text-gray-300 mb-2">Royalty Policy</p>
              <div className="flex flex-wrap gap-2">
                  <StatPill label="Royalty Rate" value={royaltyRate} colorClass={royaltyPolicy.rate > 0 ? 'bg-cyan-900/50 text-cyan-300' : 'bg-gray-700 text-gray-400'} />
                  <StatPill label="Token" value={royaltyPolicy.payoutToken || 'ETH/Default'} colorClass="bg-gray-700 text-gray-400" />
              </div>
          </div>
      )}

      {/* PIL Terms Section */}
      {hasPilTerms && (
        <div>
          <p className="text-sm font-light text-gray-300 mb-2">Public IP License (PIL) Terms</p>
          <div className="flex flex-wrap gap-2">
              <StatPill label="Usage" value={termName} colorClass={termColor} />
              <StatPill label="Transferable" value={pilTerms.transferable ? 'YES' : 'NO'} colorClass={transferColor} />
              <StatPill label="Derivatives" value={pilTerms.derivativesAllowed ? 'ALLOWED' : 'DENIED'} colorClass={derivativeColor} />
          </div>
          {pilTerms.uri && (
              <p className="text-xs text-gray-500 mt-3 truncate font-light">
                  URI: {pilTerms.uri}
              </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LicenseCard;