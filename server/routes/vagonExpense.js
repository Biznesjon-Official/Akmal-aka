const express = require('express');
const router = express.Router();
const VagonExpense = require('../models/VagonExpense');
const VagonLot = require('../models/VagonLot');
const Vagon = require('../models/Vagon');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Barcha xarajatlar
router.get('/', auth, async (req, res) => {
  try {
    const { vagon, lot } = req.query;
    
    const filter = { isDeleted: false };
    if (vagon) filter.vagon = vagon;
    if (lot) filter.lot = lot;
    
    const expenses = await VagonExpense.find(filter)
      .populate('vagon', 'vagonCode month')
      .populate('lot', 'dimensions')
      .populate('createdBy', 'username')
      .sort({ expense_date: -1 });
    
    res.json(expenses);
  } catch (error) {
    logger.error('VagonExpense list error:', error);
    res.status(500).json({ message: 'Xarajatlar ro\'yxatini olishda xatolik' });
  }
});

// Bitta xarajat ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await VagonExpense.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
      .populate('vagon')
      .populate('lot')
      .populate('createdBy', 'username');
    
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('VagonExpense get error:', error);
    res.status(500).json({ message: 'Xarajat ma\'lumotlarini olishda xatolik' });
  }
});

// Yangi xarajat qo'shish yoki mavjudini yangilash
router.post('/', auth, async (req, res) => {
  try {
    const {
      vagon,
      lot,
      expense_type,
      currency,
      amount,
      description,
      expense_date
    } = req.body;
    
    // Validatsiya
    if (!vagon || !expense_type || !currency || !amount) {
      return res.status(400).json({ 
        message: 'Barcha majburiy maydonlar to\'ldirilishi shart' 
      });
    }
    
    // Vagonni tekshirish
    const vagonDoc = await Vagon.findOne({ 
      _id: vagon, 
      isDeleted: false 
    });
    
    if (!vagonDoc) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    // Agar lot berilgan bo'lsa, tekshirish
    if (lot) {
      const lotDoc = await VagonLot.findOne({ 
        _id: lot, 
        vagon: vagon,
        isDeleted: false 
      });
      
      if (!lotDoc) {
        return res.status(404).json({ message: 'Lot topilmadi yoki vagon bilan mos kelmaydi' });
      }
    }
    
    // Bir xil xarajat turini topish
    // "boshqa" xarajatlar uchun description ham tekshiriladi
    const searchCriteria = {
      vagon,
      lot: lot || null,
      expense_type,
      currency,
      isDeleted: false
    };
    
    // "boshqa" xarajatlar uchun description ham qo'shish (har xil nomdagi xarajatlar alohida saqlanadi)
    if (expense_type === 'boshqa' || expense_type === 'other') {
      if (description) {
        searchCriteria.description = description;
      }
    }
    
    const existingExpense = await VagonExpense.findOne(searchCriteria);

    let expense;
    let isNewExpense = false;
    
    // Cash (Kassa) uchun expense_type moslash
    const Cash = require('../models/Cash');
    let cashExpenseType = 'firma_xarajatlari';
    if (expense_type === 'wood_purchase' || expense_type === 'yogoch_xaridi') {
      cashExpenseType = 'yogoch_sotib_olish';
    } else if (expense_type === 'uz_customs' || expense_type === 'uz_bojxona') {
      cashExpenseType = 'bojxona_nds';
    } else if (expense_type === 'kz_customs' || expense_type === 'kz_bojxona') {
      cashExpenseType = 'bojxona_nds';
    } else if (expense_type === 'transport') {
      cashExpenseType = 'transport_kz';
    } else if (expense_type === 'other' || expense_type === 'boshqa') {
      cashExpenseType = 'firma_xarajatlari';
    }

    const cashData = {
      type: 'expense',
      vagon: vagon,
      yogoch: lot || null,
      currency: 'USD', // TUZATILDI: Barcha chiqimlar USD da
      amount: parseFloat(amount),
      expense_type: cashExpenseType,
      description: description || `Vagon xarajati: ${expense_type}`,
      transaction_date: expense_date || Date.now(),
      createdBy: req.user.userId
    };

    if (existingExpense) {
      // Mavjud xarajatni yangilash
      const oldAmount = existingExpense.amount;
      existingExpense.amount = parseFloat(amount);
      if (description) existingExpense.description = description;
      await existingExpense.save();
      expense = existingExpense;
      console.log(`✅ Mavjud xarajat yangilandi: ${expense_type} - ${currency} ${existingExpense.amount}`);

      // Cash: avval cash_id bo'yicha (eng ishonchli)
      let existingCash = existingExpense.cash_id
        ? await Cash.findOne({ _id: existingExpense.cash_id, isDeleted: false })
        : null;

      // cash_id yo'q bo'lsa vagonExpense ID bo'yicha qidirish
      if (!existingCash) {
        existingCash = await Cash.findOne({
          type: 'expense',
          vagonExpense: existingExpense._id,
          isDeleted: false
        });
      }

      // Agar hali topilmasa, vagon va expense_type bo'yicha qidirish
      if (!existingCash) {
        const cashSearchCriteria = {
          type: 'expense',
          vagon: vagon,
          expense_type: cashExpenseType,
          currency: currency,
          isDeleted: false
        };
        
        // "boshqa" xarajatlar uchun description ham qo'shish
        if ((expense_type === 'boshqa' || expense_type === 'other') && description) {
          cashSearchCriteria.description = description;
        }
        
        existingCash = await Cash.findOne(cashSearchCriteria);
      }

      if (existingCash) {
        // Mavjud Cash yozuvini yangilash — YANGI YOZUV YARATILMAYDI
        const oldCashAmount = existingCash.amount;
        existingCash.amount = parseFloat(amount);
        existingCash.vagonExpense = existingExpense._id;
        if (description) existingCash.description = description;
        if (expense_date) existingCash.transaction_date = expense_date;
        await existingCash.save();
        // cash_id ni ham saqlash
        if (!existingExpense.cash_id) {
          existingExpense.cash_id = existingCash._id;
          await existingExpense.save();
        }
        console.log(`💰 Cash yangilandi: ${currency} ${oldCashAmount} → ${amount} (ID: ${existingCash._id})`);
      } else {
        // BIRINCHI MARTA: Cash hali yaratilmagan — bir marta yaratish va ID saqlash
        const cashEntry = new Cash({ ...cashData, vagonExpense: existingExpense._id });
        await cashEntry.save();
        existingExpense.cash_id = cashEntry._id;
        await existingExpense.save();
        console.log(`💰 Cash birinchi marta yaratildi va bog'landi: ${currency} ${amount} (ID: ${cashEntry._id})`);
      }

    } else {
      // Yangi xarajat yaratish
      const expenseData = {
        vagon, lot, expense_type, currency, amount, description,
        expense_date: expense_date || Date.now(),
        createdBy: req.user.userId
      };

      expense = new VagonExpense(expenseData);
      await expense.save();
      isNewExpense = true;
      console.log(`✅ Yangi xarajat yaratildi: ${expense_type} - ${currency} ${amount}`);

      // Yangi Cash — ID ni expense ga saqlash
      const cashEntry = new Cash({ ...cashData, vagonExpense: expense._id });
      await cashEntry.save();
      expense.cash_id = cashEntry._id;
      await expense.save();
      console.log(`💰 Cash yaratildi va bog'landi: ${currency} ${amount}`);
    }
    
    // Lot xarajatini yangilash
    if (lot) {
      await updateLotExpenses(lot);
    }
    
    // YANGI: Vagon jami ma'lumotlarini yangilash (tannarx bilan)
    const { recalculateVagonTotals } = require('../utils/vagonTotalsSync');
    await recalculateVagonTotals(vagon);

    // Cache tozalash — yangilangan ma'lumotlar darhol ko'rinsin
    const { SmartInvalidation } = require('../utils/cacheManager');
    SmartInvalidation.onVagonChange(vagon);

    // Populate qilib qaytarish
    await expense.populate('vagon', 'vagonCode month');
    if (expense.lot) {
      await expense.populate('lot', 'dimensions');
    }
    
    res.status(201).json(expense);
  } catch (error) {
    logger.error('VagonExpense create error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Xarajatni yangilash
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await VagonExpense.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    // Eski qiymatlarni saqlash (Cash yangilash uchun)
    const oldAmount = expense.amount;
    const oldCurrency = expense.currency;
    const oldDate = expense.expense_date;
    
    // Yangilanishi mumkin bo'lgan maydonlar
    const allowedUpdates = [
      'expense_type',
      'amount',
      'description',
      'expense_date'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        expense[field] = req.body[field];
      }
    });
    
    await expense.save();
    
    // Cash ni yangilash
    const Cash = require('../models/Cash');

    // Avval cash_id bo'yicha (eng ishonchli)
    let cashEntry = expense.cash_id
      ? await Cash.findOne({ _id: expense.cash_id, isDeleted: false })
      : null;

    // cash_id yo'q bo'lsa vagonExpense ID bo'yicha qidirish
    if (!cashEntry) {
      cashEntry = await Cash.findOne({
        type: 'expense',
        vagonExpense: expense._id,
        isDeleted: false
      });
    }

    if (cashEntry) {
      cashEntry.amount = expense.amount;
      cashEntry.currency = 'USD'; // TUZATILDI: Barcha chiqimlar USD da
      cashEntry.vagonExpense = expense._id;
      cashEntry.description = expense.description || cashEntry.description;
      cashEntry.transaction_date = expense.expense_date;
      await cashEntry.save();
      // cash_id saqlash
      if (!expense.cash_id) {
        expense.cash_id = cashEntry._id;
        await expense.save();
      }
      console.log(`💰 Cash yangilandi: ${oldCurrency} ${oldAmount} → USD ${expense.amount}`);
    } else {
      // Cash topilmadi — birinchi marta yaratish
      const newCashEntry = new Cash({
        type: 'expense',
        vagon: expense.vagon,
        yogoch: expense.lot || null,
        currency: 'USD', // TUZATILDI: Barcha chiqimlar USD da
        amount: expense.amount,
        vagonExpense: expense._id,
        expense_type: 'firma_xarajatlari',
        description: expense.description || `Vagon xarajati: ${expense.expense_type}`,
        transaction_date: expense.expense_date,
        createdBy: req.user.userId
      });
      await newCashEntry.save();
      expense.cash_id = newCashEntry._id;
      await expense.save();
      console.log(`💰 Cash birinchi marta yaratildi (PUT): USD ${expense.amount}`);
    }
    
    // Lot va vagonni yangilash
    if (expense.lot) {
      await updateLotExpenses(expense.lot);
    }
    const { recalculateVagonTotals } = require('../utils/vagonTotalsSync');
    await recalculateVagonTotals(expense.vagon);

    // Cache tozalash
    const { SmartInvalidation } = require('../utils/cacheManager');
    SmartInvalidation.onVagonChange(expense.vagon);

    res.json(expense);
  } catch (error) {
    console.error('VagonExpense update error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Xarajatni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await VagonExpense.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    expense.isDeleted = true;
    await expense.save();
    
    // YANGI: Cash dan ham o'chirish (soft delete)
    const Cash = require('../models/Cash');
    
    // Bu xarajatga mos Cash entry ni topish va o'chirish
    // Avval cash_id bo'yicha qidirish
    let cashEntry = expense.cash_id
      ? await Cash.findOne({ _id: expense.cash_id, isDeleted: false })
      : null;
    
    // cash_id yo'q bo'lsa vagonExpense ID bo'yicha qidirish
    if (!cashEntry) {
      cashEntry = await Cash.findOne({
        type: 'expense',
        vagonExpense: expense._id,
        isDeleted: false
      });
    }
    
    // Agar hali topilmasa, vagon va amount bo'yicha qidirish
    if (!cashEntry) {
      cashEntry = await Cash.findOne({
        type: 'expense',
        vagon: expense.vagon,
        currency: 'USD', // TUZATILDI: Cash da har doim USD
        amount: expense.amount,
        isDeleted: false,
        transaction_date: {
          $gte: new Date(expense.expense_date.getTime() - 1000), // 1 sekund oldin
          $lte: new Date(expense.expense_date.getTime() + 1000)  // 1 sekund keyin
        }
      });
    }
    
    if (cashEntry) {
      cashEntry.isDeleted = true;
      await cashEntry.save();
      console.log(`💰 Cash dan xarajat o'chirildi: USD ${expense.amount}`);
    }
    
    // Lot va vagonni yangilash
    if (expense.lot) {
      await updateLotExpenses(expense.lot);
    }
    const { recalculateVagonTotals } = require('../utils/vagonTotalsSync');
    await recalculateVagonTotals(expense.vagon);

    // Cache tozalash
    const { SmartInvalidation } = require('../utils/cacheManager');
    SmartInvalidation.onVagonChange(expense.vagon);

    res.json({ message: 'Xarajat o\'chirildi' });
  } catch (error) {
    console.error('VagonExpense delete error:', error);
    res.status(500).json({ message: 'Xarajatni o\'chirishda xatolik' });
  }
});

