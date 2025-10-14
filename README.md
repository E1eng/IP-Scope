# RoyaltyFlow Dashboard - Dasbor Manajemen Royalti

**RoyaltyFlow** adalah aplikasi web dasbor analitik yang dirancang untuk para kreator di Story Protocol. Aplikasi ini memungkinkan pengguna untuk melacak aset kekayaan intelektual (IP) mereka, memantau pembayaran royalti yang terkumpul, dan mendapatkan wawasan mendalam tentang siapa saja yang menggunakan dan membayar lisensi karya mereka di blockchain.

## ✨ Fitur Utama

- **Pencarian Aset Fleksibel**: Cari dan tampilkan semua aset IP yang dimiliki oleh alamat wallet kreator atau yang terkait dengan alamat token kontrak tertentu.
- **Dasbor Statistik Agregat**: Dapatkan gambaran umum portofolio Anda dengan statistik kunci:
    - **Total Aset IP**: Jumlah total aset yang ditemukan.
    - **Total Royalti Terkumpul**: Agregasi nilai semua pembayaran royalti yang diterima di seluruh aset.
    - **Status Sengketa**: Status sengketa (dispute) keseluruhan di portofolio Anda.
- **Tabel Portofolio Interaktif**: Lihat semua aset Anda dalam tabel yang mudah dinavigasi, lengkap dengan pratinjau, tanggal pembuatan, dan status sengketa.
- **Detail Aset Mendalam**: Klik pada aset mana pun untuk membuka tampilan modal mendetail yang berisi:
    - **Buku Besar Royalti (Royalty Ledger)**: Riwayat lengkap setiap transaksi pembayaran royalti untuk aset tersebut, termasuk jumlah, pengirim, dan tautan ke explorer.
    - **Lisensi Teratas (Top Licensees)**: Peringkat 3 teratas pengguna lisensi berdasarkan jumlah total pembayaran.
    - **Detail Lisensi & Analitik**: Informasi tentang persyaratan lisensi (PIL Terms) dan kebijakan royalti.

## 🛠️ Tumpukan Teknologi

- **Frontend**:
    - [React](https://reactjs.org/) (dengan Vite)
    - [Tailwind CSS](https://tailwindcss.com/) untuk styling
    - [Axios](https://axios-http.com/) untuk permintaan HTTP
    - [React Router](https://reactrouter.com/) untuk navigasi
- **Backend**:
    - [Node.js](https://nodejs.org/)
    - [Express.js](https://expressjs.com/) sebagai kerangka kerja server
    - [Axios](https://axios-http.com/) untuk berkomunikasi dengan API eksternal
- **API Eksternal**:
    - **Story Protocol API v4**: Untuk mengambil data aset dan log event transaksi.
    - **StoryScan API v2**: Untuk mengambil detail finansial dari setiap transaksi.

## 🚀 Instalasi & Menjalankan Proyek

Proyek ini terdiri dari dua bagian: `server` (backend) dan `client` (frontend). Keduanya harus dijalankan secara bersamaan.

### Prasyarat

- [Node.js](https://nodejs.org/en/download/) (versi 18.x atau lebih tinggi direkomendasikan)
- `npm` atau `yarn`

---

### 1. Pengaturan Backend (`/server`)

a. **Navigasi ke direktori server:**
   ```bash
   cd server
b. Instal dependensi:

Bash

npm install
c. Buat file environment .env:
Salin file .env.example menjadi file baru bernama .env.

Bash

cp .env.example .env
d. Konfigurasi variabel environment:
Buka file .env dan isi variabel yang diperlukan:

Cuplikan kode

# Port untuk server backend (default: 3001)
PORT=3001

# Ganti dengan API Key Anda dari dasbor developer Story Protocol
# Pastikan kunci ini memiliki izin untuk membaca data Assets dan Transactions
STORY_PROTOCOL_API_KEY="YOUR_STORY_PROTOCOL_API_KEY_HERE"

# RPC URL untuk jaringan yang ingin Anda gunakan (contoh untuk Mainnet)
RPC_PROVIDER_URL="[https://mainnet.storyrpc.io](https://mainnet.storyrpc.io)"

# Variabel ini tidak lagi digunakan secara aktif tetapi tetap ada di validasi
# Anda bisa mengisinya dengan nilai acak atau kunci StoryScan jika ada
STORYSCAN_API_KEY="any_value_here"
e. Jalankan server backend:

Bash

npm run dev
Server sekarang akan berjalan di http://localhost:3001.

2. Pengaturan Frontend (/client)
a. Buka terminal baru dan navigasi ke direktori client:

Bash

cd client
b. Instal dependensi:

Bash

npm install
c. Buat file environment .env:
Salin file .env.example menjadi file baru bernama .env.

Bash

cp .env.example .env
File ini biasanya sudah terkonfigurasi dengan benar untuk pengembangan lokal.

d. Jalankan server frontend:

Bash

npm run dev
Aplikasi React akan berjalan, biasanya di http://localhost:5173.

3. Akses Aplikasi
Buka browser Anda dan navigasikan ke URL yang diberikan oleh server frontend (misalnya http://localhost:5173). Anda sekarang dapat mulai menggunakan dasbor dengan menempelkan alamat wallet atau kontrak ke dalam kolom pencarian.

🏗️ Cara Kerja Arsitektur
Input Pengguna: Pengguna memasukkan alamat wallet atau token kontrak di antarmuka React.

Permintaan ke Backend: Frontend mengirimkan permintaan ke server Express.js lokal.

Orkestrasi Backend: Server backend bertindak sebagai perantara yang melakukan serangkaian panggilan API:
a. Mengambil Aset: Memanggil https://api.storyapis.com/api/v4/assets untuk mendapatkan daftar aset IP yang terkait dengan alamat input.
b. Mengambil Log Event Royalti: Untuk setiap aset yang ditemukan, backend memanggil https://api.storyapis.com/api/v4/transactions dengan paginasi untuk mengumpulkan semua transactionHash dari event RoyaltyPaid.
c. Mengambil Detail Finansial: Untuk setiap transactionHash, backend memanggil https://www.storyscan.io/api/v2/transactions/{txHash} untuk mendapatkan data detail seperti jumlah, simbol token, dan alamat pengirim.

