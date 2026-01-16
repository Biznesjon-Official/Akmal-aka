# 🌲 Yog'och Import/Export Boshqaruv Tizimi

Rossiyadan yog'och import/export operatsiyalarini professional boshqarish uchun to'liq funksional web-ilova.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Mundarija

- [Loyiha Haqida](#-loyiha-haqida)
- [Asosiy Xususiyatlar](#-asosiy-xususiyatlar)
- [Texnologiyalar](#-texnologiyalar)
- [O'rnatish](#-ornatish)
- [Ishga Tushirish](#-ishga-tushirish)
- [Loyiha Strukturasi](#-loyiha-strukturasi)
- [API Dokumentatsiyasi](#-api-dokumentatsiyasi)
- [Foydalanish](#-foydalanish)
- [Xususiyatlar](#-xususiyatlar)
- [Hisob-kitoblar](#-hisob-kitoblar)
- [Ekran Rasmlari](#-ekran-rasmlari)
- [Muammolarni Hal Qilish](#-muammolarni-hal-qilish)

## 🎯 Loyiha Haqida

Bu loyiha Rossiyadan O'zbekistonga yog'och import/export operatsiyalarini boshqarish uchun yaratilgan professional web-ilova. Tizim yog'och lotlarini, transport (poyezd) ma'lumotlarini, kassa operatsiyalarini va valyuta kurslarini to'liq boshqarish imkonini beradi.

### Maqsad

Yog'och import/export biznesini raqamlashtirish va barcha operatsiyalarni bir joyda boshqarish, avtomatik hisob-kitoblar va professional hisobotlar orqali biznes samaradorligini oshirish.

## ✨ Asosiy Xususiyatlar

### 🌳 Yog'och Lotlari Boshqaruvi
- ✅ Yog'och lotlarini qo'shish va boshqarish
- ✅ Avtomatik hajm (m³) va og'irlik (tonna) hisoblash
- ✅ To'g'ri formula: `(qalinlik_mm × eni_mm × uzunlik_m) ÷ 1,000,000 = m³`
- ✅ Turli xil yog'och turlari uchun zichlik koeffitsiyenti
- ✅ Status kuzatuvi (kutilmoqda, import, sotildi, export)
- ✅ 1 m³ da nechta dona borligini avtomatik hisoblash

### 🚂 Transport (Poyezd) Boshqaruvi
- ✅ Faqat poyezd transport turi
- ✅ Marshrut ma'lumotlari (jo'natish va kelish joylari)
- ✅ Vagon va otpravka raqamlari
- ✅ Yuboruvchi va qabul qiluvchi ma'lumotlari
- ✅ Faktik va yaxlitlangan ves ma'lumotlari
- ✅ Transport holati kuzatuvi

### 💰 Kassa Tizimi
- ✅ To'rt xil tranzaksiya turi:
  - **Otpr**: Jo'natish xarajatlari
  - **Prixod**: Kirim
  - **Klent Prixod**: Mijozdan tushum
  - **Rasxod**: Chiqim
- ✅ Ko'p valyuta qo'llab-quvvatlash (USD, RUB, UZS)
- ✅ Avtomatik balans hisoblash
- ✅ Sof foyda/zarar ko'rsatkichlari
- ✅ Professional raqam formatlash (2 000 000 so'm)

### 💱 Valyuta Kurslari
- ✅ USD va RUB kurslarini boshqarish
- ✅ Real vaqtda kurs yangilash
- ✅ Kurs tarixi
- ✅ Faqat admin foydalanuvchi uchun

### 📊 Hisobotlar va Statistika
- ✅ Foyda/zarar hisoboti
- ✅ Yog'och lotlari statistikasi
- ✅ Transport statistikasi
- ✅ Kassa tranzaksiyalari statistikasi
- ✅ Sana va valyuta bo'yicha filtrlash

### 🎨 Professional UI/UX
- ✅ Zamonaviy va professional dizayn
- ✅ Gradient va shadow effektlari
- ✅ Responsive dizayn (barcha ekranlar uchun)
- ✅ Loading va empty state'lar
- ✅ Smooth animatsiyalar
- ✅ Professional raqam formatlash

## 🛠 Texnologiyalar

### Frontend
- **Next.js 16.1.1** - React framework (Turbopack bilan)
- **React 19** - UI kutubxonasi
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **TanStack Query (React Query)** - Server state management
- **Axios** - HTTP client
- **Context API** - Global state management

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Development Tools
- **Nodemon** - Auto-restart server
- **Concurrently** - Run multiple commands
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## 📦 O'rnatish

### Talablar

- Node.js >= 18.0.0
- npm yoki yarn
- MongoDB (local yoki cloud)

### 1. Repositoriyani Klonlash

```bash
git clone <repository-url>
cd export
```

### 2. Dependencies O'rnatish

```bash
# Root dependencies
npm install

# Client dependencies
cd client
npm install

# Server dependencies
cd ../server
npm install
```

### 3. Environment Variables Sozlash

**Server (.env fayli):**

```env
PORT=5002
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

### 4. MongoDB Sozlash

MongoDB Atlas yoki local MongoDB ishlatishingiz mumkin:

**MongoDB Atlas (Cloud):**
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) da account yarating
2. Yangi cluster yarating
3. Database user yarating
4. IP address whitelist qo'shing
5. Connection string oling va `.env` fayliga qo'shing

**Local MongoDB:**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS
brew install mongodb-community

# MongoDB ishga tushirish
mongod
```

## 🚀 Ishga Tushirish

### Development Mode

**Barcha serverlarni bir vaqtda ishga tushirish:**

```bash
npm run dev
```

Bu buyruq frontend va backend serverlarni parallel ishga tushiradi:
- Frontend: http://localhost:3000
- Backend: http://localhost:5002

**Alohida ishga tushirish:**

```bash
# Faqat frontend
npm run client:dev

# Faqat backend
npm run server:dev
```

### Production Mode

```bash
# Frontend build
cd client
npm run build
npm start

# Backend
cd server
npm start
```

### Default Login Ma'lumotlari

```
Username: admin
Password: admin123
```

**⚠️ Muhim:** Production muhitida parolni o'zgartiring!

## 📁 Loyiha Strukturasi

```
export/
├── client/                      # Frontend (Next.js)
│   ├── public/                  # Static fayllar
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── exchange-rates/  # Valyuta kurslari sahifasi
│   │   │   ├── kassa/           # Kassa sahifasi
│   │   │   ├── login/           # Login sahifasi
│   │   │   ├── reports/         # Hisobotlar sahifasi
│   │   │   ├── transport/       # Transport sahifasi
│   │   │   ├── wood/            # Yog'och lotlari sahifasi
│   │   │   ├── globals.css      # Global styles
│   │   │   ├── layout.tsx       # Root layout
│   │   │   ├── page.tsx         # Dashboard
│   │   │   └── providers.tsx    # React Query provider
│   │   ├── components/          # React komponentlar
│   │   │   ├── ui/              # UI komponentlar
│   │   │   │   ├── Button.tsx   # Button komponenti
│   │   │   │   ├── Card.tsx     # Card komponentlari
│   │   │   │   ├── Modal.tsx    # Modal komponenti
│   │   │   │   └── Table.tsx    # Table komponentlari
│   │   │   ├── Dashboard.tsx    # Dashboard komponenti
│   │   │   ├── FormattedInput.tsx # Formatted input
│   │   │   ├── Header.tsx       # Header komponenti
│   │   │   ├── Layout.tsx       # Layout komponenti
│   │   │   └── Sidebar.tsx      # Sidebar komponenti
│   │   ├── context/             # React Context
│   │   │   └── AuthContext.tsx  # Authentication context
│   │   └── utils/               # Utility funksiyalar
│   │       └── formatters.ts    # Raqam formatlash
│   ├── next.config.ts           # Next.js konfiguratsiya
│   ├── tailwind.config.js       # Tailwind konfiguratsiya
│   └── package.json             # Frontend dependencies
│
├── server/                      # Backend (Express.js)
│   ├── middleware/              # Express middleware
│   │   └── auth.js              # JWT authentication
│   ├── models/                  # Mongoose models
│   │   ├── ExchangeRate.js      # Valyuta kursi modeli
│   │   ├── Kassa.js             # Kassa modeli
│   │   ├── Transport.js         # Transport modeli
│   │   ├── User.js              # Foydalanuvchi modeli
│   │   └── Wood.js              # Yog'och modeli
│   ├── routes/                  # Express routes
│   │   ├── auth.js              # Authentication routes
│   │   ├── exchangeRate.js      # Valyuta kursi routes
│   │   ├── kassa.js             # Kassa routes
│   │   ├── reports.js           # Hisobotlar routes
│   │   ├── transport.js         # Transport routes
│   │   └── wood.js              # Yog'och routes
│   ├── .env                     # Environment variables
│   ├── index.js                 # Server entry point
│   └── package.json             # Backend dependencies
│
├── package.json                 # Root package.json
└── README.md                    # Bu fayl
```

## 🔌 API Dokumentatsiyasi

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "admin",
    "role": "admin"
  }
}
```

### Yog'och Lotlari

#### Barcha lotlarni olish
```http
GET /api/wood
Authorization: Bearer <token>

Response:
{
  "woods": [...],
  "total": 10
}
```

#### Yangi lot qo'shish
```http
POST /api/wood
Authorization: Bearer <token>
Content-Type: application/json

{
  "lotCode": "LOT-2024-001",
  "qalinlik": 31,
  "eni": 125,
  "uzunlik": 6,
  "soni": 115,
  "yogochZichligi": 0.65,
  "status": "kutilmoqda"
}
```

### Transport

#### Barcha transportlarni olish
```http
GET /api/transport
Authorization: Bearer <token>
```

#### Yangi transport qo'shish
```http
POST /api/transport
Authorization: Bearer <token>
Content-Type: application/json

{
  "transportTuri": "poyezd",
  "jonatishJoyi": "Moskva",
  "kelishJoyi": "Toshkent",
  "yuboruvchi": "Kompaniya A",
  "qabulQiluvchi": "Kompaniya B",
  "nomerVagon": "12345678",
  "nomerOtpravka": "OTP-2024-001",
  "dataZayavki": "2024-01-15",
  "woodLot": "wood_lot_id",
  "status": "kutilmoqda"
}
```

### Kassa

#### Barcha tranzaksiyalarni olish
```http
GET /api/kassa
Authorization: Bearer <token>
```

#### Balansni olish
```http
GET /api/kassa/balance
Authorization: Bearer <token>
```

#### Yangi tranzaksiya qo'shish
```http
POST /api/kassa
Authorization: Bearer <token>
Content-Type: application/json

{
  "turi": "prixod",
  "summa": 1000000,
  "valyuta": "USD",
  "tavsif": "Yog'och sotuvidan tushum",
  "sana": "2024-01-15"
}
```

### Valyuta Kurslari

#### Kurslarni olish
```http
GET /api/exchange-rate
Authorization: Bearer <token>
```

#### Kursni yangilash
```http
POST /api/exchange-rate
Authorization: Bearer <token>
Content-Type: application/json

{
  "currency": "USD",
  "rate": 12500
}
```

### Hisobotlar

#### Umumiy statistika
```http
GET /api/reports/general?startDate=2024-01-01&endDate=2024-12-31&valyuta=USD
Authorization: Bearer <token>
```

#### Foyda/Zarar hisoboti
```http
GET /api/reports/profit-loss?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

## 💡 Foydalanish

### 1. Tizimga Kirish

1. Brauzerda http://localhost:3000 ni oching
2. Login sahifasida username va parolni kiriting
3. "Kirish" tugmasini bosing

### 2. Yog'och Loti Qo'shish

1. Sidebar'dan "Yog'och Lotlari" ni tanlang
2. "Yangi Lot Qo'shish" tugmasini bosing
3. Formani to'ldiring:
   - Lot kodi (masalan: LOT-2024-001)
   - Qalinlik (mm)
   - Eni (mm)
   - Uzunlik (m)
   - Soni (dona)
   - Yog'och turi
   - Status
4. Kub hajmi va tonna avtomatik hisoblanadi
5. "Saqlash" tugmasini bosing

### 3. Transport Qo'shish

1. Sidebar'dan "Transport" ni tanlang
2. "Yangi Poyezd Qo'shish" tugmasini bosing
3. Formani to'ldiring:
   - Marshrut ma'lumotlari
   - Yuboruvchi va qabul qiluvchi
   - Vagon va otpravka raqamlari
   - Og'irlik ma'lumotlari
   - Yog'och lot
4. "Saqlash" tugmasini bosing

### 4. Kassa Tranzaksiyasi

1. Sidebar'dan "Kassa" ni tanlang
2. "Yangi Tranzaksiya" tugmasini bosing
3. Tranzaksiya turini tanlang
4. Summa va valyutani kiriting (raqamlar avtomatik formatlanadi)
5. Tavsif va sanani kiriting
6. "Saqlash" tugmasini bosing

### 5. Valyuta Kursini Yangilash

1. Sidebar'dan "Valyuta Kurslari" ni tanlang
2. "Kurs Yangilash" tugmasini bosing
3. Valyuta va kursni kiriting
4. "Saqlash" tugmasini bosing

### 6. Hisobotlarni Ko'rish

1. Sidebar'dan "Hisobotlar" ni tanlang
2. Filtrlarni sozlang (sana, valyuta)
3. Foyda/zarar va statistikalarni ko'ring

## 🧮 Hisob-kitoblar

### Yog'och Hajmi Hisoblash

**Formula:**
```
Kub hajmi (m³) = (qalinlik_mm × eni_mm × uzunlik_m) ÷ 1,000,000 × soni
```

**Misol:**
- Qalinlik: 31 mm
- Eni: 125 mm
- Uzunlik: 6 m
- Soni: 115 dona

```
Bitta dona hajmi = (31 × 125 × 6) ÷ 1,000,000 = 0.02325 m³
Jami hajm = 0.02325 × 115 = 2.67375 m³
```

### Og'irlik Hisoblash

**Formula:**
```
Og'irlik (tonna) = Kub hajmi (m³) × Zichlik (t/m³)
```

**Yog'och Zichliklari:**
- Qarag'ay: 0.45 t/m³
- Archa: 0.55 t/m³
- Qayin: 0.65 t/m³
- Eman: 0.75 t/m³
- Qora eman: 0.85 t/m³

### 1 m³ da Nechta Dona

**Formula:**
```
Dona soni = 1 ÷ (bitta dona hajmi)
```

**Misol:**
```
Bitta dona hajmi = 0.02325 m³
1 m³ da = 1 ÷ 0.02325 = 43 dona
```

### Kassa Balansi

**Daromad:**
```
Daromad = Otpr + Prixod + Klent Prixod
```

**Sof Foyda:**
```
Sof Foyda = Daromad - Rasxod
```

## 🎨 Ekran Rasmlari

### Dashboard
Professional dashboard statistika va tezkor ma'lumotlar bilan.

### Yog'och Lotlari
Barcha yog'och lotlari ro'yxati va avtomatik hisob-kitoblar.

### Transport
Poyezd transport ma'lumotlari va kuzatuv tizimi.

### Kassa
Moliyaviy tranzaksiyalar va balans ko'rsatkichlari.

### Valyuta Kurslari
USD va RUB kurslarini boshqarish.

### Hisobotlar
To'liq statistika va foyda/zarar hisobotlari.

## 🔧 Muammolarni Hal Qilish

### Port Band Bo'lsa

```bash
# Port 3000 ni bo'shatish
lsof -ti:3000 | xargs kill

# Port 5002 ni bo'shatish
lsof -ti:5002 | xargs kill
```

### MongoDB Ulanish Xatosi

1. MongoDB ishlab turganini tekshiring
2. `.env` faylidagi `MONGODB_URI` ni tekshiring
3. MongoDB Atlas da IP whitelist ni tekshiring
4. Network connection ni tekshiring

### JWT Token Xatosi

1. `.env` faylidagi `JWT_SECRET` ni tekshiring
2. Browser localStorage ni tozalang
3. Qayta login qiling

### Build Xatolari

```bash
# Node modules ni tozalash
rm -rf node_modules client/node_modules server/node_modules
rm package-lock.json client/package-lock.json server/package-lock.json

# Qayta o'rnatish
npm install
cd client && npm install
cd ../server && npm install
```

### Raqam Formatlash Ishlamasa

1. Browser cache ni tozalang
2. `FormattedInput` komponenti to'g'ri import qilinganini tekshiring
3. `formatters.ts` faylini tekshiring

## 📝 Qo'shimcha Ma'lumotlar

### Xavfsizlik

- JWT token bilan authentication
- Password hashing (bcryptjs)
- CORS sozlamalari
- Environment variables
- Role-based access control

### Performance

- React Query caching
- Optimistic updates
- Lazy loading
- Code splitting
- Image optimization

### Browser Qo'llab-quvvatlash

- Chrome (oxirgi 2 versiya)
- Firefox (oxirgi 2 versiya)
- Safari (oxirgi 2 versiya)
- Edge (oxirgi 2 versiya)

## 🤝 Hissa Qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/AmazingFeature`)
3. O'zgarishlarni commit qiling (`git commit -m 'Add some AmazingFeature'`)
4. Branch ga push qiling (`git push origin feature/AmazingFeature`)
5. Pull Request oching

## 📄 Litsenziya

MIT License - batafsil ma'lumot uchun [LICENSE](LICENSE) faylini ko'ring.

## 👨‍💻 Muallif

**Javohir Jabborov**

## 🙏 Minnatdorchilik

- Next.js jamoasiga
- React jamoasiga
- MongoDB jamoasiga
- Barcha open-source contributorlar

## 📞 Aloqa

Savollar yoki takliflar bo'lsa, iltimos bog'laning:

- Email: your.email@example.com
- GitHub: [@yourusername](https://github.com/yourusername)

---

**⭐ Agar loyiha yoqsa, star bering!**

**Made with ❤️ in Uzbekistan**
# export
