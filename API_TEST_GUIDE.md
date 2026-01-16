# 🧪 API Test Qo'llanmasi

## 🔐 Autentifikatsiya

Barcha API so'rovlar uchun JWT token kerak.

### Login
```bash
POST http://localhost:5002/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

Keyingi barcha so'rovlarda header qo'shing:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 👥 Client API

### 1. Barcha mijozlar
```bash
GET http://localhost:5002/api/client
Authorization: Bearer YOUR_TOKEN
```

### 2. Yangi mijoz yaratish
```bash
POST http://localhost:5002/api/client
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Alisher Karimov",
  "phone": "+998901234567",
  "address": "Toshkent, Chilonzor",
  "notes": "Doimiy mijoz"
}
```

### 3. Mijoz ma'lumotlari
```bash
GET http://localhost:5002/api/client/CLIENT_ID
Authorization: Bearer YOUR_TOKEN
```

### 4. Mijoz statistikasi
```bash
GET http://localhost:5002/api/client/CLIENT_ID/stats
Authorization: Bearer YOUR_TOKEN
```

---

## 🚂 Vagon API

### 1. Barcha vagonlar
```bash
GET http://localhost:5002/api/vagon
Authorization: Bearer YOUR_TOKEN

# Filter bilan:
GET http://localhost:5002/api/vagon?status=warehouse
GET http://localhost:5002/api/vagon?month=2026-01
```

### 2. Yangi vagon yaratish
```bash
POST http://localhost:5002/api/vagon
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "month": "2026-01",
  "sending_place": "Rossiya, Moskva",
  "receiving_place": "O'zbekiston, Toshkent",
  "arrived_volume_m3": 100,
  "arrival_loss_m3": 5,
  "total_cost": 50000000,
  "notes": "Qarag'ay yog'ochi"
}

# Response:
{
  "vagonCode": "VAG-2026-001",
  "available_volume_m3": 95,
  "remaining_volume_m3": 95,
  ...
}
```

### 3. Vagon batafsil ma'lumotlari
```bash
GET http://localhost:5002/api/vagon/VAGON_ID/details
Authorization: Bearer YOUR_TOKEN

# Response:
{
  "vagon": { ... },
  "sales": [ ... ],
  "expenses": [ ... ],
  "summary": {
    "total_sales": 3,
    "total_clients": 2,
    "total_expenses": 5,
    "total_expense_amount": 5000000
  }
}
```

### 4. Mavjud hajm
```bash
GET http://localhost:5002/api/vagon/VAGON_ID/available
Authorization: Bearer YOUR_TOKEN

# Response:
{
  "available": 95,
  "sold": 0,
  "total": 95,
  "percentage": "0.00"
}
```

### 5. Vagon statistikasi
```bash
GET http://localhost:5002/api/vagon/VAGON_ID/stats
Authorization: Bearer YOUR_TOKEN
```

### 6. Vagonni yopish
```bash
POST http://localhost:5002/api/vagon/VAGON_ID/close
Authorization: Bearer YOUR_TOKEN
```

---

## 💰 VagonSale API

### 1. Barcha sotuvlar
```bash
GET http://localhost:5002/api/vagon-sale
Authorization: Bearer YOUR_TOKEN

# Filter bilan:
GET http://localhost:5002/api/vagon-sale?vagon=VAGON_ID
GET http://localhost:5002/api/vagon-sale?client=CLIENT_ID
GET http://localhost:5002/api/vagon-sale?status=pending
```

### 2. Yangi sotuv yaratish (ENG MUHIM!)
```bash
POST http://localhost:5002/api/vagon-sale
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "vagon": "VAGON_ID",
  "client": "CLIENT_ID",
  "sent_volume_m3": 30,
  "client_loss_m3": 2,
  "price_per_m3": 1000000,
  "paid_amount": 10000000,
  "notes": "Birinchi sotuv"
}

