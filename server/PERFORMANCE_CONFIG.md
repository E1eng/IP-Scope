# Performance Optimization Configuration

## Environment Variables untuk Optimasi

Tambahkan variabel berikut ke file `.env` di folder `server/`:

```bash
# Enable fast mode untuk loading yang lebih cepat (RECOMMENDED)
FAST_MODE=1

# Cache TTL settings (dalam milliseconds)
AGGREGATION_CACHE_TTL_MS=600000    # 10 menit
ASSETS_CACHE_TTL_MS=300000         # 5 menit
TX_DETAIL_TTL_MS=86400000          # 24 jam
TOKEN_PRICE_TTL_MS=1800000         # 30 menit

# Rate limiting settings
STORYSCAN_RPS=10                   # StoryScan API limit
STORYAPI_RPS=300                   # Story Protocol API limit

# Debug settings
DEBUG_AGGR_LOGS=0                  # Disable debug logs untuk performance
```

## Optimasi yang Diterapkan

### 1. Fast Mode
- **Aktivasi**: Set `FAST_MODE=1` di environment
- **Efek**: Skip heavy StoryScan operations untuk loading awal
- **Benefit**: Loading 5-10x lebih cepat
- **Trade-off**: Total royalti ditampilkan sebagai "Calculating..." sampai user klik "Load Detailed Stats"

### 2. Enhanced Caching
- **Assets Cache**: 5 menit (naik dari 1 menit)
- **Aggregation Cache**: 10 menit (naik dari 5 menit)
- **Transaction Details**: 24 jam (unchanged)

### 3. Reduced API Calls
- **Timeseries**: Skip jika dalam fast mode
- **Progress Polling**: Tetap aktif untuk detailed stats
- **Dispute Polling**: Tetap aktif untuk real-time alerts

## Cara Menggunakan

1. **Restart server** setelah mengubah environment variables
2. **Load assets** akan menggunakan fast mode secara otomatis
3. **Klik "Load Detailed Stats"** untuk mendapatkan data royalti lengkap
4. **Data akan di-cache** untuk akses selanjutnya yang lebih cepat

## Monitoring Performance

- Check console logs untuk melihat cache hits/misses
- Monitor API response times
- Watch for rate limiting errors (429 status codes)
