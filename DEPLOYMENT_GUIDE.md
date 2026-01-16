# 🚀 Deployment Qo'llanma - Wood Import/Export System

## ✅ Pre-Deployment Checklist

### 1. Kod Tayyorligi
- [x] Barcha testlar o'tdi (27/27) ✅
- [x] Import/Export xatolari tuzatildi ✅
- [x] Responsive design ✅
- [x] Error handling ✅
- [x] Loading states ✅
- [x] Backup funksiyasi ✅

### 2. Environment Variables
- [ ] Production MongoDB URI
- [ ] JWT Secret (yangi, xavfsiz)
- [ ] Production domain
- [ ] CORS settings

### 3. Security
- [ ] Admin parolini o'zgartirish
- [ ] JWT secret yangilash
- [ ] CORS production domain'ga cheklash
- [ ] Rate limiting qo'shish (ixtiyoriy)

---

## 🎯 DEPLOYMENT STRATEGIYASI

### Variant 1: BEPUL (Tavsiya - Boshlang'ich)
**Xarajat:** $0-5/oy

#### Frontend: Vercel (FREE)
- ✅ Bepul hosting
- ✅ Automatic SSL
- ✅ CDN
- ✅ Automatic deployments

#### Backend: Railway/Render (FREE tier)
- ✅ 500 soat/oy bepul (Railway)
- ✅ Automatic SSL
- ✅ Easy deployment

#### Database: MongoDB Atlas (FREE)
- ✅ 512MB bepul
- ✅ Automatic backups
- ✅ Monitoring

### Variant 2: PROFESSIONAL ($20-30/oy)
- Frontend: Vercel Pro ($20/oy)
- Backend: Railway Pro ($5-10/oy)
- Database: MongoDB Atlas Shared ($9/oy)
- Domain: Namecheap ($10-15/yil)

---

## 📦 STEP 1: MongoDB Atlas Setup

### 1.1 Account Yaratish
```
1. https://www.mongodb.com/cloud/atlas/register ga o'ting
2. Email bilan ro'yxatdan o'ting
3. Free tier tanlang (M0 Sandbox)
```

### 1.2 Cluster Yaratish
```
1. "Build a Database" tugmasini bosing
2. FREE tier (M0) tanlang
3. Region: AWS / Singapore yoki Frankfurt (yaqin)
4. Cluster Name: wood-system
5. "Create" tugmasini bosing
```

### 1.3 Database User Yaratish
```
1. Security → Database Access
2. "Add New Database User"
3. Username: woodadmin
4. Password: [KUCHLI PAROL YARATING]
5. Database User Privileges: "Read and write to any database"
6. "Add User"
```

### 1.4 Network Access
```
1. Security → Network Access
2. "Add IP Address"
3. "Allow Access from Anywhere" (0.0.0.0/0)
4. "Confirm"
```

### 1.5 Connection String Olish
```
1. Database → Connect
2. "Connect your application"
3. Driver: Node.js
4. Connection string'ni nusxalang:
   mongodb+srv://woodadmin:<password>@wood-system.xxxxx.mongodb.net/wood_system?retryWrites=true&w=majority

5. <password> ni o'z parolingiz bilan almashtiring
```

---

## 🖥️ STEP 2: Backend Deployment (Railway)

### 2.1 Railway Account
```
1. https://railway.app ga o'ting
2. GitHub bilan login qiling
3. "New Project" → "Deploy from GitHub repo"
```

### 2.2 Repository Setup
```bash
# GitHub'ga push qiling
cd server
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/wood-system-backend.git
git push -u origin main
```

### 2.3 Railway'da Deploy
```
1. Railway'da repository'ni tanlang
2. Root Directory: /server (agar monorepo bo'lsa)
3. "Deploy Now"
```

### 2.4 Environment Variables
Railway dashboard'da Settings → Variables:

```env
NODE_ENV=production
PORT=5002
MONGODB_URI=mongodb+srv://woodadmin:YOUR_PASSWORD@wood-system.xxxxx.mongodb.net/wood_system?retryWrites=true&w=majority
JWT_SECRET=YOUR_SUPER_SECRET_KEY_HERE_CHANGE_THIS_IN_PRODUCTION_12345678
```

**MUHIM:** JWT_SECRET'ni yangi, xavfsiz qiymat bilan almashtiring!

```bash
# Xavfsiz JWT secret yaratish (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.5 Domain Olish
```
Railway Settings → Domains
- railway.app subdomain: wood-system-api.up.railway.app
- Yoki custom domain qo'shing
```

---

## 🌐 STEP 3: Frontend Deployment (Vercel)

### 3.1 Vercel Account
```
1. https://vercel.com/signup ga o'ting
2. GitHub bilan login qiling
```

### 3.2 Repository Setup
```bash
# GitHub'ga push qiling
cd client
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/wood-system-frontend.git
git push -u origin main
```

### 3.3 Vercel'da Deploy
```
1. Vercel dashboard → "Add New Project"
2. GitHub repository'ni import qiling
3. Framework Preset: Next.js (auto-detect)
4. Root Directory: client (agar monorepo bo'lsa)
5. "Deploy"
```

### 3.4 Environment Variables
Vercel Settings → Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://wood-system-api.up.railway.app/api
```

**MUHIM:** Railway backend URL'ini kiriting!

### 3.5 Redeploy
```
Environment variable qo'shgandan keyin:
Deployments → Latest → "Redeploy"
```

---

## 🔧 STEP 4: Backend CORS Configuration

Backend'da CORS'ni production domain'ga cheklash:

```javascript
// server/index.js
app.use(cors({
  origin: [
    'http://localhost:3000', // Development
    'https://wood-system.vercel.app', // Production
    'https://your-custom-domain.com' // Custom domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

Railway'da redeploy qiling.

---

## 🔐 STEP 5: Security Setup

### 5.1 Admin Parolini O'zgartirish

Production'da birinchi login qilgandan keyin:

```bash
# Backend'da script yarating: change-admin-password.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function changePassword() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const newPassword = 'YOUR_NEW_SECURE_PASSWORD';
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  await User.updateOne(
    { username: 'admin' },
    { password: hashedPassword }
  );
  
  console.log('Password changed successfully!');
  process.exit(0);
}