# Response:
{
  "vagon": "VAGON_ID",
  "client": "CLIENT_ID",
  "sent_volume_m3": 30,
  "client_loss_m3": 2,
  "accepted_volume_m3": 28,
  "price_per_m3": 1000000,
  "total_price": 28000000,
  "paid_amount": 10000000,
  "debt": 18000000,
  "status": "partial",
  ...
}
```

### 3. To'lov qilish (ENG MUHIM!)
```bash
POST http://localhost:5002/api/vagon-sale/SALE_ID/payment
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "amount": 5000000
}

# Response:
{
  "message": "To'lov qabul qilindi",
  "sale": { ... },
  "remaining_debt": 13000000
}
```

---

## 💵 Cash API

### 1. Barcha tranzaksiyalar
```bash
GET http://localhost:5002/api/cash
Authorization: Bearer YOUR_TOKEN

# Filter bilan:
GET http://localhost:5002/api/cash?type=client_payment
GET http://localhost:5002/api/cash?currency=USD
GET http://localhost:5002/api/cash?startDate=2026-01-01&endDate=2026-01-31
```

### 2. Umumiy balans
```bash
GET http://localhost:5002/api/cash/balance/total
Authorization: Bearer YOUR_TOKEN

# Response:
{
  "income": 50000000,
  "expense": 20000000,
  "balance": 30000000
}
```

### 3. Valyuta bo'yicha balans
```bash
GET http://localhost:5002/api/cash/balance/by-currency
Authorization: Bearer YOUR_TOKEN

# Response:
{
  "UZS": {
    "income": 50000000,
    "expense": 20000000,
    "balance": 30000000
  },
  "USD": {
    "income": 5000,
    "expense": 2000,
    "balance": 3000
  }
}
```

### 4. Mijoz to'lovi
```bash
POST http://localhost:5002/api/cash/client-payment
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "vagonSale": "SALE_ID",
  "amount": 5000000,
  "currency": "UZS",
  "description": "Naqd to'lov"
}
```

### 5. Xarajat
```bash
POST http://localhost:5002/api/cash/expense
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "expense": "EXPENSE_ID",
  "amount": 1000000,
  "currency": "UZS",
  "description": "Transport xarajati"
}
```

### 6. Boshlang'ich balans
```bash
POST http://localhost:5002/api/cash/initial-balance
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "amount": 10000000,
  "currency": "UZS",
  "description": "Boshlang'ich kapital"
}
```

### 7. Statistika
```bash
GET http://localhost:5002/api/cash/stats/summary?period=today
GET http://localhost:5002/api/cash/stats/summary?period=week
GET http://localhost:5002/api/cash/stats/summary?period=month
GET http://localhost:5002/api/cash/stats/summary?period=year
Authorization: Bearer YOUR_TOKEN

# Response:
{
  "period": "month",
  "income": 50000000,
  "expense": 20000000,
  "balance": 30000000,
  "transaction_count": 25
}
```

---

## 🧪 To'liq Test Ssenariysi

### 1-qadam: Mijozlar yaratish
```bash
POST /api/client
{
  "name": "Alisher Karimov",
  "phone": "+998901234567"
}

POST /api/client
{
  "name": "Bobur Rahimov",
  "phone": "+998901234568"
}

POST /api/client
{
  "name": "Sardor Toshmatov",
  "phone": "+998901234569"
}
```

### 2-qadam: Vagon yaratish
```bash
POST /api/vagon
{
  "month": "2026-01",
  "sending_place": "Rossiya, Moskva",
  "receiving_place": "O'zbekiston, Toshkent",
  "arrived_volume_m3": 100,
  "arrival_loss_m3": 5,
  "total_cost": 50000000
}

# Vagon ID ni saqlang: VAG-2026-001
```

### 3-qadam: Sotuvlar yaratish
```bash
# Alisher ga sotish
POST /api/vagon-sale
{
  "vagon": "VAG-2026-001_ID",
  "client": "ALISHER_ID",
  "sent_volume_m3": 30,
  "client_loss_m3": 2,
  "price_per_m3": 1000000,
  "paid_amount": 10000000
}

# Bobur ga sotish
POST /api/vagon-sale
{
  "vagon": "VAG-2026-001_ID",
  "client": "BOBUR_ID",
  "sent_volume_m3": 40,
  "client_loss_m3": 3,
  "price_per_m3": 1000000,
  "paid_amount": 15000000
}

