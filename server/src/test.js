const svc = require('./src/services/storyProtocol.service.js');

(async () => {
  try {
    const ipId = '0xB1D831271A68Db5c18c8F0B69327446f7C8D0A42';
    const res = await svc.getAndAggregateRoyaltyEventsFromApi(ipId);
    console.log('Aggregated tokens:', Array.from(res.totalRoyaltiesByToken.entries()).map(([k,v]) => [k, v.total.toString()]));
    console.log('Licensees count:', res.licenseeMap.size);
  } catch (e) {
    console.error('DEBUG ERROR', e);
  }
})();