// Helper function: Lot xarajatlarini yangilash
async function updateLotExpenses(lotId) {
  const lot = await VagonLot.findById(lotId);
  if (!lot) return;
  
  const expenses = await VagonExpense.find({ 
    lot: lotId, 
    isDeleted: false 
  });
  
  // YANGI: Xarajatlarni valyuta bo'yicha ajratish
  let usdExpenses = 0;
  let rubExpenses = 0;
  
  expenses.forEach(exp => {
    if (exp.currency === 'USD') {
      usdExpenses += exp.amount;
    } else if (exp.currency === 'RUB') {
      rubExpenses += exp.amount;
    }
  });
  
  // MUHIM: Yo'g'och xaridi RUB da, qo'shimcha xarajatlar USD da
  // allocated_expenses - faqat USD xarajatlar
  lot.allocated_expenses = usdExpenses;
  
  // Agar RUB xarajatlar bo'lsa, ularni purchase_amount ga qo'shish
  if (rubExpenses > 0) {
    lot.purchase_amount = (lot.purchase_amount || 0) + rubExpenses;
  }
  
  // Backward compatibility
  lot.total_expenses = lot.purchase_amount + usdExpenses;
  
  await lot.save();
  
  console.log(`✅ Lot xarajatlari yangilandi: ${lot.dimensions}`);
  console.log(`   Yo'g'och (RUB): ${lot.purchase_amount} RUB`);
  console.log(`   Qo'shimcha (USD): ${usdExpenses} USD`);
}

