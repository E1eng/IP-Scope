import React from 'react';

const TreeNode = ({ node, startNodeId, level = 0 }) => {
  const isStartNode = node.ipId === startNodeId;
  const isRoot = level === 0;

  return (
    <div style={{ marginLeft: `${level * 20}px` }} className={`relative py-1 border-l border-gray-700 ${!isRoot ? 'ml-5' : ''}`}>
      {/* Connector line for non-root nodes */}
      {!isRoot && <div className="absolute w-5 h-1 bg-gray-700 top-3 -left-5"></div>}
      
      <div className={`flex items-center p-2 rounded-lg transition-all ${isStartNode ? 'bg-purple-800/50 border border-purple-500' : 'bg-gray-700/30'}`}>
        <span className="mr-2 text-lg">{node.children && node.children.length > 0 ? '📁' : '📄'}</span>
        <span className={isStartNode ? 'font-bold text-purple-300' : 'text-white'}>
          {node.title || 'Untitled'}
        </span>
        <span className="text-gray-500 ml-2 text-xs truncate max-w-[200px]">(ID: {node.ipId})</span>
      </div>
      
      {/* Render children nodes */}
      {node.children && node.children.length > 0 && (
        <div className="mt-1">
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