import React, { useState, useEffect } from 'react';

// Color contrast checker component for development
const ColorContrastChecker = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [contrastRatios, setContrastRatios] = useState({});

  // Common color combinations to test
  const colorCombinations = [
    { name: 'Primary Text on Dark', fg: '#ffffff', bg: '#111827' },
    { name: 'Secondary Text on Dark', fg: '#9ca3af', bg: '#111827' },
    { name: 'Muted Text on Dark', fg: '#6b7280', bg: '#111827' },
    { name: 'Indigo on Dark', fg: '#6366f1', bg: '#111827' },
    { name: 'Red on Dark', fg: '#ef4444', bg: '#111827' },
    { name: 'Green on Dark', fg: '#10b981', bg: '#111827' },
    { name: 'Yellow on Dark', fg: '#f59e0b', bg: '#111827' },
    { name: 'White on Indigo', fg: '#ffffff', bg: '#6366f1' },
    { name: 'White on Red', fg: '#ffffff', bg: '#ef4444' },
    { name: 'White on Green', fg: '#ffffff', bg: '#10b981' },
  ];

  // Calculate relative luminance
  const getLuminance = (color) => {
    const rgb = color.match(/\d+/g);
    if (!rgb) return 0;
    const [r, g, b] = rgb.map(x => {
      const val = parseInt(x) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // Calculate contrast ratio
  const getContrastRatio = (color1, color2) => {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  };

  // Check if contrast meets WCAG standards
  const getContrastStatus = (ratio, isLargeText = false) => {
    const minRatio = isLargeText ? 3 : 4.5;
    if (ratio >= 7) return { status: 'AAA', color: 'text-green-400' };
    if (ratio >= minRatio) return { status: 'AA', color: 'text-yellow-400' };
    return { status: 'FAIL', color: 'text-red-400' };
  };

  useEffect(() => {
    const ratios = {};
    colorCombinations.forEach(combo => {
      const ratio = getContrastRatio(combo.fg, combo.bg);
      ratios[combo.name] = ratio;
    });
    setContrastRatios(ratios);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium focus-ring-primary"
        aria-label="Open color contrast checker"
      >
        Check Contrast
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-md max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Color Contrast Checker</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white focus-ring-primary"
          aria-label="Close contrast checker"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-3">
        {colorCombinations.map(combo => {
          const ratio = contrastRatios[combo.name] || 0;
          const normalStatus = getContrastStatus(ratio, false);
          const largeStatus = getContrastStatus(ratio, true);
          
          return (
            <div key={combo.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{combo.name}</span>
                <span className="text-sm font-mono text-gray-400">{ratio.toFixed(2)}:1</span>
              </div>
              
              <div 
                className="p-3 rounded text-sm font-medium"
                style={{ 
                  backgroundColor: combo.bg, 
                  color: combo.fg 
                }}
              >
                Sample text for contrast testing
              </div>
              
              <div className="flex space-x-4 text-xs">
                <span className={normalStatus.color}>
                  Normal: {normalStatus.status}
                </span>
                <span className={largeStatus.color}>
                  Large: {largeStatus.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <div>• AA: 4.5:1 (normal), 3:1 (large)</div>
          <div>• AAA: 7:1 (normal), 4.5:1 (large)</div>
          <div>• Large text: 18pt+ or 14pt+ bold</div>
        </div>
      </div>
    </div>
  );
};

export default ColorContrastChecker;
