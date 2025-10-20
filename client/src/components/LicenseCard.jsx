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
  <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700/50">
      <h4 className="font-semibold text-lg mb-3 text-purple-300">
        📋 License Summary
      </h4>
      
      {/* Key License Info - Enhanced with useful fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">License Type:</span>
          <span className="text-white font-medium">{termName}</span>
        </div>
        
        {pilTerms?.licenseTermsId && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Terms ID:</span>
            <span className="text-blue-400 font-medium">{pilTerms.licenseTermsId}</span>
          </div>
        )}
        
        {pilTerms?.templateName && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Template:</span>
            <span className="text-purple-400 font-medium">{pilTerms.templateName.toUpperCase()}</span>
          </div>
        )}
        
        {/* Commercial Use */}
        {pilTerms?.terms?.commercialUse !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Commercial Use:</span>
            <span className={`font-medium ${pilTerms.terms.commercialUse ? 'text-green-400' : 'text-red-400'}`}>
              {pilTerms.terms.commercialUse ? 'Allowed' : 'Not Allowed'}
            </span>
          </div>
        )}
        
        {/* Derivatives */}
        {pilTerms?.terms?.derivativesAllowed !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Derivatives:</span>
            <span className={`font-medium ${pilTerms.terms.derivativesAllowed ? 'text-green-400' : 'text-red-400'}`}>
              {pilTerms.terms.derivativesAllowed ? 'Allowed' : 'Not Allowed'}
            </span>
          </div>
        )}
        
        {/* Transferable */}
        {pilTerms?.terms?.transferable !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Transferable:</span>
            <span className={`font-medium ${pilTerms.terms.transferable ? 'text-green-400' : 'text-red-400'}`}>
              {pilTerms.terms.transferable ? 'Yes' : 'No'}
            </span>
          </div>
        )}
        
        {/* Commercial Rev Share */}
        {pilTerms?.terms?.commercialRevShare && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Commercial Rev Share:</span>
            <span className="text-yellow-400 font-medium">{(pilTerms.terms.commercialRevShare / 1000000).toFixed(2)}%</span>
          </div>
        )}
        
        {/* Minting Fee */}
        {pilTerms?.terms?.defaultMintingFee && pilTerms.terms.defaultMintingFee !== '0' && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Minting Fee:</span>
            <span className="text-orange-400 font-medium">{(parseInt(pilTerms.terms.defaultMintingFee) / Math.pow(10, 18)).toFixed(4)} IP</span>
          </div>
        )}
        
        {/* Royalty Policy */}
        {pilTerms?.terms?.royaltyPolicy && pilTerms.terms.royaltyPolicy !== "0x0000000000000000000000000000000000000000" && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Royalty Policy:</span>
            <span className="text-cyan-400 font-medium text-xs">{pilTerms.terms.royaltyPolicy.substring(0, 8)}...</span>
          </div>
        )}
        
        {/* Commercial Attribution */}
        {pilTerms?.terms?.commercialAttribution !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Attribution Required:</span>
            <span className={`font-medium ${pilTerms.terms.commercialAttribution ? 'text-green-400' : 'text-red-400'}`}>
              {pilTerms.terms.commercialAttribution ? 'Yes' : 'No'}
            </span>
          </div>
        )}
        
        {/* Derivatives Attribution */}
        {pilTerms?.terms?.derivativesAttribution !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Derivative Attribution:</span>
            <span className={`font-medium ${pilTerms.terms.derivativesAttribution ? 'text-green-400' : 'text-red-400'}`}>
              {pilTerms.terms.derivativesAttribution ? 'Required' : 'Not Required'}
            </span>
          </div>
        )}
        
        {/* Expiration */}
        {pilTerms?.terms?.expiration && pilTerms.terms.expiration !== '0' && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Expiration:</span>
            <span className="text-red-400 font-medium">{new Date(parseInt(pilTerms.terms.expiration) * 1000).toLocaleDateString()}</span>
          </div>
        )}
        
        {/* Created Date */}
        {pilTerms?.createdAt && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Created:</span>
            <span className="text-gray-300 font-medium">{new Date(pilTerms.createdAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LicenseCard;