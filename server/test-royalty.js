const axios = require('axios');

async function testRoyalty() {
    try {
        console.log('=== TESTING ROYALTY CALCULATION ===');
        
        // Test individual asset
        const response = await axios.get('http://localhost:3001/api/assets/0xB1D831271A68Db5c18c8F0B69327446f7C8D0A42');
        const data = response.data;
        
        console.log('Individual Asset Result:');
        console.log('- Total Royalty:', data.totalRoyaltyCollected);
        console.log('- Analytics:', JSON.stringify(data.analytics, null, 2));
        
        // Test search results
        const searchResponse = await axios.get('http://localhost:3001/api/assets?ownerAddress=0xF3d5525713488668D9406b5ea3C052DcF3FfE3fB&limit=3');
        const searchData = searchResponse.data;
        
        console.log('\nSearch Results:');
        searchData.data.forEach((asset, index) => {
            console.log(`- Asset ${index + 1}: ${asset.ipId} - ${asset.totalRoyaltyCollected}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testRoyalty();

