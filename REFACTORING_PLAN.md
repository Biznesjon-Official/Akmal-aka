# 🔧 TIZIM REFACTORING REJASI

## ✅ STEP 1: SOFT DELETE (Arxivlash)

### Barcha modellarga qo'shiladi:
```javascript
isDeleted: { type: Boolean, default: false },
deletedAt: Date,
deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
deleteReason: String
```

### Query middleware:
```javascript
schema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});
```

---

## ✅ STEP 2: AUDIT LOG

### Yangi model: `AuditLog.js`
```javascript
{
  action: 'create' | 'update' | 'delete' | 'restore',
  model: 'Wood' | 'Purchase' | 'Sale' | 'Expense' | 'Transport' | 'Kassa',
  documentId: ObjectId,
  changes: {
    before: Object,
    after: Object
  },
  user: ObjectId,
  ipAddress: String,
  userAgent: String,
  timestamp: Date
}
```

---

## ✅ STEP 3: MONGODB TRANSACTIONS

### Xarid qo'shishda:
```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 1. Purchase yaratish
  const purchase = await Purchase.create([data], { session });
  
  // 2. Wood'ni yangilash
  await Wood.updateOne(
    { _id: woodLotId },
    { 
      $inc: { jami_xarid: purchase.jamiUZS },
      status: 'xarid_qilindi'
    },
    { session }
  );
  
  // 3. Audit log
  await AuditLog.create([{
    action: 'create',
    model: 'Purchase',
    documentId: purchase._id,
    user: userId
  }], { session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## ✅ STEP 4: LOT MODELDAN MOLIYA OLIB TASHLASH

### Wood model - FAQAT YUK:
```javascript
{
  lotCode, qalinlik, eni, uzunlik,
  kubHajmi, soni, tonna, status,
  yogochZichligi, izoh, yaratuvchi
}
// ❌ jami_xarid, jami_sotuv, jami_xarajat, sof_foyda - OLIB TASHLANADI
```

### Yangi endpoint: `/wood/:id/financial`
```javascript
GET /wood/:id/financial
→ {
  xarid: sum(purchases.jamiUZS),
  sotuv: sum(sales.jamiUZS),
  xarajat: sum(expenses.summaUZS),
  foyda: sotuv - xarid - xarajat,
  foydaFoizi: (foyda / xarid) * 100
}
```

---

## ✅ STEP 5: QARZDORLIK TIZIMI

### Yangi model: `Transaction.js`
```javascript
{
  type: 'debit' | 'credit',  // debit = qarz, credit = to'lov
  amount: Number,
  currency: String,
  party: {
    type: 'supplier' | 'customer',
    id: ObjectId,
    name: String
  },
  woodLot: ObjectId,
  relatedDocument: {
    model: 'Purchase' | 'Sale',
    id: ObjectId
  },
  description: String,
  paymentMethod: 'cash' | 'bank' | 'card',
  createdBy: ObjectId,
  createdAt: Date
}
```

### Qarzdorlik hisoblash:
```javascript
GET /transactions/balance/:partyId
→ {
  totalDebit: sum(debits),
  totalCredit: sum(credits),
  balance: totalCredit - totalDebit,
  currency: 'UZS'
}
```

---

## ✅ STEP 6: BACKEND HISOB-KITOB

### Yangi endpoint: `/calculate`
```javascript
POST /purchase/calculate
{
  kubHajmi: 30,
  birlikNarxi: 150,
  valyuta: 'RUB',
  valyutaKursi: 130
}
→ {
  jamiSumma: 4500,  // 30 * 150
  jamiUZS: 585000,  // 4500 * 130
  breakdown: {
    kubHajmi: 30,
    birlikNarxi: 150,
    valyutaKursi: 130
  }
}
```

---

## 📊 IMPLEMENTATION PRIORITY

1. **KRITIK** (Darhol):
   - ✅ Soft delete - BAJARILDI
   - ✅ MongoDB transactions - BAJARILDI
   - ✅ Audit log - BAJARILDI

2. **MUHIM** (1 hafta):
   - 🔄 Lot modeldan moliya olib tashlash - KEYINGI QADAM
   - 🔄 Backend hisob-kitob - KEYINGI QADAM

3. **KELAJAK** (2 hafta):
   - ⏳ Qarzdorlik tizimi
   - ⏳ Snapshot hisobotlar

---

## ✅ BAJARILGAN ISHLAR (2026-01-14)

### 1. MongoDB Transactions - TUGALLANDI ✅
Barcha CRUD operatsiyalar uchun transaction qo'shildi:
- ✅ Purchase: CREATE, UPDATE, DELETE
- ✅ Sale: CREATE, UPDATE, DELETE
- ✅ Expense: CREATE, UPDATE, DELETE
- ✅ Wood: UPDATE, DELETE
- ✅ Transport: CREATE, UPDATE, DELETE
- ✅ Kassa: CREATE, UPDATE, DELETE

### 2. Soft Delete - TUGALLANDI ✅
Barcha modellarda soft delete ishlaydi:
- ✅ isDeleted, deletedAt, deletedBy, deleteReason fieldlari
- ✅ Query middleware avtomatik filtrlash
- ✅ Hech qanday ma'lumot fizik o'chirilmaydi

### 3. Audit Log - TUGALLANDI ✅
Barcha operatsiyalar loglanadi:
- ✅ CREATE, UPDATE, DELETE operatsiyalari
- ✅ Before/After holatlar saqlanadi
- ✅ User, IP, timestamp ma'lumotlari

### 4. Transaction Rollback - TUGALLANDI ✅
Xato bo'lsa avtomatik rollback:
- ✅ session.abortTransaction() xato holatida
- ✅ session.endSession() finally blockda
- ✅ Ma'lumotlar izchilligi kafolatlanadi

---

## 🔄 KEYINGI QADAMLAR

### 1. Lot modeldan moliya olib tashlash
```javascript
// Wood model - FAQAT YUK:
{
  lotCode, qalinlik, eni, uzunlik,
  kubHajmi, soni, tonna, status,
  yogochZichligi, izoh, yaratuvchi
}
// ❌ jami_xarid, jami_sotuv, jami_xarajat, sof_foyda - OLIB TASHLANADI
```

### 2. Yangi endpoint: `/wood/:id/financial`
```javascript
GET /wood/:id/financial
→ {
  xarid: sum(purchases.jamiUZS),
  sotuv: sum(sales.jamiUZS),
  xarajat: sum(expenses.summaUZS),
  foyda: sotuv - xarid - xarajat,
  foydaFoizi: (foyda / xarid) * 100
}
```

### 3. Backend hisob-kitob endpoint
```javascript
POST /purchase/calculate
{
  kubHajmi: 30,
  birlikNarxi: 150,
  valyuta: 'RUB',
  valyutaKursi: 130
}
→ {
  jamiSumma: 4500,
  jamiUZS: 585000,
  breakdown: { ... }
}
```

---

## 🚀 MIGRATION STRATEGIYASI

### 1. Yangi fieldlar qo'shish (backward compatible)
```bash
# Barcha mavjud ma'lumotlarga isDeleted: false qo'shish
db.woods.updateMany({}, { $set: { isDeleted: false } })
db.purchases.updateMany({}, { $set: { isDeleted: false } })
db.sales.updateMany({}, { $set: { isDeleted: false } })
```

### 2. Eski API'lar ishlashda davom etadi
- Yangi fieldlar optional
- Eski query'lar buzilmaydi

### 3. Bosqichma-bosqich o'tish
- Avval backend'ni deploy qilish
- Keyin frontend'ni yangilash
- Oxirida eski code'ni tozalash

---

## ⚠️ XAVFSIZLIK

### Backup strategiyasi:
```bash
# Har kuni avtomatik backup
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)
```

### Rollback rejasi:
- Har bir migration'dan oldin backup
- Git tag yaratish
- Tez rollback imkoniyati

---

## 📝 TESTING

### Unit tests:
- Soft delete middleware
- Transaction rollback
- Audit log yaratish

### Integration tests:
- Purchase + Wood update (transaction)
- Delete + Restore
- Qarzdorlik hisoblash

### Load tests:
- 1000+ lot bilan ishlash
- Concurrent transactions
- Report generation

---

## 🎯 SUCCESS CRITERIA

✅ Hech qanday ma'lumot yo'qolmaydi
✅ Barcha o'zgarishlar audit log'da
✅ Transaction'lar atomic
✅ Qarzdorlik avtomatik hisoblanadi
✅ Performance yaxshilanadi
✅ Code maintainable bo'ladi

---

**Tayyorlagan:** Kira
**Sana:** 2026-01-14
**Status:** READY TO IMPLEMENT
