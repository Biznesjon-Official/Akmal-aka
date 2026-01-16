# 🎨 Frontend Deployment (Render.com)

## Service Settings

### Basic:
- **Name**: `wood-export-frontend`
- **Region**: `Frankfurt (EU Central)` (backend bilan bir xil!)
- **Branch**: `master`
- **Root Directory**: `client`
- **Runtime**: `Node`

### Build & Deploy:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

### Environment Variables:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://wood-export-backend.onrender.com
```

**⚠️ MUHIM:** 
- `NEXT_PUBLIC_API_URL` ni backend URL'ingiz bilan almashtiring
- Backend'ni avval deploy qiling, keyin frontend'ni!

---

## Frontend URL:
```
https://wood-export-frontend.onrender.com
```

Bu URL orqali tizimga kirasiz!

---

## ✅ Deploy Tartibi:

1. **Birinchi Backend'ni deploy qiling**
   - Backend URL'ni oling (masalan: `https://wood-export-backend.onrender.com`)

2. **Keyin Frontend'ni deploy qiling**
   - Environment variables'da backend URL'ni kiriting
   - Deploy qiling

3. **Backend'ni yangilang**
   - `CLIENT_URL` ga frontend URL'ni kiriting
   - Redeploy qiling

4. **Test qiling**
   - Frontend URL'ga kiring
   - Login qiling
   - Barcha funksiyalarni sinab ko'ring
