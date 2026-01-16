# 📊 TIZIM HISOB-KITOB TUSHUNTIRISH

## 🎯 ASOSIY PRINTSIP
Tizim barcha valyutalarni avtomatik ravishda **UZS (so'm)** ga o'tkazadi va hisob-kitoblarni so'mda olib boradi.

---

## 💱 VALYUTA KURSLARI

```
1 USD = 12,800 UZS
1 RUB = 130 UZS
```

---

## 📦 VAGON 1 - USD DA XARID

### Kiritilgan ma'lumotlar:
```
Oy: 2026-01
Jo'natish: Moskva → Toshkent
Yetib kelgan hajm: 100 m³
Yo'qotish: 5 m³
Valyuta: USD
Summa: 10,000 USD
Qo'shimcha xarajatlar: 5,000,000 UZS
```

### Avtomatik hisoblash:

**1. Mavjud hajm:**
```
Mavjud hajm = Yetib kelgan - Yo'qotish
Mavjud hajm = 100 - 5 = 95 m³
```

**2. Asosiy xarajat (USD → UZS):**
```
Asosiy xarajat = 10,000 USD × 12,800 = 128,000,000 UZS
```

**3. Jami xarajat:**
```
Jami xarajat = Asosiy xarajat + Qo'shimcha xarajatlar
Jami xarajat = 128,000,000 + 5,000,000 = 133,000,000 UZS
```

**4. Bir m³ ning tannarxi:**
```
Tannarx = Jami xarajat ÷ Mavjud hajm
Tannarx = 133,000,000 ÷ 95 = 1,400,000 UZS/m³
```

---

## 📦 VAGON 2 - RUB DA XARID

### Kiritilgan ma'lumotlar:
```
Oy: 2026-01
Jo'natish: Sankt-Peterburg → Samarqand
Yetib kelgan hajm: 80 m³
Yo'qotish: 3 m³
Valyuta: RUB
Summa: 500,000 RUB
Qo'shimcha xarajatlar: 3,000,000 UZS
```

### Avtomatik hisoblash:

**1. Mavjud hajm:**
```
Mavjud hajm = 80 - 3 = 77 m³
```

**2. Asosiy xarajat (RUB → UZS):**
```
Asosiy xarajat = 500,000 RUB × 130 = 65,000,000 UZS
```

**3. Jami xarajat:**
```
Jami xarajat = 65,000,000 + 3,000,000 = 68,000,000 UZS
```

**4. Bir m³ ning tannarxi:**
```
Tannarx = 68,000,000 ÷ 77 = 883,117 UZS/m³
```

---

## 💰 SOTUV 1 - UZS DA SOTUV (Vagon 1 dan)

### Kiritilgan ma'lumotlar:
```
Vagon: VAG-2026-001
Mijoz: Alisher Karimov
Jo'natilgan hajm: 50 m³
Mijoz yo'qotishi: 2 m³
Valyuta: UZS
Narx (m³ uchun): 1,500,000 UZS
To'lov: 30,000,000 UZS
```

### Avtomatik hisoblash:

**1. Qabul qilingan hajm:**
```
Qabul qilingan = Jo'natilgan - Yo'qotish
Qabul qilingan = 50 - 2 = 48 m³
```

**2. Jami narx (UZS da):**
```
Jami narx = Qabul qilingan × Narx
Jami narx = 48 × 1,500,000 = 72,000,000 UZS
```

**3. Qarz:**
```
Qarz = Jami narx - To'lov
Qarz = 72,000,000 - 30,000,000 = 42,000,000 UZS
```

**4. Vagon yangilanishi:**
```
Vagon sotilgan hajm: 50 m³
Vagon qolgan hajm: 95 - 50 = 45 m³
Vagon daromadi: +72,000,000 UZS
```

**5. Mijoz yangilanishi:**
```
Mijoz qabul qilgan: 48 m³
Mijoz qarzi: +72,000,000 UZS
Mijoz to'lagan: +30,000,000 UZS
```

---

## 💰 SOTUV 2 - USD DA SOTUV (Vagon 2 dan)

### Kiritilgan ma'lumotlar:
```
Vagon: VAG-2026-002
Mijoz: Alisher Karimov
Jo'natilgan hajm: 30 m³
Mijoz yo'qotishi: 1 m³
Valyuta: USD
Narx (m³ uchun): 120 USD
To'lov: 20,000,000 UZS
```

### Avtomatik hisoblash:

**1. Qabul qilingan hajm:**
```
Qabul qilingan = 30 - 1 = 29 m³
```

**2. Jami narx (USD da):**
```
Jami narx (USD) = 29 × 120 = 3,480 USD
```

**3. Jami narx (UZS ga o'tkazish):**
```
Jami narx (UZS) = 3,480 USD × 12,800 = 44,544,000 UZS
```

**4. Qarz:**
```
Qarz = 44,544,000 - 20,000,000 = 24,544,000 UZS
```

**5. Vagon yangilanishi:**
```
Vagon sotilgan hajm: 30 m³
Vagon qolgan hajm: 77 - 30 = 47 m³
Vagon daromadi: +44,544,000 UZS
```

**6. Mijoz yangilanishi:**
```
Mijoz qabul qilgan: +29 m³ (jami 48 + 29 = 77 m³)
Mijoz qarzi: +44,544,000 UZS (jami 72,000,000 + 44,544,000 = 116,544,000 UZS)
Mijoz to'lagan: +20,000,000 UZS (jami 30,000,000 + 20,000,000 = 50,000,000 UZS)
```

---

## 💳 KASSA - TO'LOV QABUL QILISH

### Kiritilgan ma'lumotlar:
```
Mijoz: Alisher Karimov
Sotuv: Birinchi sotuv (VAG-2026-001)
Summa: 10,000,000 UZS
```

### Avtomatik hisoblash:

**1. Sotuv 1 qarzi yangilanishi:**
```
Eski qarz: 42,000,000 UZS
To'lov: -10,000,000 UZS
Yangi qarz: 32,000,000 UZS
```

**2. Mijoz yangilanishi:**
```
Eski jami qarz: 116,544,000 UZS
To'lov: -10,000,000 UZS
Yangi jami qarz: 106,544,000 UZS

Eski jami to'langan: 50,000,000 UZS
To'lov: +10,000,000 UZS
Yangi jami to'langan: 60,000,000 UZS
```

**3. Cash tranzaksiya yaratilishi:**
```
Turi: client_payment
Mijoz: Alisher Karimov
Sotuv: VAG-2026-001
Summa: 10,000,000 UZS
Valyuta: UZS
```

---

## 📈 YAKUNIY NATIJALAR

### Vagon 1 (VAG-2026-001):
```
Xarajat: 133,000,000 UZS
Daromad: 72,000,000 UZS
Foyda: 72,000,000 - 133,000,000 = -61,000,000 UZS (zarar, chunki hali to'liq sotilmagan)
Qolgan hajm: 45 m³
```

### Vagon 2 (VAG-2026-002):
```
Xarajat: 68,000,000 UZS
Daromad: 44,544,000 UZS
Foyda: 44,544,000 - 68,000,000 = -23,456,000 UZS (zarar, chunki hali to'liq sotilmagan)
Qolgan hajm: 47 m³
```

### Mijoz (Alisher Karimov):
```
Jami qabul qilgan: 77 m³
Jami qarz: 106,544,000 UZS
Jami to'lagan: 60,000,000 UZS
Qolgan qarz: 106,544,000 - 60,000,000 = 46,544,000 UZS
```

### Kassa:
```
Kirim (mijoz to'lovlari): 60,000,000 UZS
Chiqim: 0 UZS
Balans: 60,000,000 UZS
```

---

## 🔑 MUHIM QOIDALAR

1. **Valyuta konvertatsiyasi**: Barcha valyutalar avtomatik UZS ga o'tkaziladi
2. **Yo'qotish hisobi**: Faqat qabul qilingan hajm uchun to'lov olinadi
3. **Qarz hisobi**: Jami narx - To'langan = Qarz
4. **Vagon foyda**: Daromad - Xarajat = Foyda (to'liq sotilgandan keyin aniq bo'ladi)
5. **Mijoz qarzi**: Barcha sotuvlar bo'yicha jami qarz - Jami to'lovlar

---

## 📝 COPY QILISH UCHUN TEST MA'LUMOTLARI

### Valyuta kurslari:
```
USD: 12800
RUB: 130
```

### Mijoz:
```
Ism: Alisher Karimov
Telefon: +998901234567
Manzil: Toshkent, Chilonzor
```
        
### Vagon 1:
```
Oy: 2026-01
Jo'natish: Moskva
Qabul: Toshkent
Hajm: 100
Yo'qotish: 5
Valyuta: USD
Summa: 10000
Qo'shimcha: 5000000
```

### Vagon 2:
```
Oy: 2026-01
Jo'natish: Sankt-Peterburg
Qabul: Samarqand
Hajm: 80
Yo'qotish: 3
Valyuta: RUB
Summa: 500000
Qo'shimcha: 3000000
```

### Sotuv 1:
```
Vagon: VAG-2026-001
Mijoz: Alisher Karimov
Hajm: 50
Yo'qotish: 2
Valyuta: UZS
Narx: 1500000
To'lov: 30000000
```

### Sotuv 2:
```
Vagon: VAG-2026-002
Mijoz: Alisher Karimov
Hajm: 30
Yo'qotish: 1
Valyuta: USD
Narx: 120
To'lov: 20000000
```

### Kassa to'lov:
```
Mijoz: Alisher Karimov
Sotuv: Birinchi sotuv
Summa: 10000000
```
