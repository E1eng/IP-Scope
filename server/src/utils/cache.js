const cache = new Map();
const TTL = 5 * 60 * 1000; // Cache data selama 5 menit

/**
 * Mengambil data dari cache jika ada dan belum kedaluwarsa.
 */
const get = (key) => {
    const record = cache.get(key);
    if (!record) return null;

    const isExpired = Date.now() - record.timestamp > TTL;
    if (isExpired) {
        cache.delete(key);
        return null;
    }

    // Mengembalikan salinan data untuk mencegah mutasi yang tidak disengaja
    return JSON.parse(JSON.stringify(record.value));
};

/**
 * Menyimpan data ke dalam cache.
 */
const set = (key, value) => {
    const record = {
        value: value,
        timestamp: Date.now(),
    };
    cache.set(key, record);
};

module.exports = { get, set };