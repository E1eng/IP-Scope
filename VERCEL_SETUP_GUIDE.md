# 🚀 Panduan Setup Vercel untuk IPScope

## ⚠️ IMPORTANT: Environment Variables

### **Backend (Server) - Vercel Dashboard**

Buka project server di Vercel Dashboard → Settings → Environment Variables:

```
STORY_PROTOCOL_API_KEY=your_story_api_key_here
STORYSCAN_API_KEY=your_storyscan_api_key_1
STORYSCAN_API_KEY_2=your_storyscan_api_key_2
STORYSCAN_API_KEY_3=your_storyscan_api_key_3
STORYSCAN_API_KEY_4=your_storyscan_api_key_4
STORYSCAN_API_KEY_5=your_storyscan_api_key_5
STORYSCAN_API_KEY_6=your_storyscan_api_key_6
STORYSCAN_API_KEY_7=your_storyscan_api_key_7
STORYSCAN_API_KEY_8=your_storyscan_api_key_8
STORYSCAN_API_KEY_9=your_storyscan_api_key_9
PORT=3001
NODE_ENV=production
```

### **Frontend (Client) - Vercel Dashboard**

Buka project client di Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_URL=https://ip-scope-server-nine.vercel.app
```

**⚠️ CRITICAL**: 
- **JANGAN** tambahkan trailing slash `/` di akhir!
- **JANGAN** tambahkan `/api` di akhir!
- ✅ Correct: `https://ip-scope-server-nine.vercel.app`
- ❌ Wrong: `https://ip-scope-server-nine.vercel.app/`
- ❌ Wrong: `https://ip-scope-server-nine.vercel.app/api`

Utility function di `client/src/utils/api.js` akan otomatis:
- Remove trailing slashes
- Add `/api` prefix
- Build correct URL: `https://ip-scope-server-nine.vercel.app/api/assets?...`

## 🔍 Debugging

Setelah deployment, buka browser console di frontend. Kamu akan melihat:

```
[API] Environment URL: https://ip-scope-server-nine.vercel.app → Normalized: https://ip-scope-server-nine.vercel.app/api
```

Jika kamu melihat:
```
[API] Using default URL: http://localhost:3001/api
```

Berarti `VITE_API_URL` belum di-set di Vercel Dashboard!

## ✅ Verifikasi Deployment

### 1. Test Backend Health
```bash
curl https://ip-scope-server-nine.vercel.app/
```

Expected response:
```json
{
  "message": "IPScope API Server",
  "status": "running",
  "timestamp": "2024-..."
}
```

### 2. Test API Endpoint
```bash
curl "https://ip-scope-server-nine.vercel.app/api/assets?ownerAddress=0xEf3af03c73fB4165878E70a95A8c74D9FC3BFeae&limit=10"
```

Expected response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

### 3. Test Frontend
1. Buka frontend URL di browser
2. Buka Developer Console (F12)
3. Cari log `[API] Environment URL:`
4. Coba search dengan wallet address
5. Check Network tab untuk request/response

## 🐛 Troubleshooting

### Error: `//assets` (double slash)
- **Cause**: Environment variable `VITE_API_URL` ends with `/`
- **Fix**: Remove trailing slash from `VITE_API_URL` in Vercel Dashboard
- **Redeploy**: Klik "Redeploy" di Vercel Dashboard

### Error: CORS
- **Cause**: Server CORS configuration
- **Fix**: Already fixed in `server/api/index.js` with `origin: '*'`
- **Redeploy**: Server should auto-redeploy from GitHub

### Error: 401 Unauthorized
- **Cause**: Missing API keys in server environment variables
- **Fix**: Add all `STORY_PROTOCOL_API_KEY` and `STORYSCAN_API_KEY_*` to Vercel Dashboard

### Error: Failed to fetch
- **Cause**: Either CORS or wrong API URL
- **Fix**: 
  1. Check console log for `[API] Environment URL:`
  2. Verify `VITE_API_URL` in Vercel Dashboard
  3. Test backend endpoint directly with curl
  4. Redeploy if needed

## 📝 Deployment Checklist

Backend:
- [ ] Deployed to Vercel
- [ ] All environment variables set (API keys)
- [ ] Health endpoint working (`/`)
- [ ] API endpoint working (`/api/assets`)

Frontend:
- [ ] Deployed to Vercel
- [ ] `VITE_API_URL` set correctly (no trailing slash)
- [ ] Console shows correct normalized URL
- [ ] Search functionality working
- [ ] No CORS errors

## 🔄 Redeploy After Env Variable Changes

**IMPORTANT**: Setiap kali kamu mengubah environment variables di Vercel Dashboard:

1. Go to Vercel Dashboard
2. Click on your project (server or client)
3. Go to "Deployments" tab
4. Click "..." menu on the latest deployment
5. Click "Redeploy"

Environment variables **TIDAK** otomatis apply ke deployment yang sudah ada!

---

**Need help?** Check browser console logs and Vercel deployment logs.

