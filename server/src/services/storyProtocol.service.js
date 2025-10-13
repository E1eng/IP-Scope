const axios = require('axios');

const STORY_API_BASE_URL = 'https://api.storyapis.com/api/v4/assets';
const storyApiKey = process.env.STORY_PROTOCOL_API_KEY;

const getAssetsByOwner = async (ownerAddress) => {
  if (!ownerAddress) {
    console.log("[SERVICE] ownerAddress tidak diberikan.");
    return [];
  }

  // Validasi sederhana untuk format alamat Ethereum
  if (!/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
      console.error(`[SERVICE_ERROR] Format alamat tidak valid: ${ownerAddress}`);
      throw new Error('Format alamat Ethereum tidak valid.');
  }

  console.log(`[SERVICE] Memulai pencarian aset untuk pemilik: ${ownerAddress}`);

  // Siapkan body request sesuai dokumentasi
  const requestBody = {
    where: {
      owner: ownerAddress.toLowerCase()
    },
    pagination: {
      limit: 200
    }
  };

  // Siapkan options untuk Axios
  const options = {
    method: 'POST',
    url: STORY_API_BASE_URL,
    headers: {
      'X-Api-Key': storyApiKey,
      'Content-Type': 'application/json',
    },
    data: requestBody // Axios menggunakan 'data' untuk body
  };

  try {
    // Lakukan request menggunakan Axios dengan object options
    const response = await axios(options);

    const assets = response.data.data || [];
    console.log(`[SERVICE] Berhasil menemukan ${assets.length} aset.`);
    return assets;

  } catch (error) {
    console.error("[SERVICE_ERROR] Gagal mengambil data dari Story Protocol API.");
    if (error.response) {
      // Error yang datang dari server API (mis. 401, 403, 422)
      console.error("Status Error:", error.response.status);
      console.error("Data Error:", JSON.stringify(error.response.data, null, 2));
      throw new Error(`API Error: ${error.response.data.message || 'Gagal mengambil data'}`);
    } else if (error.request) {
      // Request dibuat tapi tidak ada respons
      console.error("Error Request:", error.request);
      throw new Error('Tidak ada respons dari Story Protocol API.');
    } else {
      // Error lain saat setup request
      console.error("Error Message:", error.message);
      throw new Error('Terjadi kesalahan saat membuat permintaan.');
    }
  }
};

module.exports = {
  getAssetsByOwner,
};