changePassword();
```

```bash
# Ishga tushirish
node change-admin-password.js
```

### 5.2 JWT Secret Yangilash
Railway Environment Variables'da JWT_SECRET'ni yangi qiymat bilan almashtiring.

### 5.3 Database Backup
MongoDB Atlas → Clusters → Backup:
- Automatic backups yoqing (FREE tier'da mavjud)

---

## 📱 STEP 6: Custom Domain (Ixtiyoriy)

### 6.1 Domain Sotib Olish
```
Namecheap, GoDaddy, yoki Cloudflare'dan:
- Narx: $10-15/yil
- Tavsiya: .uz, .com, .net
```

### 6.2 Frontend Domain
```
Vercel Settings → Domains:
1. Custom domain qo'shing: woodsystem.uz
2. DNS records'ni ko'rsatilganidek sozlang
3. SSL automatic (Vercel)
```

### 6.3 Backend Domain
```
Railway Settings → Domains:
1. Custom domain qo'shing: api.woodsystem.uz
2. DNS records'ni sozlang
3. SSL automatic (Railway)
```

### 6.4 DNS Configuration (Cloudflare)
```
Type    Name    Content                         Proxy
A       @       76.76.21.21 (Vercel IP)        Yes
CNAME   api     wood-system-api.up.railway.app  Yes
```

---

## ✅ STEP 7: Post-Deployment Testing

### 7.1 Funktsional Test
```
1. Login qiling
2. Valyuta kursi belgilang
3. Xarid qiling (lot yaratilishini tekshiring)
4. Xarajat qo'shing
5. Sotuv qiling
6. Hisobotlarni ko'ring
7. Backup yarating
```

### 7.2 Performance Test
```
1. Page load time < 3s
2. API response time < 1s
3. Mobile responsive
4. SSL certificate ishlayapti
```

### 7.3 Security Test
```
1. HTTPS ishlayapti
2. Login without token → 401
3. CORS faqat allowed domains
4. Admin parol o'zgartirildi
```

---

## 📊 STEP 8: Monitoring Setup

### 8.1 Railway Monitoring
```
Railway Dashboard:
- Metrics: CPU, Memory, Network
- Logs: Real-time logs
- Alerts: Email notifications
```

### 8.2 MongoDB Atlas Monitoring
```
Atlas Dashboard:
- Performance: Query performance
- Alerts: Disk space, connections
- Backup: Automatic backups
```

### 8.3 Vercel Analytics
```
Vercel Dashboard:
- Page views
- Performance metrics
- Error tracking
```

---

## 🔄 STEP 9: Continuous Deployment

### 9.1 Automatic Deployment
```
GitHub'ga push qilganda automatic deploy:

1. Git commit va push
2. Vercel/Railway automatic detect
3. Build va deploy
4. Live!
```

### 9.2 Deployment Workflow
```bash
# Development
git checkout develop
git add .
git commit -m "Feature: new feature"
git push origin develop

# Production
git checkout main
git merge develop
git push origin main
# Automatic deploy!
```

---

## 🆘 TROUBLESHOOTING

### Muammo 1: Backend'ga ulanmayapti
```
✅ Railway logs'ni tekshiring
✅ CORS settings to'g'rimi?
✅ Environment variables to'g'rimi?
✅ MongoDB connection string to'g'rimi?
```

### Muammo 2: Frontend build failed
```
✅ package.json dependencies to'g'rimi?
✅ Environment variables to'g'rimi?
✅ Next.js version compatible?
✅ Build logs'ni o'qing
```

### Muammo 3: Database connection error
```
✅ MongoDB Atlas IP whitelist
✅ Database user credentials
✅ Connection string format
✅ Network access settings
```

---

## 💰 XARAJATLAR HISOBI

### FREE Tier (Boshlang'ich)
- Frontend (Vercel): $0
- Backend (Railway): $0 (500 soat/oy)
- Database (MongoDB): $0 (512MB)
- **JAMI: $0/oy** ✅

### Professional Tier
- Frontend (Vercel Pro): $20/oy
- Backend (Railway): $5-10/oy
- Database (MongoDB Shared): $9/oy
- Domain: $1/oy (~$12/yil)
- **JAMI: $35-40/oy**

---

## 📞 SUPPORT

### Railway Support
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

### Vercel Support
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

### MongoDB Support
- Docs: https://docs.mongodb.com
- Community: https://community.mongodb.com

---

## 🎉 DEPLOYMENT COMPLETE!

Tabriklaymiz! Loyihangiz production'da! 🚀

**Next Steps:**
1. ✅ Beta test (3-5 foydalanuvchi)
2. ✅ Feedback yig'ish
3. ✅ Bug fixes
4. ✅ Marketing boshlash
5. ✅ Birinchi mijozlar!

**Production URLs:**
- Frontend: https://wood-system.vercel.app
- Backend: https://wood-system-api.up.railway.app
- Admin: admin / [YANGI_PAROL]

---

**Omad tilaymiz! 🎊**
