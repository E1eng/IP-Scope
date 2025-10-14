// Gunakan require untuk node-fetch versi 2
const fetch = require('node-fetch');

// ==========================================================================
// === KONFIGURASI TES: Ganti nilai di bawah ini sebelum menjalankan skrip ===
// ==========================================================================

// 1. GANTI DENGAN API KEY ANDA LANGSUNG DI SINI (untuk sementara)
const API_KEY = "MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U"; 

// 2. GANTI DENGAN ALAMAT YANG ANDA YAKIN 100% MEMILIKI ASET
const OWNER_ADDRESS = "0xb1803a6b5a3242a85ef933a2a9a81057e9545f48";

// ==========================================================================

const TARGET_URL = 'https://api.storyapis.com/api/v4/assets';

// Body permintaan, difokuskan hanya pada ownerAddress
const requestBody = {
    includeLicenses: true,
    moderated: false,
    orderBy: "blockNumber",
    orderDirection: "desc",
    pagination: { limit: 20, offset: 0 },
    where: {
        ownerAddress: OWNER_ADDRESS.toLowerCase()
    }
};

// Opsi untuk fetch, meniru contoh playground dengan sempurna
const options = {
    method: 'POST',
    headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
};

// Fungsi untuk menjalankan tes
const runTest = async () => {
    console.log("================== MEMULAI TES API TERISOLASI ==================");
    console.log(`Mencari aset untuk owner: ${OWNER_ADDRESS}`);
    console.log("------------------------------------------------------------");

    try {
        const response = await fetch(TARGET_URL, options);
        const data = await response.json();

        console.log("\nHASIL TES:\n");
        console.log("Status Respons:", response.status, response.statusText);
        console.log("\nDATA MENTAH YANG DITERIMA:\n");
        console.log(JSON.stringify(data, null, 2));
        console.log("\n------------------------------------------------------------");

        if (data.data && data.data.length > 0) {
            console.log(`\n✅ BERHASIL! Ditemukan ${data.data.length} aset (Total: ${data.pagination.total}). Masalahnya ada di konfigurasi proyek Anda.`);
        } else {
            console.log(`\n❌ GAGAL. API merespons dengan data kosong. Ini membuktikan masalahnya BUKAN pada kode proyek Anda, tetapi pada respons API itu sendiri.`);
        }

    } catch (error) {
        console.error("\n❌ TERJADI ERROR KRITIS SAAT TES:", error);
    }
    console.log("======================= TES SELESAI ========================");
};

// Jalankan tesnya
runTest();