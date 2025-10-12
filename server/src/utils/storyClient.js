const { StoryClient } = require("@story-protocol/core-sdk");
const { http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

// Validasi environment variables
if (!process.env.WALLET_PRIVATE_KEY || !process.env.RPC_PROVIDER_URL) {
  console.error("FATAL: WALLET_PRIVATE_KEY or RPC_PROVIDER_URL is not set in the .env file.");
  // Di aplikasi produksi, Anda mungkin ingin keluar dari proses di sini
  // process.exit(1); 
}

// Buat akun dari private key hanya jika ada
const account = process.env.WALLET_PRIVATE_KEY 
  ? privateKeyToAccount(process.env.WALLET_PRIVATE_KEY)
  : undefined;

// Konfigurasi untuk Story Protocol
const config = {
  account: account,
  transport: http(process.env.RPC_PROVIDER_URL),
};

const client = account ? StoryClient.newClient(config) : null;

if (!client) {
    console.warn("Warning: Story SDK client could not be initialized. WALLET_PRIVATE_KEY might be missing. Dispute functionality will be disabled.");
}

module.exports = { client };