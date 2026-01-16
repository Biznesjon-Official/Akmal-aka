# 🚀 Backend Deploy Qilish (Bosqichma-bosqich)

## 1️⃣ Render.com'ga Kirish

1. https://render.com ga o'ting
2. **"Sign Up"** yoki **"Log In"** (GitHub bilan)
3. GitHub account'ingizni ulang

---

## 2️⃣ Yangi Web Service Yaratish

1. Dashboard'da **"New +"** tugmasini bosing
2. **"Web Service"** ni tanlang
3. GitHub repository'ni toping: **"Javohir-ac/export"**
4. **"Connect"** tugmasini bosing

---

## 3️⃣ Service Sozlamalari

### Name:
```
wood-export-backend
```
(yoki istalgan nom, lekin eslab qoling!)

### Region:
```
Frankfurt (EU Central)
```
(yoki eng yaqin region)

### Branch:
```
master
```

### Root Directory:
```
server
```
**⚠️ MUHIM:** `server` papkasini ko'rsating!

### Environment:
```
Node
```

### Build Command:
```
npm install
```

### Start Command:
```
node index.js
```

---

## 4️⃣ Environment Variables Qo'shish

**"Advanced"** bo'limini oching va quyidagi variables'larni qo'shing:

### 1. NODE_ENV
```
Key: NODE_ENV
Value: production
```

### 2. MONGODB_URI
```
Key: MONGODB_URI
Value: mongodb+srv://javohir111_db_user:K6gPXt0qZMGDK802@umumuy.rygkhns.mongodb.net/?appName=Umumuy
```

### 3. JWT_SECRET
```
Key: JWT_SECRET
Value: wood_import_export_secret_key_2024_production_secure_random_string
```
**💡 Tip:** Yangi random string yarating: https://randomkeygen.com/

### 4. CLIENT_URL (keyinroq qo'shamiz)
```
Key: CLIENT_URL
Value: (frontend deploy bo'lgandan keyin)
```
Hozircha bo'sh qoldiring yoki `https://localhost:3000` qo'ying

---

## 5️⃣ MongoDB Atlas Sozlash

### IP Whitelist:
1. MongoDB Atlas'ga kiring: https://cloud.mongodb.com
2. **Network Access** → **IP Access List**
3. **"Add IP Address"** tugmasini bosing
4. **"Allow Access from Anywhere"** ni tanlang
5. IP: `0.0.0.0/0` (barcha IP'lar)
6. **"Confirm"** tugmasini bosing

**⚠️ Xavfsizlik:** Production'da faqat Render IP'larini qo'shish yaxshiroq, lekin hozircha `0.0.0.0/0` ishlatamiz.

---

## 6️⃣ Deploy Qilish

1. Barcha sozlamalarni tekshiring
2. **"Create Web Service"** tugmasini bosing
3. Deploy jarayoni boshlanadi (5-10 daqiqa)

### Deploy Logs:
```
==> Cloning from https://github.com/Javohir-ac/export...
==> Checking out commit 19bdf21...
==> Running build command 'npm install'...
==> Installing dependencies...
==> Build successful!
==> Starting service with 'node index.js'...
🚀 Server 10000 portda ishlamoqda
✅ MongoDB ga muvaffaqiyatli ulandi
```

---

## 7️⃣ Backend URL'ni Olish

Deploy muvaffaqiyatli bo'lgandan keyin:

1. Service sahifasida yuqorida URL ko'rinadi:
```
https://wood-export-backend.onrender.com
```

2. Bu URL'ni nusxalang (frontend uchun kerak bo'ladi)

---

## 8️⃣ Test Qilish

### Health Check:
```bash
curl https://wood-export-backend.onrender.com/api/auth/check-admin
```

**Javob:**
```json
{
  "adminExists": false
}
```

### API Test:
Browser'da oching:
```
https://wood-export-backend.onrender.com/api/auth/check-admin
```

Agar JSON ko'rsatsa - **MUVAFFAQIYATLI!** ✅

---

## 9️⃣ Muammolarni Hal Qilish

### Build Failed
**Logs'da:**
```
npm ERR! code ELIFECYCLE
```

**Yechim:**
- `Root Directory` to'g'ri (`server`) ekanligini tekshiring
- `Build Command` to'g'ri (`npm install`) ekanligini tekshiring

### MongoDB Connection Error
**Logs'da:**
```
❌ MongoDB ulanish xatosi: MongoServerError
```

**Yechim:**
1. MongoDB Atlas'da IP whitelist'ga `0.0.0.0/0` qo'shing
2. `MONGODB_URI` to'g'riligini tekshiring
3. Database user'ning parol va ruxsatlari to'g'riligini tekshiring

### Port Error
**Logs'da:**
```
Error: listen EADDRINUSE
```

**Yechim:**
- Render avtomatik `PORT=10000` beradi
- Kodda `process.env.PORT` ishlatilganligini tekshiring
- Bizning kodda bu allaqachon bor: `const PORT = process.env.PORT || 5002;`

---

## 🎉 Backend Deploy Bo'ldi!

Endi frontend'ni deploy qilishingiz mumkin!

**Backend URL'ni eslab qoling:**
```
https://wood-export-backend.onrender.com
```

Bu URL frontend'da `NEXT_PUBLIC_API_URL` sifatida ishlatiladi.

---

## 📊 Monitoring

### Logs Ko'rish:
1. Service sahifasida **"Logs"** tab
2. Real-time logs ko'rinadi

### Metrics:
- **CPU Usage**
- **Memory Usage**  
- **Request Count**
- **Response Time**

### Alerts:
- Email orqali xabarnomalar
- Slack integration

---

## 🔄 Yangilash

### Avtomatik:
- GitHub'ga push qilsangiz avtomatik deploy bo'ladi

### Manual:
1. Service sahifasida **"Manual Deploy"**
2. **"Deploy latest commit"** tugmasini bosing

---

## ✅ Keyingi Qadam

Frontend'ni deploy qiling: `RENDER_FRONTEND_DEPLOY.md`
