const axios = require('axios');
const { formatUnits, createPublicClient, http } = require("viem");
const { mainnet } = require("viem/chains");

const STORY_ASSETS_API_BASE_URL = 'https://api.storyapis.com/api/v4/assets';
const STORY_TRANSACTIONS_API_BASE_URL = 'https://api.storyapis.com/api/v4/transactions';
const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;
const rpcProviderUrl = process.env.RPC_PROVIDER_URL;

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(rpcProviderUrl),
});

const storyApi = axios.create({
    headers: { 'X-Api-Key': storyApiKey, 'Content-Type': 'application/json' },
    timeout: 45000
});

const formatTokenValue = (value, decimals) => {
    try {
        return parseFloat(formatUnits(BigInt(value), parseInt(decimals, 10))).toFixed(4);
    } catch (e) {
        return '0.0000';
    }
};

/**
 * Mengambil aset IP. PENTING: TIDAK menggunakan toLowerCase() untuk endpoint ini.
 */
const getAssetsByOwner = async (ownerAddress, limit = 20, offset = 0, tokenContract) => {
    const whereClause = {};
    // JANGAN GUNAKAN toLowerCase() DI SINI, SESUAI LOGIKA KODE LAMA YANG BERHASIL
    if (ownerAddress) whereClause.ownerAddress = ownerAddress.trim();
    if (tokenContract) whereClause.tokenContract = tokenContract.trim();

    if (Object.keys(whereClause).length === 0) {
        return { data: [], pagination: { total: 0 } };
    }

    const requestBody = {
        includeLicenses: true,
        moderated: false,
        orderBy: "blockNumber",
        orderDirection: "desc",
        pagination: { limit, offset },
        where: whereClause
    };

    try {
        console.log('[DEBUG] Mengirim Permintaan Aset (tanpa lowercase):', JSON.stringify(requestBody, null, 2));
        const response = await storyApi.post(STORY_ASSETS_API_BASE_URL, requestBody);
        return { data: response.data.data, pagination: response.data.pagination };
    } catch (error) {
        console.error(`[SERVICE_ERROR] Gagal saat mengambil aset:`, error.message);
        throw error;
    }
};

/**
 * Fungsi pembantu untuk mengambil event dari endpoint /transactions.
 * PENTING: Fungsi ini memastikan semua ipId adalah lowercase.
 */
const getEventsFromTransactionsApi = async (ipIds, eventTypes, limit = 500) => {
    // Pastikan semua ipId adalah lowercase sebelum dikirim ke endpoint ini
    const lowercasedIpIds = ipIds.map(id => id.toLowerCase());
    
    const response = await storyApi.post(STORY_TRANSACTIONS_API_BASE_URL, {
        where: { eventTypes, ipIds: lowercasedIpIds },
        pagination: { limit, offset: 0 },
        orderBy: "blockNumber",
        orderDirection: "desc"
    });
    return response.data.data || [];
};

/**
 * Fungsi statistik yang menggunakan logika yang benar untuk setiap endpoint.
 */
