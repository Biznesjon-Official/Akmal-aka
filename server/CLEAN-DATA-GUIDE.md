# 🧹 MA'LUMOTLARNI TOZALASH BO'YICHA QO'LLANMA

Bu qo'llanma saytdagi barcha ma'lumotlarni tozalash uchun mo'ljallangan.

## ⚠️ MUHIM OGOHLANTIRISH

- **Bu amal qaytarib bo'lmaydi!**
- **Barcha biznes ma'lumotlari o'chiriladi!**
- **Faqat admin userlar saqlanadi!**

## 📋 BOSQICHMA-BOSQICH QO'LLANMA

### 1. Admin userlarni tekshirish

```bash
cd server
npm run check-admins
```

Bu buyruq:
- Barcha userlarni ko'rsatadi
- Admin userlarni alohida ko'rsatadi
- Agar admin yo'q bo'lsa, ogohlantiradi

### 2. Admin yaratish (agar kerak bo'lsa)

```bash
cd server
npm run create-admin
```

Bu buyruq:
- `admin` username bilan admin yaratadi
- Email: `admin@akmalaka.uz`
- Parol: `admin123`
- Agar admin mavjud bo'lsa, parolni yangilaydi

### 3. Ma'lumotlarni tozalash

```bash
cd server
npm run clean-all
```

Bu buyruq:
- 5 sekund kutadi (bekor qilish uchun Ctrl+C)
- Admin dan tashqari barcha userlarni o'chiradi
- Barcha biznes ma'lumotlarini o'chiradi:
  - Mijozlar
  - Vagonlar
  - Vagon sotuvlari
  - Kassa yozuvlari
  - Olib kelib berish
  - Eski tizim ma'lumotlari
- Admin parollarini "admin123" ga o'zgartiradi

## 📊 O'CHIRILADIGAN MA'LUMOTLAR

### Userlar
- ✅ **Saqlanadi**: Admin userlar
- ❌ **O'chiriladi**: Barcha oddiy userlar

### Biznes ma'lumotlari
- ❌ **O'chiriladi**: Barcha mijozlar
- ❌ **O'chiriladi**: Barcha vagonlar
- ❌ **O'chiriladi**: Barcha vagon sotuvlari
- ❌ **O'chiriladi**: Barcha kassa yozuvlari
- ❌ **O'chiriladi**: Barcha olib kelib berish
- ❌ **O'chiriladi**: Eski tizim ma'lumotlari

## 🔑 TOZALASHDAN KEYIN

Tozalash tugagach:
1. Admin login ma'lumotlari ko'rsatiladi
2. Barcha admin parollari "admin123" ga o'zgartiriladi
3. Sayt tozalangan holatda ishga tayyor bo'ladi

## 🚨 XAVFSIZLIK

- Script ishga tushishdan oldin 5 sekund kutadi
- Bu vaqt ichida Ctrl+C bilan bekor qilish mumkin
- Barcha o'zgarishlar logga yoziladi
- Admin userlar saqlanadi va parollari yangilanadi

## 📞 YORDAM

Agar muammo bo'lsa:
1. `npm run check-admins` bilan adminlarni tekshiring
2. `npm run create-admin` bilan admin yarating
3. Keyin `npm run clean-all` ishga tushiring

## 🔄 QAYTA TIKLASH

Agar ma'lumotlarni qayta tiklash kerak bo'lsa:
- Database backup dan tiklash kerak
- Yoki ma'lumotlarni qo'lda kiritish kerak
- Script orqali qayta tiklash mumkin emas!