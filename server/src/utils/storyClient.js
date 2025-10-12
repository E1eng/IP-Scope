const { StoryClient } = require("@story-protocol/core-sdk");
const { http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
// Hapus impor networks.js
// const { storyMainnet } = require("./networks"); 

// Validasi environment variables
if (!process.env.WALLET_PRIVATE_KEY || !process.env.RPC_PROVIDER_URL) {
  console.error("FATAL: WALLET_PRIVATE_KEY or RPC_PROVIDER_URL is not set in the .env file.");
}

// Memastikan Private Key memiliki format '0x' dan menangani error pembuatan akun
const rawPrivateKey = process.env.WALLET_PRIVATE_KEY?.startsWith('0x') 
    ? process.env.WALLET_PRIVATE_KEY 
    : `0x${process.env.WALLET_PRIVATE_KEY}`;

let account;
try {
    if (process.env.WALLET_PRIVATE_KEY) {
        // Viem akan otomatis memvalidasi private key di sini
        account = privateKeyToAccount(rawPrivateKey);
    } else {
        account = undefined;
    }
} catch (e) {
    console.error("ERROR: Failed to create account from WALLET_PRIVATE_KEY. Check format.");
    account = undefined; 
}


// Konfigurasi untuk Story Protocol
const config = {
  account: account,
  transport: http(process.env.RPC_PROVIDER_URL),
  // FIX: Menggunakan string identifier "mainnet" yang benar
  chainId: "mainnet", 
};

// Buat klien hanya jika akun terinisialisasi
const client = account ? StoryClient.newClient(config) : null;

if (!client) {
    console.warn("Warning: Story SDK client could not be initialized. On-chain analytics will fail. Check RPC URL and Private Key.");
}

module.exports = { client, account };