const getPortfolioStats = async (ownerAddress) => {
    let assetResponse = await getAssetsByOwner(ownerAddress, 500, 0);
    if (!assetResponse.data || assetResponse.data.length === 0) {
        assetResponse = await getAssetsByOwner(null, 500, 0, ownerAddress);
    }
    const allAssets = assetResponse.data || [];
    const totalAssets = assetResponse.pagination?.total || 0;
    if (allAssets.length === 0) {
        return { totalAssets, totalRoyalties: '0.00 ETH', overallDisputeStatus: 'None' };
    }

    // Ambil semua ipId dari aset yang ditemukan
    const ipIds = allAssets.map(asset => asset.ipId);

    // Panggil fungsi pembantu yang sudah menjamin lowercase untuk /transactions
    const [royaltyEvents, disputeEvents] = await Promise.all([
        getEventsFromTransactionsApi(ipIds, ["RoyaltyPaid"], 1000),
        getEventsFromTransactionsApi(ipIds, ["DisputeRaised"], 1)
    ]);

    // Proses hasil royalti
    const globalTotalByToken = {};
    for (const event of royaltyEvents) {
        if (event.royaltyTokens && event.royaltyTokens.length > 0) {
            const token = event.royaltyTokens[0];
            const symbol = token.symbol || 'ETH';
            if (!globalTotalByToken[symbol]) {
                globalTotalByToken[symbol] = { total: 0n, decimals: token.decimals || 18 };
            }
            globalTotalByToken[symbol].total += BigInt(token.amount);
        }
    }
    const formattedRoyalties = Object.entries(globalTotalByToken)
        .map(([symbol, data]) => `${formatTokenValue(data.total, data.decimals)} ${symbol}`)
        .join(' + ');
    const totalRoyalties = formattedRoyalties || '0.00 ETH';

    // Proses hasil sengketa
    const overallDisputeStatus = disputeEvents.length > 0 ? 'Active' : 'None';

    return { totalAssets, totalRoyalties, overallDisputeStatus };
};


// --- Fungsi Lainnya untuk halaman detail (pastikan menggunakan lowercase jika memanggil /transactions) ---
const getRoyaltyTransactions = async (ipId) => {
    const events = await getEventsFromTransactionsApi([ipId], ["RoyaltyPaid"]);
    const transactions = [];
    for (const event of events) {
         let txDetail = { from: 'N/A', value: '0', symbol: 'ETH', decimals: 18 };
         if (event.royaltyTokens && event.royaltyTokens.length > 0) {
            const token = event.royaltyTokens[0];
            txDetail = { ...txDetail, from: token.sender, value: token.amount, symbol: token.symbol || 'ETH', decimals: token.decimals || 18 };
         }
         transactions.push({
            txHash: event.transactionHash, from: txDetail.from,
            value: `${formatTokenValue(BigInt(txDetail.value), txDetail.decimals)} ${txDetail.symbol}`,
            timestamp: new Date(event.timestamp).toLocaleString('en-US')
        });
    }
    return transactions;
};

const getAssetDetails = async (ipId) => {
    // Saat mengambil detail, kita tidak tahu apakah itu owner atau contract, jadi coba keduanya
    let response = await getAssetsByOwner(null, 1, 0, null, [ipId]);
     if (!response.data || response.data.length === 0) {
        // Coba lagi dengan asumsi ipId bisa jadi case-sensitive di endpoint assets
        response = await getAssetsByOwner(null, 1, 0, null, [ipId.toLowerCase()]);
    }
    if (!response.data || response.data.length === 0) return null;
    return response.data[0];
};

const getTopLicensees = async (ipId) => {
    const events = await getEventsFromTransactionsApi([ipId], ["RoyaltyPaid"]);
    const licenseeMap = new Map();
    for (const event of events) {
        if (event.royaltyTokens && event.royaltyTokens.length > 0) {
            const token = event.royaltyTokens[0];
            const licenseeData = licenseeMap.get(token.sender) || { address: token.sender, count: 0, totalByToken: {} };
            const symbol = token.symbol || 'ETH';
            if(!licenseeData.totalByToken[symbol]) licenseeData.totalByToken[symbol] = 0n;
            licenseeData.totalByToken[symbol] += BigInt(token.amount);
            licenseeData.count++;
            licenseeMap.set(token.sender, licenseeData);
        }
    }
    const licensees = Array.from(licenseeMap.values()).map(lic => ({
        address: lic.address,
        count: lic.count,
        totalValue: Object.entries(lic.totalByToken).map(([s, t]) => `${formatTokenValue(t, 18)} ${s}`).join(' + ')
    }));
    licensees.sort((a, b) => b.count - a.count);
    return licensees.slice(0, 3);
};

module.exports = {
    getAssetsByOwner,
    getPortfolioStats,
    getRoyaltyTransactions,
    getAssetDetails,
    getTopLicensees
};