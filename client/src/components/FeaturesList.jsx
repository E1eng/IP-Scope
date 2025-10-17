import React from 'react';

const FeaturesList = () => {
  const features = [
    {
      category: '🔍 Search & Discovery',
      items: [
        { name: 'IP Asset Search', description: 'Search IP assets by creator address or token contract', status: 'active' },
        { name: 'Asset Grid View', description: 'Visual grid display of IP assets with images and metadata', status: 'active' },
        { name: 'Load More Pagination', description: 'Efficient pagination for large asset collections', status: 'active' },
        { name: 'Asset Detail Modal', description: 'Detailed view with metadata, licenses, and relationships', status: 'active' }
      ]
    },
    {
      category: '📊 Analytics & Statistics',
      items: [
        { name: 'Portfolio Statistics', description: 'Total IP assets, royalty collected, transaction count', status: 'active' },
        { name: 'Quick Stats Overview', description: 'At-a-glance metrics for portfolio performance', status: 'active' },
        { name: 'Royalty Analytics', description: 'Comprehensive royalty income analysis and trends', status: 'active' },
        { name: 'Network Statistics', description: 'Live Story Protocol network data and gas prices', status: 'active' },
        { name: 'On-Chain Analytics', description: 'Blockchain transaction history and gas analytics', status: 'active' }
      ]
    },
    {
      category: '🔗 Asset Relationships',
      items: [
        { name: 'Parent-Child Relationships', description: 'View derivative works and original IP connections', status: 'active' },
        { name: 'Children List with Pagination', description: 'Browse derivative works with load more functionality', status: 'active' },
        { name: 'Relationship Visualization', description: 'Visual representation of IP asset hierarchies', status: 'active' }
      ]
    },
    {
      category: '💰 Royalty Management',
      items: [
        { name: 'Royalty Income Tracking', description: 'Track earnings from IP asset licensing', status: 'active' },
        { name: 'Top Performing Assets', description: 'Identify highest earning IP assets', status: 'active' },
        { name: 'Top Licensees Analysis', description: 'Analyze biggest royalty contributors', status: 'active' },
        { name: 'Revenue Trends', description: 'Historical royalty income trends and patterns', status: 'active' }
      ]
    },
    {
      category: '🌐 Network Integration',
      items: [
        { name: 'Story Protocol API', description: 'Real-time data from Story Protocol network', status: 'active' },
        { name: 'StoryScan Integration', description: 'Blockchain data and transaction history', status: 'active' },
        { name: 'IPFS Support', description: 'IPFS metadata and image handling', status: 'active' },
        { name: 'External Links', description: 'Direct links to Story Protocol Explorer', status: 'active' }
      ]
    },
    {
      category: '🎨 User Interface',
      items: [
        { name: 'Responsive Design', description: 'Mobile and desktop optimized interface', status: 'active' },
        { name: 'Dark Theme', description: 'Modern dark theme with gradient accents', status: 'active' },
        { name: 'Loading States', description: 'Smooth loading animations and skeleton screens', status: 'active' },
        { name: 'Error Handling', description: 'Graceful error handling and user feedback', status: 'active' }
      ]
    },
    {
      category: '🚀 Coming Soon',
      items: [
        { name: 'Flow Graph', description: 'Visual IP asset relationship graph', status: 'planned' },
        { name: 'Monitoring Dashboard', description: 'Real-time portfolio monitoring and alerts', status: 'planned' },
        { name: 'Advanced Analytics', description: 'Machine learning insights and predictions', status: 'planned' },
        { name: 'Export Features', description: 'Export data to CSV, PDF, and other formats', status: 'planned' }
      ]
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Active</span>;
      case 'planned':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Planned</span>;
      case 'beta':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Beta</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">Unknown</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          Available Features
        </h2>
        <p className="text-gray-400 text-lg">
          Comprehensive IP asset management and analytics platform
        </p>
      </div>

      {features.map((category, categoryIndex) => (
        <div key={categoryIndex} className="card-modern p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">{category.category.split(' ')[0]}</span>
            {category.category.split(' ').slice(1).join(' ')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.items.map((feature, featureIndex) => (
              <div key={featureIndex} className="flex items-start justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{feature.name}</h4>
                    {getStatusBadge(feature.status)}
                  </div>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center mt-8">
        <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30">
          <span className="text-purple-300 mr-2">✨</span>
          <span className="text-white font-semibold">More features coming soon!</span>
        </div>
      </div>
    </div>
  );
};

export default FeaturesList;
