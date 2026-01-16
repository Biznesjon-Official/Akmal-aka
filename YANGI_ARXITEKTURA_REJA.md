# 🏗️ YANGI ARXITEKTURA REJASI

## 🎯 ASOSIY O'ZGARISHLAR

### 1. UZS NI O'CHIRISH ❌
- Faqat USD va RUB
- Kurs: 1 USD = X RUB (admin belgilaydi)

### 2. VAGON → LOT TIZIMI
- Bir vagon → ko'p lot (turli o'lchamlar)
- Har bir lot → o'z hajmi, narxi, valyutasi

### 3. XARAJATLAR ALOHIDA
- Sidebar da "Xarajatlar" bo'limi
- Har bir xarajat → vagon/lot ga bog'lanadi
- Valyuta tanlash (USD/RUB)

### 4. FOYDA VALYUTA BO'YICHA
- USD foyda = USD sotuv - USD xarajat
- RUB foyda = RUB sotuv - RUB xarajat

---

## 📊 YANGI MODEL STRUKTURASI

### 1. Vagon Model
```javascript
{
  vagonCode: "VAG-2026-001",
  month: "2026-01",
  sending_place: "Moskva",
  receiving_place: "Toshkent",
  
  // Jami ma'lumotlar (avtomatik)
  total_volume_m3: 22.29,
  total_loss_m3: 1.7,
  available_volume_m3: 20.59,
  
  // Valyuta bo'yicha xarajat (avtomatik)
  usd_total_cost: 10000,
  rub_total_cost: 500000,
  
  // Valyuta bo'yicha daromad (avtomatik)
  usd_total_revenue: 15000,
  rub_total_revenue: 600000,
  
  // Valyuta bo'yicha foyda (avtomatik)
  usd_profit: 5000,
  rub_profit: 100000,
  
  status: "warehouse"
}
```

### 2. VagonLot Model (YANGI!)
```javascript
{
  vagon: ObjectId("VAG-2026-001"),
  
  // O'lcham ma'lumotlari
  dimensions: "35×125×6 mm",
  quantity: 115,
  volume_m3: 3.01875,
  
  // Xarid
  purchase_currency: "USD",
  purchase_amount: 10000,
  
  // Yo'qotish
  loss_volume_m3: 0.2,
  available_volume_m3: 2.81875,  // avtomatik
  
  // Sotilgan (avtomatik)
  sold_volume_m3: 1.9,
  remaining_volume_m3: 0.91875,  // avtomatik
  
  // Daromad (avtomatik)
  total_revenue: 9500,
  
  // Foyda (avtomatik)
  profit: -500,  // 9500 - 10000
  
  notes: "..."
}
```

### 3. VagonExpense Model (YANGI!)
```javascript
{
  vagon: ObjectId("VAG-2026-001"),
  lot: ObjectId("lot_1"),  // ixtiyoriy
  
  expense_type: "Transport",
  currency: "USD",
  amount: 1000,
  
  description: "Yuk tashish",
  expense_date: Date,
  
  createdBy: ObjectId("admin")
}
```

### 4. VagonSale Model (YANGILASH)
```javascript
{
  vagon: ObjectId("VAG-2026-001"),
  lot: ObjectId("lot_1"),  // YANGI!
  client: ObjectId("client_1"),
  
  sent_volume_m3: 2.0,
  client_loss_m3: 0.1,
  accepted_volume_m3: 1.9,  // avtomatik
  
  sale_currency: "USD",  // lot dan olinadi
  price_per_m3: 5000,
  total_price: 9500,  // avtomatik
  
  paid_amount: 5000,
  debt: 4500,  // avtomatik
  
  status: "partial"
}
```

### 5. ExchangeRate Model (YANGILASH)
```javascript
{
  // UZS ni o'chirish
  base_currency: "USD",
  target_currency: "RUB",
  rate: 130,  // 1 USD = 130 RUB
  
  updatedBy: ObjectId("admin"),
  notes: "..."
}
```

---

## 🔄 HISOBLASH LOGIKASI

