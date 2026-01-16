# 🚀 Render.com Deployment Guide

## Render.com'da Deploy Qilish

### 1️⃣ Render.com'ga Kirish
1. https://render.com ga kiring
2. GitHub bilan login qiling
3. Dashboard'ga o'ting

### 2️⃣ Yangi Web Service Yaratish
1. **"New +"** tugmasini bosing
2. **"Web Service"** ni tanlang
3. GitHub repository'ni ulang: `Javohir-ac/export`
4. **"Connect"** tugmasini bosing

### 3️⃣ Service Sozlamalari

#### Basic Settings:
- **Name**: `wood-export-system` (yoki istalgan nom)
- **Region**: `Frankfurt (EU Central)` yoki `Singapore (Southeast Asia)`
- **Branch**: `master`
- **Root Directory**: `.` (bo'sh qoldiring)
- **Runtime**: `Node`

#### Build & Deploy Settings:

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm start
```

### 4️⃣ Environment Variables

Quyidagi environment variables'larni qo'shing:

#### Backend Variables:
```
NODE_ENV=production
PORT=5002
MONGODB_URI=mongodb+srv://javohir111_db_user:K6gPXt0qZMGDK802@umumuy.rygkhns.mongodb.net/?appName=Umumuy
JWT_SECRET=wood_import_export_secret_key_2024_production_secure
```

#### Frontend Variables:
```
NEXT_PUBLIC_API_URL=https://wood-export-system.onrender.com
```

**⚠️ MUHIM:** `NEXT_PUBLIC_API_URL` ni o'zingizning Render URL'ingiz bilan almashtiring!

### 5️⃣ Advanced Settings (Optional)

#### Auto-Deploy:
- ✅ **Auto-Deploy**: `Yes` (har commit'da avtomatik deploy)

#### Health Check Path:
```
/api/auth/check-admin
```

#### Instance Type:
- **Free**: 512 MB RAM, 0.1 CPU (test uchun)
- **Starter**: $7/month, 512 MB RAM, 0.5 CPU (production uchun)

### 6️⃣ Deploy Qilish
1. **"Create Web Service"** tugmasini bosing
2. Deploy jarayoni boshlanadi (5-10 daqiqa)
3. Logs'ni kuzatib boring

### 7️⃣ Deploy Muvaffaqiyatli Bo'lgandan Keyin

#### URL'ni Olish:
```
https://wood-export-system.onrender.com
```

#### Birinchi Admin Yaratish:
1. URL'ga kiring
2. "Birinchi admin yaratish" tugmasini bosing
3. Username va parol kiriting

---

## 🔧 Muammolarni Hal Qilish

### Build Failed
**Xatolik:** `npm ERR! code ELIFECYCLE`

**Yechim:**
1. Logs'ni o'qing
2. `package.json` fayllarni tekshiring
3. Node version'ni tekshiring (18+ kerak)

### MongoDB Connection Error
**Xatolik:** `MongoServerError: bad auth`

**Yechim:**
1. MongoDB Atlas'da IP whitelist'ga `0.0.0.0/0` qo'shing
2. `MONGODB_URI` to'g'riligini tekshiring
3. Database user'ning ruxsatlari borligini tekshiring

### CORS Error
**Xatolik:** `Access-Control-Allow-Origin`

**Yechim:**
1. `NEXT_PUBLIC_API_URL` to'g'ri sozlanganligini tekshiring
2. Backend'da CORS sozlamalari to'g'riligini tekshiring

### 404 Not Found
**Xatolik:** Frontend sahifalar ochilmayapti

**Yechim:**
1. `next.config.ts` da `output: 'standalone'` borligini tekshiring
2. Build command to'g'riligini tekshiring

---

## 📊 Monitoring

### Logs Ko'rish:
1. Render Dashboard → Service → **Logs** tab
2. Real-time logs ko'rinadi

### Metrics:
1. **CPU Usage**
2. **Memory Usage**
3. **Request Count**
4. **Response Time**

---

## 🔄 Yangilash (Update)

### Avtomatik:
- GitHub'ga push qilsangiz avtomatik deploy bo'ladi

### Manual:
1. Render Dashboard → Service
2. **"Manual Deploy"** → **"Deploy latest commit"**

---

## 💰 Narxlar

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

### Standard ($25/month):
- ✅ 2 GB RAM
- ✅ 1 CPU
- ✅ Priority support

---

## 🔐 Xavfsizlik

### Environment Variables:
- ❌ `.env` fayllarni GitHub'ga yuklang
- ✅ Render Dashboard'da sozlang

### MongoDB:
- ✅ Strong password ishlating
- ✅ IP whitelist sozlang
- ✅ Database user ruxsatlarini cheklang

### JWT Secret:
- ✅ Production uchun boshqa secret ishlating
- ✅ Kamida 32 belgili random string

---

## 📞 Yordam

### Render Support:
- https://render.com/docs
- https://community.render.com

### GitHub Issues:
- https://github.com/Javohir-ac/export/issues

---

## ✅ Checklist

Deploy qilishdan oldin:

- [ ] `.gitignore` da `.env` fayllar bor
- [ ] `package.json` fayllar to'g'ri
- [ ] MongoDB Atlas IP whitelist sozlangan
- [ ] Environment variables tayyorlangan
- [ ] Build command test qilingan
- [ ] Start command test qilingan
- [ ] GitHub repository public yoki Render'ga access berilgan

---

**🎉 Omad! Deploy muvaffaqiyatli bo'lsin!**
