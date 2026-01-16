# 🎨 Frontend Deploy (Render.com) - Bosqichma-bosqich

## 1️⃣ Render.com'ga Kirish

1. https://render.com ga o'ting (allaqachon kirgansiz)
2. Dashboard'ga o'ting

---

## 2️⃣ Yangi Web Service Yaratish

1. **"New +"** tugmasini bosing
2. **"Web Service"** ni tanlang
3. Repository: **"Javohir-ac/export"** (allaqachon ulangan)
4. **"Connect"** tugmasini bosing

---

## 3️⃣ Service Sozlamalari

### Name:
```
exportfrontend
```
(yoki istalgan nom)

### Region:
```
Oregon (US West)
```
(Backend bilan bir xil region!)

### Branch:
```
master
```

### Root Directory:
```
client
```
**⚠️ MUHIM:** `client` papkasini ko'rsating!

### Environment:
```
Node
```

### Build Command:
```
npm install && npm run build
```

### Start Command:
```
npm start
```

---

## 4️⃣ Environment Variables

**"Advanced"** bo'limini oching va quyidagi variables'larni qo'shing:

### 1. NEXT_PUBLIC_API_URL
```
Key: NEXT_PUBLIC_API_URL
Value: https://export-backend-vp43.onrender.com
```
**⚠️ MUHIM:** Backend URL'ingizni kiriting!

### 2. NODE_VERSION (ixtiyoriy)
```
Key: NODE_VERSION
Value: 20
```

**❌ NODE_ENV qo'shmang!** (Render avtomatik `production` qo'yadi)

---

## 5️⃣ Deploy Qilish

1. Barcha sozlamalarni tekshiring
2. **"Create Web Service"** tugmasini bosing
3. Deploy jarayoni boshlanadi (5-10 daqiqa)

### Deploy Logs:
```
==> Cloning from https://github.com/Javohir-ac/export...
==> Checking out commit 8d40a17...
==> Running build command 'npm install && npm run build'...
==> Installing dependencies...
==> Building Next.js...
==> Build successful!
==> Starting service with 'npm start'...
✓ Ready in 2s
```

---

## 6️⃣ Frontend URL

Deploy muvaffaqiyatli bo'lgandan keyin:

```
https://exportfrontend.onrender.com
```

Bu URL orqali tizimga kirasiz!

---

## 7️⃣ Backend'ni Yangilash

Frontend URL'ni olgandan keyin, backend'ga qaytib:

1. Backend Service → **Environment** tab
2. `CLIENT_URL` variable qo'shing yoki yangilang:
```
CLIENT_URL=https://exportfrontend.onrender.com
```
3. **Save Changes**
4. **Manual Deploy** tugmasini bosing

---

## 8️⃣ Test Qilish

1. Frontend URL'ga o'ting: `https://exportfrontend.onrender.com`
2. **"Birinchi admin yaratish"** tugmasini bosing
3. Username va parol kiriting (masalan: `admin` / `admin123`)
4. Login qiling
5. Barcha funksiyalarni sinab ko'ring:
   - Vagon qo'shish
   - Mijoz qo'shish
   - Sotuv qilish
   - Xarajat qo'shish
   - Kassa ko'rish

---

## 🔧 Muammolarni Hal Qilish

### Build Failed - TypeScript Error
**Xatolik:** `Cannot find module 'typescript'`

**Yechim:**
- TypeScript allaqachon dependencies'ga qo'shilgan (commit 8d40a17)
- Agar yana xatolik chiqsa, `NODE_ENV` environment variable'ni o'chiring

### Build Failed - Memory Error
**Xatolik:** `JavaScript heap out of memory`

**Yechim:**
- Free tier'da 512 MB RAM bor
- Starter plan ($7/month) ga o'ting

### API Connection Error
**Xatolik:** `Failed to fetch` yoki `Network Error`

**Yechim:**
1. `NEXT_PUBLIC_API_URL` to'g'riligini tekshiring
2. Backend ishlayotganligini tekshiring
3. Backend'da `CLIENT_URL` qo'shilganligini tekshiring

### CORS Error
**Xatolik:** `Access-Control-Allow-Origin`

**Yechim:**
1. Backend'da `CLIENT_URL` environment variable qo'shing
2. Frontend URL'ni to'g'ri kiriting
3. Backend'ni redeploy qiling

---

## 💰 Render.com Narxlar

### Free Tier:
- ✅ 750 soat/oy (1 service uchun)
- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ❌ 15 daqiqadan keyin uxlaydi (inactivity)
- ❌ Cold start (30-60 soniya)

### Starter ($7/month):
- ✅ Unlimited hours
- ✅ 512 MB RAM
- ✅ 0.5 CPU
- ✅ Uxlamaydi
- ✅ Tezroq

---

## 🎉 Tayyor!

**Backend:** https://export-backend-vp43.onrender.com  
**Frontend:** https://exportfrontend.onrender.com

Ikkala service ham Render'da!

---

## 📊 Monitoring

### Logs Ko'rish:
1. Service sahifasida **"Logs"** tab
2. Real-time logs ko'rinadi

### Metrics:
- CPU Usage
- Memory Usage
- Request Count
- Response Time

---

## 🔄 Yangilash

### Avtomatik:
- GitHub'ga push qilsangiz avtomatik deploy bo'ladi

### Manual:
1. Service sahifasida **"Manual Deploy"**
2. **"Deploy latest commit"** tugmasini bosing

---

## ✅ Keyingi Qadamlar

1. ✅ Custom domain qo'shish (ixtiyoriy)
2. ✅ SSL sertifikat (avtomatik)
3. ✅ Monitoring va alerts
4. ✅ Backup strategiyasi
