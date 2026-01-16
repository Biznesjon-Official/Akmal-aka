# 📦 Yog'och Import/Export Tizimi

Professional yog'och import va eksport biznesini boshqarish uchun to'liq tizim.

## 🚀 Asosiy Xususiyatlar

### ✅ Hozirda Mavjud

- **Multi-Currency Support**: USD va RUB valyutalari
- **Lot-based System**: Bir vagon bir necha lot (turli o'lchovlar)
- **Smart Updates**: Takroriy yozuvlarni oldini olish
- **Brak System**: Hajm asosida (m³) hisoblash
- **Real-time Calculations**: Avtomatik tannarx va foyda hisoblash
- **Transaction Safety**: Ma'lumotlar izchilligi kafolati

### 📊 Modullar

1. **Vagonlar** - Vagon va lot boshqaruvi
2. **Mijozlar** - Mijozlar bazasi
3. **Sotuvlar** - Vagon sotuvlari va qarzlar
4. **Xarajatlar** - Vagon/lot xarajatlari
5. **Kassa** - Pul oqimi (USD/RUB)
6. **Hisobotlar** - Moliyaviy tahlil
7. **Valyuta Kurslari** - USD/RUB → UZS

## 🛠 Texnologiyalar

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Transaction Support

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Axios

## 📦 O'rnatish

### 1. Repository'ni clone qiling
```bash
git clone https://github.com/Javohir-ac/export.git
cd export
```

### 2. Backend sozlash
```bash
cd server
npm install
```

`.env` fayl yarating:
```env
PORT=5002
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=development
```

Backend ishga tushirish:
```bash
npm start
```

### 3. Frontend sozlash
```bash
cd client
npm install
```

`.env.local` fayl yarating:
```env
NEXT_PUBLIC_API_URL=http://localhost:5002
```

Frontend ishga tushirish (development mode):
```bash
npm run dev
```

Frontend build qilish (production):
```bash
npm run build
npm start
```

## 🔐 Birinchi Admin Yaratish

1. Backend ishga tushgandan keyin
2. Frontend'ga kiring: http://localhost:3000
3. Login sahifasida "Birinchi admin yaratish" tugmasini bosing
4. Username va parol kiriting

## 📖 Foydalanish

### Vagon Qo'shish
1. Sidebar → Vagonlar
2. "Yangi vagon" tugmasini bosing
3. Vagon kodini kiriting
4. Lotlarni qo'shing (o'lchov, soni, valyuta, narx)
5. Saqlang

### Sotuv Qilish
1. Sidebar → Vagon Sotuvlari
2. "Yangi sotuv" tugmasini bosing
3. Vagon va lotni tanlang
4. Mijozni tanlang
5. Sotilgan sonini kiriting
6. Valyuta va narxni kiriting
7. To'lovni kiriting (ixtiyoriy)
8. Saqlang

### Xarajat Qo'shish
1. Sidebar → Xarajatlar
2. "Yangi xarajat" tugmasini bosing
3. Vagon/lotni tanlang
4. Xarajat turini tanlang
5. Valyuta va summani kiriting
6. Saqlang

## 🔄 Smart Update Logic

### Sotuvlar
Agar bir xil mijozga bir xil lot sotilsa:
- Yangi yozuv yaratilmaydi
- Mavjud sotuv yangilanadi
- Hajm va qarz qo'shiladi

### Xarajatlar
Agar bir xil vagon/lot uchun bir xil xarajat turi qo'shilsa:
- Yangi yozuv yaratilmaydi
- Mavjud xarajat yangilanadi
- Summa yangilanadi

## 📊 Hisob-kitob Formulalari

### Lot Hajmi
```
Hajm (m³) = (Qalinlik × Kenglik × Uzunlik × Soni) / 1,000,000
```

### Brak
```
Mavjud hajm = Kelgan hajm - Brak (m³)
```

### Tannarx
```
Tannarx = (Sotib olish narxi + Xarajatlar) / Kelgan hajm
```

### Foyda
```
Foyda = Sotuv summasi - (Tannarx × Sotilgan hajm)
```

## 🔒 Xavfsizlik

- JWT token autentifikatsiya
- Helmet.js (HTTP headers himoyasi)
- Rate limiting (DDoS himoyasi)
- CORS sozlamalari
- Password hashing (bcrypt)

## 📝 API Endpoints

### Auth
- `POST /api/auth/login` - Kirish
- `POST /api/auth/create-first-admin` - Birinchi admin
- `GET /api/auth/me` - Foydalanuvchi ma'lumotlari

### Vagonlar
- `GET /api/vagon` - Barcha vagonlar
- `POST /api/vagon` - Yangi vagon
- `PUT /api/vagon/:id` - Vagonni yangilash
- `DELETE /api/vagon/:id` - Vagonni o'chirish

### Lotlar
- `GET /api/vagon-lot` - Barcha lotlar
- `POST /api/vagon-lot` - Yangi lot
- `GET /api/vagon-lot/vagon/:vagonId` - Vagon lotlari

### Sotuvlar
- `GET /api/vagon-sale` - Barcha sotuvlar
- `POST /api/vagon-sale` - Yangi sotuv
- `DELETE /api/vagon-sale/:id` - Sotuvni o'chirish

### Xarajatlar
- `GET /api/vagon-expense` - Barcha xarajatlar
- `POST /api/vagon-expense` - Yangi xarajat

### Kassa
- `GET /api/cash` - Kassa tarixi
- `GET /api/cash/balance` - Balans
- `POST /api/cash/client-payment` - Mijoz to'lovi

## 🐛 Muammolarni Hal Qilish

### MongoDB ulanish xatosi
1. Internet ulanishini tekshiring
2. MongoDB Atlas IP whitelist'ni tekshiring
3. Connection string'ni tekshiring

### Port band
```bash
lsof -ti:5002 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Build xatolari
```bash
# Backend
cd server
rm -rf node_modules
npm install

# Frontend
cd client
rm -rf node_modules .next
npm install
npm run build
```

## 📚 Hujjatlar

- [API Test Guide](API_TEST_GUIDE.md)
- [Technical Documentation](TEXNIK_DOKUMENTATSIYA.md)
- [System Architecture](YANGI_ARXITEKTURA_TAYYOR.md)

## 🤝 Hissa Qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/AmazingFeature`)
3. Commit qiling (`git commit -m 'Add some AmazingFeature'`)
4. Push qiling (`git push origin feature/AmazingFeature`)
5. Pull Request oching

## 📄 License

MIT License

## 👨‍💻 Muallif

Javohir - [@Javohir-ac](https://github.com/Javohir-ac)

## 🙏 Minnatdorchilik

- Next.js jamoasi
- MongoDB jamoasi
- Barcha open-source contributorlar

---

**⭐ Agar loyiha yoqsa, star bering!**
