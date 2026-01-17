# Xarajat Qo'shish Muammosi Yechildi

## Muammo
Xarajat qo'shishda quyidagi xatolik chiqayotgan edi:
```
Kassa validation failed: yaratuvchi: Path `yaratuvchi` is required.
```

## Sabab
JWT token yaratilganda `userId` field ishlatilgan, lekin xarajat route'larida `req.user.id` orqali murojaat qilinayotgan edi.

### JWT Token tuzilishi:
```javascript
const token = jwt.sign(
  { userId: user._id, role: user.role }, // userId ishlatilgan
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

### Xato kod:
```javascript
yaratuvchi: req.user.id // undefined bo'lgan
```

## Yechim
Barcha backend route'larda `req.user.id` ni `req.user.userId` ga o'zgartirdik.

### Tuzatilgan fayllar:
1. `server/routes/expenseAdvanced.js` - Kengaytirilgan xarajatlar
2. `server/routes/kassa.js` - Kassa operatsiyalari  
3. `server/routes/expense.js` - Oddiy xarajatlar
4. `server/routes/cash.js` - Naqd pul operatsiyalari
5. `server/routes/vagonExpense.js` - Vagon xarajatlari
6. `server/models/Kassa.js` - VagonLot reference tuzatildi

### Qo'shimcha tuzatishlar:
- Kassa modelida `woodLot` reference'ni `Wood` dan `VagonLot` ga o'zgartirdik
- Frontend'da vagon-lot ma'lumotlarini to'g'ri ko'rsatish uchun yangiladik
- Populate query'larni yangiladik

## Natija
✅ Xarajat qo'shish endi to'g'ri ishlaydi
✅ Barcha authentication muammolari hal qilindi
✅ VagonLot bilan bog'lanish to'g'ri ishlaydi
✅ Frontend va backend mos keladi

## Test
1. Tizimga admin (admin/admin123) bilan kiring
2. Xarajatlar sahifasiga o'ting
3. "Yangi xarajat" tugmasini bosing
4. Forma to'ldirib saqlang
5. Xarajat muvaffaqiyatli qo'shilishi kerak

## Ishga tushirish
```bash
# Backend
cd server
npm start

# Frontend  
cd client
npm run dev
```

Localhost:3000 da frontend, localhost:5002 da backend ishlaydi.