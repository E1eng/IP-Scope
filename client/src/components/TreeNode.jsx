import React from 'react';

const TreeNode = ({ node, startNodeId, level = 0 }) => {
  // Menggunakan node.ipId untuk perbandingan
  const isStartNode = node.ipId === startNodeId;

  return (
    <div style={{ marginLeft: `${level * 20}px` }}>
      <div className={`flex items-center p-1 rounded ${isStartNode ? 'bg-purple-800' : ''}`}>
        <span className="mr-2">{node.children && node.children.length > 0 ? '📂' : '📄'}</span>
        <span className={isStartNode ? 'font-bold text-purple-300' : ''}>
          {/* Menggunakan node.title */}
          {node.title || 'Untitled'}
        </span>
        <span className="text-gray-500 ml-2 text-xs">(ID: {node.ipId})</span>
      </div>
      
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <TreeNode 
              key={child.ipId} 
              node={child} 
              startNodeId={startNodeId} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;