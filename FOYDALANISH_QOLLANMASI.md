# 📖 Foydalanish Qo'llanmasi

## Tizimga Kirish

### 1. Ilova Ishga Tushirish

Terminal ochib quyidagi buyruqni bajaring:

```bash
npm run dev
```

Brauzerda avtomatik ochiladi yoki qo'lda oching: http://localhost:3000

### 2. Login

**Default ma'lumotlar:**
- Username: `admin`
- Password: `admin123`

⚠️ **Muhim:** Birinchi kirishdan keyin parolni o'zgartiring!

---

## Asosiy Funksiyalar

### 🌳 Yog'och Lotlari

#### Yangi Lot Qo'shish

1. **Sidebar'dan "Yog'och Lotlari" ni bosing**
2. **"Yangi Lot Qo'shish" tugmasini bosing**
3. **Formani to'ldiring:**

   **Lot Kodi:**
   - Masalan: `LOT-2024-001`
   - Har bir lot uchun noyob bo'lishi kerak

   **O'lchamlar:**
   - **Qalinlik:** Millimetrda (mm) - Masalan: `31`
   - **Eni:** Millimetrda (mm) - Masalan: `125`
   - **Uzunlik:** Metrda (m) - Masalan: `6`

   **Soni:**
   - Nechta dona - Masalan: `115`

   **Yog'och Turi:**
   - Qarag'ay (0.45 t/m³)
   - Archa (0.55 t/m³)
   - Qayin (0.65 t/m³)
   - Eman (0.75 t/m³)
   - Qora eman (0.85 t/m³)

   **Status:**
   - Kutilmoqda
   - Import
   - Sotildi
   - Export

4. **Avtomatik Hisoblash:**
   - Kub hajmi (m³) avtomatik hisoblanadi
   - Tonna avtomatik hisoblanadi
   - 1 m³ da nechta dona ko'rsatiladi

5. **"Saqlash" tugmasini bosing**

#### Lot Ma'lumotlarini Ko'rish

- Jadvalda barcha lotlar ko'rsatiladi
- Har bir lot uchun:
  - Lot kodi
  - O'lchamlar
  - Soni
  - Hajm (m³ va tonna)
  - Status
  - Yaratilgan sana

---

### 🚂 Transport (Poyezd)

#### Yangi Transport Qo'shish

1. **Sidebar'dan "Transport" ni bosing**
2. **"Yangi Poyezd Qo'shish" tugmasini bosing**
3. **Formani to'ldiring:**

   **Marshrut Ma'lumotlari:**
   - **Jo'natish joyi:** Masalan: `Moskva`
   - **Kelish joyi:** Masalan: `Toshkent`

   **Yuboruvchi va Qabul Qiluvchi:**
   - **Yuboruvchi:** Kompaniya nomi
   - **Qabul qiluvchi:** Kompaniya nomi

   **Poyezd Ma'lumotlari:**
   - **Vagon raqami:** Masalan: `12345678`
   - **Otpravka raqami:** Masalan: `OTP-2024-001`

   **Ariza Sanasi:**
   - Kalendar'dan tanlang

   **Og'irlik Ma'lumotlari:**
   - **Faktik ves:** Kilogrammda (kg)
   - **Yaxlitlangan ves:** Kilogrammda (kg)
   - Raqamlar avtomatik formatlanadi: `25000` → `25 000`

   **Yog'och Lot:**
   - Ro'yxatdan lot tanlang

   **Status:**
   - Kutilmoqda
   - Yo'lda
   - Yetib keldi
   - Tugatildi

4. **"Saqlash" tugmasini bosing**

---

### 💰 Kassa

#### Yangi Tranzaksiya Qo'shish

