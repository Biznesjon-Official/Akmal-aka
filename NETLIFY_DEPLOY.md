# 🚀 Frontend Deploy (Netlify)

## Netlify uchun Tayyorgarlik

### 1️⃣ netlify.toml Fayl Yaratish

Client papkasida `netlify.toml` fayl yaratiladi (avtomatik).

---

## 2️⃣ Netlify.com'da Deploy Qilish

### Netlify'ga Kirish:
1. https://netlify.com ga o'ting
2. **"Sign Up"** yoki **"Log In"** (GitHub bilan)
3. GitHub account'ingizni ulang

### Yangi Site Yaratish:
1. **"Add new site"** → **"Import an existing project"**
2. **"Deploy with GitHub"** ni tanlang
3. Repository'ni toping: **"Javohir-ac/export"**
4. **"Select"** tugmasini bosing

---

## 3️⃣ Build Settings

### Site Settings:

**Base directory:**
```
client
```

**Build command:**
```
npm run build
```

**Publish directory:**
```
client/.next
```

**⚠️ MUHIM:** Netlify avtomatik Next.js'ni detect qiladi va to'g'ri sozlaydi!

---

## 4️⃣ Environment Variables

**"Site settings"** → **"Environment variables"** → **"Add a variable"**

### 1. NODE_ENV
```
Key: NODE_ENV
Value: production
```

### 2. NEXT_PUBLIC_API_URL
```
Key: NEXT_PUBLIC_API_URL
Value: https://export-backend-vp43.onrender.com
```

**⚠️ MUHIM:** Backend URL'ingizni kiriting!

---

## 5️⃣ Deploy Qilish

1. **"Deploy site"** tugmasini bosing
2. Deploy jarayoni boshlanadi (3-5 daqiqa)
3. Logs'ni kuzatib boring

### Deploy Logs:
```
Building site...
Installing dependencies...
Running build command...
Build successful!
Deploying to Netlify...
Site is live!
```

---

## 6️⃣ Frontend URL

Deploy muvaffaqiyatli bo'lgandan keyin:

```
https://random-name-123.netlify.app
```

Yoki custom domain:
```
https://wood-export.netlify.app
```

---

## 7️⃣ Backend'ni Yangilash

Frontend URL'ni olgandan keyin, backend'ga qaytib:

1. Render.com → Backend Service → **Environment** tab
2. **Add Environment Variable**:
```
CLIENT_URL=https://your-frontend-url.netlify.app
```
3. **Save Changes** va **Manual Deploy**

---

## 8️⃣ Test Qilish

1. Frontend URL'ga o'ting
2. **"Birinchi admin yaratish"** tugmasini bosing
3. Username va parol kiriting
4. Login qiling
5. Barcha funksiyalarni sinab ko'ring

---

## 🔧 Muammolarni Hal Qilish

### Build Failed
**Xatolik:** `npm ERR! code ELIFECYCLE`

**Yechim:**
- `Base directory` to'g'ri (`client`) ekanligini tekshiring
- `Build command` to'g'ri (`npm run build`) ekanligini tekshiring

### API Connection Error
**Xatolik:** `Failed to fetch`

**Yechim:**
1. `NEXT_PUBLIC_API_URL` to'g'riligini tekshiring
2. Backend'da `CLIENT_URL` qo'shilganligini tekshiring
3. Backend ishlayotganligini tekshiring

### CORS Error
**Xatolik:** `Access-Control-Allow-Origin`

**Yechim:**
1. Backend'da `CLIENT_URL` environment variable qo'shing
2. Frontend URL'ni to'g'ri kiriting
3. Backend'ni redeploy qiling

---

## 💰 Netlify Narxlar

### Free Tier:
- ✅ 100 GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Unlimited sites
- ✅ HTTPS
- ✅ Custom domain
- ✅ Instant rollbacks

### Pro ($19/month):
- ✅ 400 GB bandwidth
- ✅ 1000 build minutes
- ✅ Priority support

---

## 🎉 Tayyor!

Frontend Netlify'da, Backend Render'da!

**Frontend:** https://your-site.netlify.app  
**Backend:** https://export-backend-vp43.onrender.com

---

## 📝 Keyingi Qadamlar

1. ✅ Custom domain qo'shish (ixtiyoriy)
2. ✅ SSL sertifikat (avtomatik)
3. ✅ Continuous deployment (avtomatik)
4. ✅ Monitoring va analytics