# Sardor ga sotish
POST /api/vagon-sale
{
  "vagon": "VAG-2026-001_ID",
  "client": "SARDOR_ID",
  "sent_volume_m3": 25,
  "client_loss_m3": 1,
  "price_per_m3": 1000000,
  "paid_amount": 0
}
```

### 4-qadam: To'lovlar qilish
```bash
# Alisher to'lov qiladi
POST /api/vagon-sale/ALISHER_SALE_ID/payment
{
  "amount": 5000000
}

# Bobur to'lov qiladi
POST /api/vagon-sale/BOBUR_SALE_ID/payment
{
  "amount": 10000000
}
```

### 5-qadam: Balansni tekshirish
```bash
GET /api/cash/balance/total
GET /api/vagon/VAG-2026-001_ID/stats
GET /api/client/ALISHER_ID/stats
```

### 6-qadam: Vagon batafsil
```bash
GET /api/vagon/VAG-2026-001_ID/details

# Natija:
{
  "vagon": {
    "vagonCode": "VAG-2026-001",
    "arrived_volume_m3": 100,
    "arrival_loss_m3": 5,
    "available_volume_m3": 95,
    "sold_volume_m3": 95,
    "remaining_volume_m3": 0,
    "total_cost": 50000000,
    "total_revenue": 89000000,
    "net_profit": 39000000,
    "profit_percentage": "78.00"
  },
  "sales": [
    {
      "client": "Alisher Karimov",
      "sent_volume_m3": 30,
      "accepted_volume_m3": 28,
      "total_price": 28000000,
      "debt": 13000000
    },
    {
      "client": "Bobur Rahimov",
      "sent_volume_m3": 40,
      "accepted_volume_m3": 37,
      "total_price": 37000000,
      "debt": 12000000
    },
    {
      "client": "Sardor Toshmatov",
      "sent_volume_m3": 25,
      "accepted_volume_m3": 24,
      "total_price": 24000000,
      "debt": 24000000
    }
  ]
}
```

---

## 📊 Kutilgan Natijalar

### Vagon:
- Yetib kelgan: 100 m³
- Yo'qotish: 5 m³
- Mavjud: 95 m³
- Sotilgan: 95 m³ (30 + 40 + 25)
- Qolgan: 0 m³
- Xarajat: 50,000,000 so'm
- Daromad: 89,000,000 so'm (28M + 37M + 24M)
- Foyda: 39,000,000 so'm (78%)

### Mijozlar:
- Alisher: 28 m³, 28M so'm, 15M to'lagan, 13M qarz
- Bobur: 37 m³, 37M so'm, 25M to'lagan, 12M qarz
- Sardor: 24 m³, 24M so'm, 0 to'lagan, 24M qarz

### Kassa:
- Kirim: 40,000,000 so'm (15M + 25M + 0)
- Chiqim: 0 so'm
- Balans: 40,000,000 so'm

---

## 🔧 Postman Collection

Postman uchun collection yaratish:

1. Postman ochish
2. New Collection → "Vagon System API"
3. Variables qo'shish:
   - `base_url`: `http://localhost:5002`
   - `token`: `YOUR_TOKEN_HERE`
4. Har bir endpoint uchun request yaratish
5. Authorization: Bearer Token → `{{token}}`

---

## ✅ Test Checklist

- [ ] Login ishlaydi
- [ ] Client CRUD ishlaydi
- [ ] Vagon CRUD ishlaydi
- [ ] VagonSale yaratish ishlaydi
- [ ] Hajm avtomatik kamayadi
- [ ] To'lov qilish ishlaydi
- [ ] Qarz avtomatik kamayadi
- [ ] Cash tranzaksiyalar yaratiladi
- [ ] Balans to'g'ri hisoblanadi
- [ ] Foyda to'g'ri hisoblanadi
- [ ] Validatsiya ishlaydi (hajm, qarz)
- [ ] Soft delete ishlaydi

---

## 🎯 Xulosa

Barcha API endpointlar tayyor va test qilishga tayyor. Postman yoki curl orqali test qilishingiz mumkin.

Keyingi qadam: Frontend yaratish! 🚀
