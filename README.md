# IP Asset Search Engine (with Story Protocol API)

Proyek ini adalah sebuah aplikasi web full-stack untuk mencari Aset IP (Intellectual Property) menggunakan API dari Story Protocol. Aplikasi ini dibangun dengan arsitektur yang scalable dan maintainable, memisahkan backend (Node.js/Express) dan frontend (React/Vite).

## Fitur

-   Pencarian aset IP berdasarkan query teks.
-   Filter hasil pencarian berdasarkan tipe media (IMAGE, VIDEO, AUDIO, dll.).
-   Antarmuka yang bersih, modern, dan responsif.
-   Arsitektur aman dengan menyembunyikan API Key di backend.
-   Struktur proyek yang mudah dikembangkan lebih lanjut.

## Arsitektur

-   **Backend**: Node.js dengan Express.js, bertindak sebagai perantara yang aman untuk berkomunikasi dengan Story Protocol API.
-   **Frontend**: React (dibangun dengan Vite) untuk antarmuka pengguna yang dinamis.
-   **Styling**: Tailwind CSS untuk styling yang cepat dan konsisten.

## Prasyarat

-   Node.js (v18 atau lebih baru)
-   npm / yarn / pnpm
-   API Key dari Story Protocol

## Instalasi & Konfigurasi

Proyek ini terdiri dari dua bagian: `server` dan `client`. Keduanya perlu di-setup secara terpisah.

### 1. Setup Backend (`server`)

1.  **Masuk ke direktori server:**
    ```bash
    cd server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variable:**
    Buat file baru bernama `.env` di dalam direktori `server/` dengan menyalin dari `.env.example`.
    ```bash
    cp .env.example .env
    ```
    Buka file `.env` dan ganti `YOUR_STORY_PROTOCOL_API_KEY_HERE` dengan API Key Anda yang valid.
    ```
    PORT=3001
    STORY_PROTOCOL_API_KEY="ganti-dengan-api-key-asli-anda"
    ```

### 2. Setup Frontend (`client`)

1.  **Masuk ke direktori client:**
    ```bash
    cd client
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variable:**
    Buat file `.env` di direktori `client/` dengan menyalin dari `.env.example`.
    ```bash
    cp .env.example .env
    ```
    Isi file `.env` akan menunjuk ke URL backend Anda. Konfigurasi default sudah benar jika Anda menjalankan backend di port 3001.
    ```
    VITE_API_BASE_URL="http://localhost:3001/api"
    ```

## Menjalankan Proyek

Anda perlu menjalankan backend dan frontend secara bersamaan di dua terminal terpisah.

1.  **Jalankan Backend Server:**
    Buka terminal, masuk ke direktori `server/`, dan jalankan:
    ```bash
    npm run dev
    ```
    Server akan berjalan di `http://localhost:3001`.

2.  **Jalankan Frontend App:**
    Buka terminal **baru**, masuk ke direktori `client/`, dan jalankan:
    ```bash
    npm run dev
    ```
    Aplikasi React akan berjalan dan bisa diakses di `http://localhost:5173` (atau port lain yang ditampilkan di terminal).

Sekarang, buka browser Anda dan kunjungi alamat yang diberikan untuk aplikasi frontend, dan Anda siap untuk mulai mencari aset!