// Helper function: Vagon jami ma'lumotlarini yangilash
async function updateVagonTotals(vagonId) {
  const lots = await VagonLot.find({ 
    vagon: vagonId, 
    isDeleted: false 
  });
  
  const vagon = await Vagon.findById(vagonId);
  if (!vagon) return;
  
  // Hajmlar (yangi terminologiya bilan xavfsiz hisoblash)
  vagon.total_volume_m3 = lots.reduce((sum, lot) => sum + (lot.volume_m3 || 0), 0);
  vagon.total_loss_m3 = lots.reduce((sum, lot) => sum + (lot.loss_volume_m3 || 0), 0);
  vagon.available_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_available_volume_m3 || lot.available_volume_m3 || 0), 0);
  vagon.sold_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_dispatched_volume_m3 || lot.sold_volume_m3 || 0), 0);
  vagon.remaining_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_remaining_volume_m3 || lot.remaining_volume_m3 || 0), 0);
  
  // USD (yangi terminologiya bilan)
  const usdLots = lots.filter(lot => lot.purchase_currency === 'USD');
  vagon.usd_total_cost = usdLots.reduce((sum, lot) => sum + (lot.total_investment || lot.total_expenses || 0), 0);
  vagon.usd_total_revenue = usdLots.reduce((sum, lot) => sum + (lot.total_revenue || 0), 0);
  vagon.usd_profit = usdLots.reduce((sum, lot) => sum + (lot.realized_profit || lot.profit || 0), 0);
  
  // RUB (yangi terminologiya bilan)
  const rubLots = lots.filter(lot => lot.purchase_currency === 'RUB');
  vagon.rub_total_cost = rubLots.reduce((sum, lot) => sum + (lot.total_investment || lot.total_expenses || 0), 0);
  vagon.rub_total_revenue = rubLots.reduce((sum, lot) => sum + (lot.total_revenue || 0), 0);
  vagon.rub_profit = rubLots.reduce((sum, lot) => sum + (lot.realized_profit || lot.profit || 0), 0);
  
  await vagon.save();
}

module.exports = router;
