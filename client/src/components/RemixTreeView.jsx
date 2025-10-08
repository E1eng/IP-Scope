import React from 'react';

const TreeNode = ({ node, startAssetId, level = 0 }) => {
  const isStartNode = node.ipId === startAssetId;
  const isError = node.mediaType === 'ERROR';

  return (
    <div style={{ marginLeft: `${level * 24}px` }} className="my-1">
      <div className={`flex items-center p-2 rounded-lg ${isStartNode ? 'bg-purple-900/50' : ''}`}>
        <span className="mr-3 text-gray-500">{node.children && node.children.length > 0 ? '📂' : '📄'}</span>
        <span className={`font-semibold ${isStartNode ? 'text-purple-300' : isError ? 'text-red-400' : 'text-white'}`}>
          {node.title || 'Untitled'}
        </span>
        <span className="text-gray-500 ml-3 text-xs font-mono">({node.ipId.substring(0, 8)}...)</span>
      </div>
      
      {node.children && node.children.length > 0 && (
        <div className="border-l-2 border-gray-700 pl-2">
          {node.children.map(child => (
            <TreeNode 
              key={child.ipId} 
              node={child} 
              startAssetId={startAssetId} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RemixTreeView = ({ treeData, isTreeLoading, startAssetId }) => {
  if (isTreeLoading) {
    return <div className="text-center p-8 text-purple-400">Loading Remix Tree...</div>;
  }
  
  if (!treeData) {
    return <div className="text-center p-8 text-gray-500">Click 'Remix Tree' to load visualization.</div>;
  }
  
  if (treeData.error) {
      return <div className="text-center p-8 text-red-400">{treeData.error}</div>
  }

  return (
    <div>
      <TreeNode node={treeData} startAssetId={startAssetId} />
    </div>
  );
};

export default RemixTreeView;