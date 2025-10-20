import React, { useState, useEffect } from 'react';
import axios from 'axios';


const StatPill = ({ label, value, colorClass }) => (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {label}: {value}
    </span>
);

const LicenseCard = ({ asset }) => {
  // Get data from the correct API location (licenses array)
  const licenses = asset.licenses || [];
  const pilTerms = licenses.length > 0 ? licenses[0] : null;
  const royaltyPolicy = licenses.find(license => license.terms?.royaltyPolicy && license.terms.royaltyPolicy !== "0x0000000000000000000000000000000000000000") || null;
  
  // Debug logging
  console.log('[LICENSE CARD] Asset data:', asset);
  console.log('[LICENSE CARD] Licenses:', licenses);
  console.log('[LICENSE CARD] PIL terms:', pilTerms);
  console.log('[LICENSE CARD] Royalty policy:', royaltyPolicy);
  
  
  const hasPilTerms = pilTerms && pilTerms.licenseTermsId && pilTerms.licenseTermsId !== 'Not available';
  const hasRoyaltyPolicy = royaltyPolicy && royaltyPolicy.terms && royaltyPolicy.terms.royaltyPolicy !== "0x0000000000000000000000000000000000000000";
  
  // Always show license info if we have any data (including default)
  const hasAnyLicenseInfo = (pilTerms && pilTerms.licenseTermsId) || (royaltyPolicy && royaltyPolicy.terms); 
  
  if (!hasAnyLicenseInfo) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg text-gray-500 border border-gray-700/50">
        <h4 className="font-bold text-lg mb-2 text-white">License & Royalty Info</h4>
        <p>No specific PIL terms or royalty policy found for this asset.</p>
        <p className="text-xs mt-1">Default Story Protocol licensing applies.</p>
      </div>
    );
  }

  // PIL Terms (Public IP License) Analysis
  const termName = pilTerms?.licenseTemplate || 'Default Story Protocol License';
  const isDefaultLicense = pilTerms?.licenseTermsId === 'Default Story Protocol';
  const termColor = isDefaultLicense ? 'bg-blue-900/50 text-blue-300' : (hasPilTerms ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400');
  const transferColor = isDefaultLicense ? 'bg-blue-900/50 text-blue-300' : (hasPilTerms ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-700 text-gray-400');
  const derivativeColor = isDefaultLicense ? 'bg-blue-900/50 text-blue-300' : (hasPilTerms ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 text-gray-400');

  // Royalty Policy Analysis
  const royaltyRate = hasRoyaltyPolicy ? (royaltyPolicy.royaltyRate || pilTerms?.royaltyRate) : (pilTerms?.royaltyRate || 'Not specified');
  const royaltyRateValue = hasRoyaltyPolicy ? 1 : 0;
  
  return (
  <div className="bg-gray-800/30 rounded-lg p-4 mb-4 border border-gray-700/30">
      <h4 className="font-medium text-base mb-3 text-gray-200">
        License Summary
      </h4>
      
      {/* Minimalist License Info - Only essential fields */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm font-medium">Type</span>
          <span className="text-gray-200 font-medium text-sm">{termName}</span>
        </div>
        
        {/* Commercial Use */}
        {pilTerms?.terms?.commercialUse !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm font-medium">Commercial</span>
            <span className={`font-medium text-sm ${pilTerms.terms.commercialUse ? 'text-green-400' : 'text-red-400'}`}>
              {pilTerms.terms.commercialUse ? '✓' : '✗'}
            </span>
          </div>
        )}
        
        {/* Derivatives */}
        {pilTerms?.terms?.derivativesAllowed !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm font-medium">Derivatives</span>
            <span className={`font-medium text-sm ${pilTerms.terms.derivativesAllowed ? 'text-green-400' : 'text-red-400'}`}>
              {pilTerms.terms.derivativesAllowed ? '✓' : '✗'}
            </span>
          </div>
        )}
        
        {/* Commercial Rev Share - Always show if available */}
        {pilTerms?.terms?.commercialRevShare !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm font-medium">Rev Share</span>
            <span className="text-yellow-400 font-medium text-sm">
              {pilTerms.terms.commercialRevShare > 0 
                ? `${(pilTerms.terms.commercialRevShare / 1000000).toFixed(1)}%`
                : '0%'
              }
            </span>
          </div>
        )}
        
        {/* Transferable - Always show if available */}
        {pilTerms?.terms?.transferable !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm font-medium">Transferable</span>
            <span className={`font-medium text-sm ${pilTerms.terms.transferable ? 'text-green-400' : 'text-red-400'}`}>
              {pilTerms.terms.transferable ? '✓' : '✗'}
            </span>
          </div>
        )}
        
        {/* Minting Fee - Only show if significant */}
        {pilTerms?.terms?.defaultMintingFee && pilTerms.terms.defaultMintingFee !== '0' && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm font-medium">Fee</span>
            <span className="text-orange-400 font-medium text-sm">{(parseInt(pilTerms.terms.defaultMintingFee) / Math.pow(10, 18)).toFixed(2)} IP</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LicenseCard;