1. **Sidebar'dan "Kassa" ni bosing**
2. **"Yangi Tranzaksiya" tugmasini bosing**
3. **Formani to'ldiring:**

   **Tranzaksiya Turi:**
   - **Otpr:** Jo'natish xarajatlari
   - **Prixod:** Umumiy kirim
   - **Klent Prixod:** Mijozdan tushum
   - **Rasxod:** Chiqim/xarajat

   **Summa va Valyuta:**
   - **Summa:** Raqamni kiriting
     - Avtomatik formatlanadi: `1000000` → `1 000 000`
     - Vergul bilan ham yozish mumkin: `1000000.50`
   - **Valyuta:** USD, RUB yoki UZS

   **Tavsif:**
   - Tranzaksiya haqida batafsil ma'lumot
   - Masalan: "Yog'och sotuvidan tushum"

   **Sana:**
   - Kalendar'dan tanlang

4. **"Saqlash" tugmasini bosing**

#### Balansni Ko'rish

Sahifaning yuqori qismida har bir valyuta uchun:
- **Daromad:** Barcha kirimlar yig'indisi
- **Xarajat:** Barcha chiqimlar yig'indisi
- **Sof Foyda:** Daromad - Xarajat

---

### 💱 Valyuta Kurslari

⚠️ **Faqat admin foydalanuvchi uchun**

#### Kursni Yangilash

1. **Sidebar'dan "Valyuta Kurslari" ni bosing**
2. **"Kurs Yangilash" tugmasini bosing**
3. **Formani to'ldiring:**

   **Valyuta:**
   - USD (Dollar)
   - RUB (Rubl)

   **Kurs:**
   - 1 valyuta = ? UZS
   - Masalan: `12500` (1 USD = 12 500 UZS)
   - Raqam avtomatik formatlanadi

4. **"Saqlash" tugmasini bosing**

#### Kurs Tarixi

- Barcha o'zgarishlar tarixi ko'rsatiladi
- Har bir o'zgarish uchun:
  - Valyuta
  - Kurs
  - Oxirgi yangilanish vaqti
  - Kim yangilagan

---

### 📊 Hisobotlar

⚠️ **Faqat admin foydalanuvchi uchun**

#### Hisobotlarni Ko'rish

1. **Sidebar'dan "Hisobotlar" ni bosing**
2. **Filtrlarni sozlang:**

   **Sana Oralig'i:**
   - Boshlanish sanasi
   - Tugash sanasi

   **Valyuta:**
   - Barcha valyutalar
   - USD
   - RUB
   - UZS

3. **Hisobotlar avtomatik yangilanadi**

#### Mavjud Hisobotlar

**Foyda/Zarar Hisoboti:**
- Har bir valyuta uchun:
  - Daromad
  - Xarajat
  - Sof foyda/zarar

**Yog'och Lotlari Statistikasi:**
- Status bo'yicha:
  - Lotlar soni
  - Jami kub hajmi (m³)
  - Jami og'irlik (tonna)

**Transport Statistikasi:**
- Status bo'yicha transport soni

**Kassa Statistikasi:**
- Tranzaksiya turi va valyuta bo'yicha:
  - Jami summa
  - Tranzaksiyalar soni

---

## Raqam Formatlash

Tizimda barcha raqamlar professional formatda ko'rsatiladi:

### Kirish Paytida

Raqamni oddiy yozing:
```
1000000
```

### Ko'rinishi

Avtomatik formatlanadi:
```
1 000 000
```

### Valyuta Bilan

```
1 000 000 so'm
12 500 $
150 ₽
```

### Hajm va Og'irlik

```
2.67 m³
1.74 t
```

---

## Hisob-kitoblar

### Yog'och Hajmi

**Formula:**
```
Kub hajmi = (qalinlik × eni × uzunlik) ÷ 1,000,000 × soni
```

**Misol:**
```
Qalinlik: 31 mm
Eni: 125 mm
Uzunlik: 6 m
Soni: 115 dona

Bitta dona = (31 × 125 × 6) ÷ 1,000,000 = 0.02325 m³
Jami = 0.02325 × 115 = 2.67 m³
```

### Og'irlik

**Formula:**
```
Og'irlik = Kub hajmi × Zichlik
```

**Misol:**
```
Kub hajmi: 2.67 m³
Zichlik (Qayin): 0.65 t/m³

Og'irlik = 2.67 × 0.65 = 1.74 t
```

### 1 m³ da Nechta Dona

