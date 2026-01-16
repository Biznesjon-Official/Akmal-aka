# 🎯 TO'LIQ TEST VAZIYATI

## Maqsad
Yangi arxitekturani to'liq test qilish:
- Vagon va lotlar yaratish
- Xarajatlar qo'shish (bir xil tur qayta qo'shilganda yangilanadi)
- Sotuvlar qilish (bir mijozga qayta sotilganda yangilanadi)
- Kassa va balanslarni tekshirish

---

## 🚀 BOSHLASH

### 1. Serverlar ishga tushirilgan
```bash
Backend: http://localhost:5002 ✅
Frontend: http://localhost:3000 ✅
```

### 2. Login
```
Username: admin
Password: admin123
```

---

## 📝 TEST KETMA-KETLIGI

### QADAM 1: Valyuta Kurslarini Belgilash

**Sahifa:** `/exchange-rates`

1. **USD kursi qo'shish:**
   - Valyuta: USD
   - Kurs: 12500 (1 USD = 12500 so'm)
   - Saqlash

2. **RUB kursi qo'shish:**
   - Valyuta: RUB
   - Kurs: 130 (1 RUB = 130 so'm)
   - Saqlash

**Kutilayotgan natija:**
- ✅ Ikkala kurs ko'rsatiladi
- ✅ UZS so'ralmaydi (faqat USD va RUB)

---

### QADAM 2: Mijoz Yaratish

**Sahifa:** `/client`

**Mijoz 1:**
- Ism: Alisher Karimov
- Telefon: +998901234567
- Manzil: Toshkent, Chilonzor

**Mijoz 2:**
- Ism: Bobur Rahimov
- Telefon: +998907654321
- Manzil: Samarqand

**Kutilayotgan natija:**
- ✅ 2 ta mijoz yaratildi

---

### QADAM 3: Vagon va Lotlar Yaratish

**Sahifa:** `/vagon`

**Vagon ma'lumotlari:**
- Vagon kodi: V-2026-001
- Oy: 2026-01
- Jo'natish joyi: Rossiya, Moskva
- Qabul qilish joyi: O'zbekiston, Toshkent

**Lot 1 (USD):**
- Qalinlik: 31 mm
- Eni: 125 mm
- Uzunlik: 6 m
- Soni: 115 dona
- Valyuta: USD
- Narx: 10000

**Lot 2 (RUB):**
- Qalinlik: 31 mm
- Eni: 150 mm
- Uzunlik: 6 m
- Soni: 688 dona
- Valyuta: RUB
- Narx: 500000

**Lot 3 (USD):**
- Qalinlik: 31 mm
- Eni: 175 mm
- Uzunlik: 6 m
- Soni: 203 dona
- Valyuta: USD
- Narx: 15000

**Kutilayotgan natija:**
- ✅ Vagon yaratildi
- ✅ 3 ta lot qo'shildi
- ✅ Jami hajm avtomatik hisoblanadi (taxminan 37.6 m³)
- ✅ USD xarid: $25,000
- ✅ RUB xarid: ₽500,000

---

### QADAM 4: Xarajatlar Qo'shish

**Sahifa:** `/expense`

**Xarajat 1 - Transport (USD):**
- Vagon: V-2026-001
- Lot: Umumiy (barcha lotlar)
- Turi: Transport
- Valyuta: USD
- Summa: 2000
- Tavsif: Rossiyadan transport

**Xarajat 2 - Bojxona (USD):**
- Vagon: V-2026-001
- Lot: Umumiy
- Turi: Bojxona
- Valyuta: USD
- Summa: 1500
- Tavsif: Bojxona to'lovi

**Xarajat 3 - Bojxona QAYTA (USD):**
- Vagon: V-2026-001
- Lot: Umumiy
- Turi: Bojxona
- Valyuta: USD
- Summa: 500
- Tavsif: Qo'shimcha bojxona

**TEST:** Bojxona xarajati 2 marta qo'shilganda yangi yozuv yaratilmasligi kerak!

**Xarajat 4 - Ishchilar (RUB):**
- Vagon: V-2026-001
- Lot: 31×150×6 (RUB lot)
- Turi: Ishchilar
- Valyuta: RUB
- Summa: 50000
- Tavsif: Ishchilar maoshi

**Kutilayotgan natija:**
- ✅ Jami 3 ta xarajat yozuvi (Bojxona bitta, lekin summa 2000)
- ✅ USD xarajat: $4,000 (Transport 2000 + Bojxona 2000)
- ✅ RUB xarajat: ₽50,000
- ✅ Xarajatlar jadvalida ko'rsatiladi

---

### QADAM 5: Sotuv Qilish

**Sahifa:** `/vagon-sale`

**Sotuv 1 - Alisher Karimov (USD lot):**
- Vagon: V-2026-001
- Lot: 31×125×6 (USD)
- Mijoz: Alisher Karimov
- Soni: 50 dona
- Narx (m³): 600 USD
- To'langan: 500 USD

**Sotuv 2 - Alisher Karimov QAYTA (USD lot):**
- Vagon: V-2026-001
- Lot: 31×125×6 (USD)
- Mijoz: Alisher Karimov
- Soni: 30 dona
- Narx (m³): 600 USD
- To'langan: 300 USD

**TEST:** Bir xil mijozga qayta sotilganda yangi yozuv yaratilmasligi kerak!

**Sotuv 3 - Bobur Rahimov (RUB lot):**
- Vagon: V-2026-001
- Lot: 31×150×6 (RUB)
- Mijoz: Bobur Rahimov
- Soni: 300 dona
- Narx (m³): 30000 RUB
- To'langan: 200000 RUB

**Kutilayotgan natija:**
- ✅ Jami 2 ta sotuv yozuvi (Alisher bitta, lekin hajm va qarz yangilangan)
- ✅ Alisher: 80 dona sotilgan, qarz bor
- ✅ Bobur: 300 dona sotilgan, qarz bor
- ✅ Lotlarning qolgan hajmi kamaydi

---

### QADAM 6: Kassa Tekshirish

**Sahifa:** `/cash`

**Kutilayotgan natija:**
- ✅ USD balans: $800 (500 + 300 to'lov)
- ✅ RUB balans: ₽200,000
- ✅ Qarzdor mijozlar ko'rsatiladi:
  - Alisher Karimov: USD qarz
  - Bobur Rahimov: RUB qarz

**To'lov qabul qilish:**
- Mijoz: Alisher Karimov
- Sotuv: V-2026-001 sotuvini tanlang
- Summa: 200 USD

**Kutilayotgan natija:**
- ✅ USD balans: $1,000
- ✅ Alisher qarz kamaydi

---

### QADAM 7: Vagon Holatini Tekshirish

**Sahifa:** `/vagon`

**V-2026-001 vagon:**

**Lotlar:**
1. 31×125×6 - 115 dona
   - Sotilgan: 80 dona
   - Qolgan: 35 dona
   - USD

2. 31×150×6 - 688 dona
   - Sotilgan: 300 dona
   - Qolgan: 388 dona
   - RUB

3. 31×175×6 - 203 dona
   - Sotilgan: 0 dona
   - Qolgan: 203 dona
   - USD

**Moliyaviy:**
- USD Xarid: $25,000
- USD Xarajat: $4,000
- USD Sotuv: ~$1,000 (80 dona × hajm × narx)
- USD Foyda: Minus (hali to'liq sotilmagan)

- RUB Xarid: ₽500,000
- RUB Xarajat: ₽50,000
- RUB Sotuv: ~₽250,000 (300 dona × hajm × narx)
- RUB Foyda: Minus (hali to'liq sotilmagan)

---

## ✅ TEKSHIRISH NATIJALARI

### 1. Xarajatlar
- [ ] Bir xil xarajat turi qayta qo'shilganda yangi yozuv yaratilmadi
- [ ] Summa to'g'ri qo'shildi
- [ ] Valyuta bo'yicha alohida ko'rsatildi

### 2. Sotuvlar
- [ ] Bir mijozga qayta sotilganda yangi yozuv yaratilmadi
- [ ] Hajm va qarz to'g'ri yangilandi
- [ ] Valyuta bo'yicha alohida ishladi

### 3. Kassa
- [ ] USD va RUB balanslar alohida
- [ ] To'lovlar to'g'ri qabul qilindi
- [ ] Qarzlar to'g'ri ko'rsatildi

### 4. Vagon
- [ ] Lotlar to'g'ri yaratildi
- [ ] Hajmlar avtomatik hisoblanadi
- [ ] Foyda USD va RUB da alohida

---

## 🐛 AGAR XATOLIK BO'LSA

Quyidagi ma'lumotlarni yuboring:

1. **Qaysi qadamda xatolik?**
2. **Xatolik xabari nima?**
3. **Screenshot (agar mumkin bo'lsa)**
4. **Kutilgan natija vs Haqiqiy natija**

---

## 📊 KUTILAYOTGAN YAKUNIY NATIJALAR

**Vagonlar:** 1 ta (V-2026-001)
**Lotlar:** 3 ta
**Xarajatlar:** 3 ta yozuv (Bojxona bitta)
**Sotuvlar:** 2 ta yozuv (Alisher bitta)
**Mijozlar:** 2 ta
**Kassa USD:** ~$1,000
**Kassa RUB:** ~₽200,000

---

**Sana:** 2026-01-16
**Versiya:** Yangi Arxitektura v2.0
**Status:** ✅ TEST UCHUN TAYYOR
