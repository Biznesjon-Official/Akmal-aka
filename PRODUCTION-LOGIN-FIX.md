# Production Login Muammosini Hal Qilish

## Muammo
Production serverda `admin` / `admin123` bilan login qila olmayapsiz.

## Yechim

### Variant 1: SSH orqali parolni reset qilish (TAVSIYA ETILADI)

1. SSH bilan production serverga ulaning:
```bash
ssh user@akmalaka.biznesjon.uz
```

2. Loyiha papkasiga o'ting:
```bash
cd /path/to/your/app
```

3. Admin parolini reset qiling:
```bash
node server/scripts/reset-admin-password.js
```

4. Script so'ragan savollariga javob bering:
   - Username: `admin` (yoki Enter bosing)
   - Yangi parol: `admin123` (yoki o'zingiz xohlagan parol)

5. Yangi parol bilan login qiling

### Variant 2: Database'ni to'liq tozalash va yangi admin yaratish

⚠️ **OGOHLANTIRISH**: Bu barcha ma'lumotlarni o'chiradi!

```bash
ssh user@akmalaka.biznesjon.uz
cd /path/to/your/app
node server/scripts/db-reset-auto.js
```

Bu script:
- Barcha ma'lumotlarni o'chiradi
- Yangi admin yaratadi (username: admin, password: admin123)

### Variant 3: MongoDB Atlas orqali to'g'ridan-to'g'ri

1. MongoDB Atlas'ga kiring: https://cloud.mongodb.com
2. Cluster'ingizni tanlang
3. Collections -> users
4. `admin` userini toping
5. `password` fieldini o'zgartiring (bcrypt hash kerak)

## Hozirgi Login Ma'lumotlari

Local database uchun (tozalangandan keyin):
- **Username:** admin
- **Password:** admin123
- **URL:** http://localhost:3000/login

Production uchun:
- **URL:** https://akmalaka.biznesjon.uz/login
- **Username:** admin
- **Password:** SSH orqali reset qilganingizdan keyin

## Qo'shimcha Ma'lumot

Production serverda script ishga tushirish:
```bash
# Server statusini tekshirish
pm2 status

# Serverni qayta ishga tushirish
pm2 restart all

# Loglarni ko'rish
pm2 logs
```

## Xavfsizlik

Production muhitda:
1. Default parollarni o'zgartiring
2. Kuchli parollar ishlating (kamida 12 belgi, harflar, raqamlar, maxsus belgilar)
3. Admin parolini xavfsiz joyda saqlang
4. Muntazam ravishda parollarni yangilang