**Formula:**
```
Dona soni = 1 ÷ (bitta dona hajmi)
```

**Misol:**
```
Bitta dona: 0.02325 m³

1 m³ da = 1 ÷ 0.02325 = 43 dona
```

---

## Tez-tez So'raladigan Savollar

### Parolni Qanday O'zgartirish Mumkin?

Hozircha faqat database orqali. Keyingi versiyada UI qo'shiladi.

### Foydalanuvchi Qo'shish Mumkinmi?

Hozircha faqat bitta admin foydalanuvchi. Keyingi versiyada ko'p foydalanuvchi qo'llab-quvvatlanadi.

### Ma'lumotlar Qayerda Saqlanadi?

MongoDB database'da. Backup olish tavsiya etiladi.

### Internetga Chiqarish Mumkinmi?

Ha, lekin:
1. Production build qiling
2. HTTPS sozlang
3. Parolni o'zgartiring
4. Environment variables ni to'g'ri sozlang
5. Firewall sozlang

### Raqamlar Noto'g'ri Ko'rsatilsa?

1. Browser cache ni tozalang
2. Sahifani yangilang (F5)
3. Agar muammo davom etsa, server'ni qayta ishga tushiring

### Transport Faqat Poyezdmi?

Ha, loyiha talabiga ko'ra faqat poyezd transport turi qo'llab-quvvatlanadi.

---

## Maslahatlar

### ✅ Yaxshi Amaliyotlar

1. **Muntazam Backup:**
   - Har kuni database backup oling
   - Muhim ma'lumotlarni export qiling

2. **Aniq Lot Kodlari:**
   - Tushunarli va noyob kodlar ishlating
   - Masalan: `LOT-2024-001`, `LOT-2024-002`

3. **To'liq Tavsif:**
   - Tranzaksiyalarga batafsil tavsif yozing
   - Keyinchalik qidirish oson bo'ladi

4. **Muntazam Kurs Yangilash:**
   - Valyuta kurslarini har kuni yangilang
   - To'g'ri hisob-kitob uchun muhim

5. **Status Yangilash:**
   - Lot va transport statuslarini o'z vaqtida yangilang
   - Kuzatuv oson bo'ladi

### ⚠️ Ehtiyot Bo'lish Kerak

1. **Valyuta Kursi:**
   - Kursni o'zgartirishdan oldin o'ylab ko'ring
   - Barcha hisob-kitoblarga ta'sir qiladi

2. **Ma'lumot O'chirish:**
   - Hozircha o'chirish funksiyasi yo'q
   - Ehtiyot bo'ling ma'lumot kiritishda

3. **Raqamlar:**
   - Faqat to'g'ri raqamlar kiriting
   - Noto'g'ri ma'lumot hisob-kitoblarni buzadi

---

## Yordam

### Texnik Muammo Bo'lsa

1. **Server Ishlamasa:**
   ```bash
   # Serverlarni to'xtatish
   Ctrl + C
   
   # Qayta ishga tushirish
   npm run dev
   ```

2. **Sahifa Yuklanmasa:**
   - Browser cache ni tozalang
   - Boshqa browser'da sinab ko'ring
   - Internet ulanishini tekshiring

3. **Login Qila Olmasangiz:**
   - Username va parolni tekshiring
   - Caps Lock yoqilmaganini tekshiring
   - Server ishlab turganini tekshiring

### Qo'shimcha Yordam

Agar muammo hal bo'lmasa:
1. Terminal'dagi xato xabarlarini o'qing
2. Browser console'ni tekshiring (F12)
3. README.md faylidagi "Muammolarni Hal Qilish" bo'limini o'qing

---

## Xulosa

Bu tizim yog'och import/export biznesingizni to'liq raqamlashtiradi:

✅ Barcha ma'lumotlar bir joyda
✅ Avtomatik hisob-kitoblar
✅ Professional hisobotlar
✅ Oson foydalanish
✅ Zamonaviy dizayn

**Muvaffaqiyatli foydalaning! 🎉**

---

**Savollar bo'lsa, README.md faylini o'qing yoki dasturchi bilan bog'laning.**
