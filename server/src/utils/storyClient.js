const { StoryClient } = require("@story-protocol/core-sdk");
const { http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { mainnet } = require("viem/chains"); // Impor chain object

// Validasi environment variables
if (!process.env.RPC_PROVIDER_URL) {
  console.error("FATAL: RPC_PROVIDER_URL is not set in the .env file.");
}

// Gunakan private key jika ada, jika tidak, klien akan bersifat read-only
let account;
if (process.env.WALLET_PRIVATE_KEY) {
    try {
        const rawPrivateKey = process.env.WALLET_PRIVATE_KEY.startsWith('0x') 
            ? process.env.WALLET_PRIVATE_KEY 
            : `0x${process.env.WALLET_PRIVATE_KEY}`;
        account = privateKeyToAccount(rawPrivateKey);
    } catch (e) {
        console.error("ERROR: Failed to create account from WALLET_PRIVATE_KEY. Check format. Client will be read-only.");
        account = undefined;
    }
} else {
    console.warn("Warning: WALLET_PRIVATE_KEY is not set. The client will operate in read-only mode.");
    account = undefined;
}

// Konfigurasi untuk Story Protocol
const config = {
  account: account,
  transport: http(process.env.RPC_PROVIDER_URL),
  // Biarkan Viem yang menentukan chain dari RPC, tapi kita bisa berikan chain object sebagai petunjuk
  chain: mainnet, 
};

// Buat klien
const client = StoryClient.newClient(config);

if (!client) {
    console.error("FATAL: Story SDK client could not be initialized. Check your RPC_PROVIDER_URL.");
}

module.exports = { client, account };