### Lot foyda:
```javascript
// 1. Lot xarajati
lot_cost = lot.purchase_amount + sum(expenses where lot_id = lot._id)

// 2. Lot tannarxi
cost_per_m3 = lot_cost / lot.volume_m3

// 3. Lot daromadi
lot_revenue = sum(sales where lot_id = lot._id)

// 4. Proporsional xarajat
sold_percentage = lot.sold_volume_m3 / lot.volume_m3
proportional_cost = lot_cost * sold_percentage

// 5. Lot foyda
lot_profit = lot_revenue - proportional_cost
```

### Vagon foyda:
```javascript
// USD
vagon.usd_profit = sum(lot.profit where lot.currency = "USD")

// RUB
vagon.rub_profit = sum(lot.profit where lot.currency = "RUB")
```

---

## 🎨 FRONTEND KO'RINISHI

### Vagon sahifasi:
```
┌─────────────────────────────────────────┐
│ VAG-2026-001              [Omborda]     │
│ 2026-01 | Moskva → Toshkent             │
├─────────────────────────────────────────┤
│ Jami: 22.29 m³ | Brak: 1.7 m³           │
│ Mavjud: 20.59 m³ | Sotilgan: 11.9 m³   │
├─────────────────────────────────────────┤
│ LOTLAR (2):                             │
│                                         │
│ 📦 35×125×6 mm (115 dona)               │
│    3.02 m³ | USD 10,000                 │
│    Foyda: +3,207 USD 🟢                 │
│                                         │
│ 📦 31×151×6 mm (688 dona)               │
│    19.27 m³ | RUB 500,000               │
│    Foyda: +40,520 RUB 🟢                │
├─────────────────────────────────────────┤
│ JAMI FOYDA:                             │
│   💵 USD: 3,207                         │
│   💶 RUB: 40,520                        │
└─────────────────────────────────────────┘

[Lot qo'shish] [Xarajat qo'shish] [Sotish]
```

### Xarajatlar sahifasi (YANGI):
```
┌─────────────────────────────────────────┐
│ 💰 Xarajatlar                           │
├─────────────────────────────────────────┤
│ [+ Xarajat qo'shish]                    │
├─────────────────────────────────────────┤
│ VAG-2026-001 | Transport               │
│ USD 1,000 | 15.01.2026                  │
│                                         │
│ VAG-2026-001 | Chegara                 │
│ USD 1,000 | 15.01.2026                  │
│                                         │
│ VAG-2026-001 | Lot 1 | Ishchi          │
│ RUB 50,000 | 16.01.2026                 │
└─────────────────────────────────────────┘
```

---

## 📝 BOSQICHLAR

### Bosqich 1: Backend modellar ✅
1. VagonLot model yaratish
2. VagonExpense model yaratish
3. Vagon modelni yangilash
4. VagonSale modelni yangilash
5. ExchangeRate modelni yangilash

### Bosqich 2: Backend routes ✅
1. /api/vagon-lot CRUD
2. /api/vagon-expense CRUD
3. /api/vagon yangilash
4. /api/vagon-sale yangilash

### Bosqich 3: Frontend ✅
1. Vagon sahifasini yangilash
2. Xarajatlar sahifasini yaratish
3. Sotuv sahifasini yangilash
4. Kassa sahifasini yangilash

### Bosqich 4: Test ✅
1. Ma'lumotlarni tozalash
2. Test ma'lumotlar kiritish
3. Hisob-kitoblarni tekshirish

---

## ⚠️ MUHIM ESLATMALAR

1. **UZS ni butunlay o'chirish** - barcha joyda
2. **Lot tizimi** - vagon ichida lotlar
3. **Xarajatlar alohida** - sidebar da
4. **Foyda valyuta bo'yicha** - USD va RUB alohida
5. **Kassa** - ikkala valyutada balans

---

## 🚀 KEYINGI QADAM

Hozir boshlaymizmi yoki hozirgi tizimni test qilib ko'ramizmi?

Agar boshlamoqchi bo'lsangiz, qaysi bosqichdan boshlaymiz?
