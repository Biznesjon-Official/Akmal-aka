# 🔧 Backend Deployment (Render.com)

## Service Settings

### Basic:
- **Name**: `wood-export-backend`
- **Region**: `Frankfurt (EU Central)`
- **Branch**: `master`
- **Root Directory**: `server`
- **Runtime**: `Node`

### Build & Deploy:

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
node index.js
```

### Environment Variables:
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://javohir111_db_user:K6gPXt0qZMGDK802@umumuy.rygkhns.mongodb.net/?appName=Umumuy
JWT_SECRET=wood_import_export_secret_key_2024_production_secure
CLIENT_URL=https://wood-export-frontend.onrender.com
```

**⚠️ MUHIM:** 
- Render avtomatik `PORT=10000` beradi
- `CLIENT_URL` ni frontend URL'ingiz bilan almashtiring

### Health Check:
```
/api/auth/check-admin
```

---

## Backend URL:
```
https://wood-export-backend.onrender.com
```

Bu URL'ni frontend'da ishlatamiz!
