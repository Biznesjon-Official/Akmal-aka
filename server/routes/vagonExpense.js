const express = require('express');
const router = express.Router();
const VagonExpense = require('../models/VagonExpense');
const VagonLot = require('../models/VagonLot');
const Vagon = require('../models/Vagon');
const auth = require('../middleware/auth');

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
    console.error('VagonExpense list error:', error);
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
    
    // Bir xil xarajat turini topish (vagon, lot, expense_type, currency bo'yicha)
    const existingExpense = await VagonExpense.findOne({
      vagon,
      lot: lot || null,
      expense_type,
      currency,
      isDeleted: false
    });

    let expense;
    
    if (existingExpense) {
      // Mavjud xarajatni yangilash - summani qo'shish
      existingExpense.amount += amount;
      if (description) {
        existingExpense.description = description;
      }
      await existingExpense.save();
      expense = existingExpense;
      
      console.log(`✅ Mavjud xarajat yangilandi: ${expense_type} - ${currency} ${existingExpense.amount}`);
    } else {
      // Yangi xarajat yaratish
      expense = new VagonExpense({
        vagon,
        lot,
        expense_type,
        currency,
        amount,
        description,
        expense_date: expense_date || Date.now(),
        createdBy: req.user.id
      });
      
      await expense.save();
      console.log(`✅ Yangi xarajat yaratildi: ${expense_type} - ${currency} ${amount}`);
    }
    
    // Lot xarajatini yangilash
    if (lot) {
      await updateLotExpenses(lot);
    }
    
    // Vagon jami ma'lumotlarini yangilash
    await updateVagonTotals(vagon);
    
    // Populate qilib qaytarish
    await expense.populate('vagon', 'vagonCode month');
    if (expense.lot) {
      await expense.populate('lot', 'dimensions');
    }
    
    res.status(201).json(expense);
  } catch (error) {
    console.error('VagonExpense create error:', error);
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
    
    // Lot va vagonni yangilash
    if (expense.lot) {
      await updateLotExpenses(expense.lot);
    }
    await updateVagonTotals(expense.vagon);
    
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
    
    // Lot va vagonni yangilash
    if (expense.lot) {
      await updateLotExpenses(expense.lot);
    }
    await updateVagonTotals(expense.vagon);
    
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
  
  const totalExpenses = expenses.reduce((sum, exp) => {
    if (exp.currency === lot.purchase_currency) {
      return sum + exp.amount;
    }
    return sum;
  }, 0);
  
  lot.total_expenses = lot.purchase_amount + totalExpenses;
  await lot.save();
}

// Helper function: Vagon jami ma'lumotlarini yangilash
async function updateVagonTotals(vagonId) {
  const lots = await VagonLot.find({ 
    vagon: vagonId, 
    isDeleted: false 
  });
  
  const vagon = await Vagon.findById(vagonId);
  if (!vagon) return;
  
  // Hajmlar
  vagon.total_volume_m3 = lots.reduce((sum, lot) => sum + lot.volume_m3, 0);
  vagon.total_loss_m3 = lots.reduce((sum, lot) => sum + lot.loss_volume_m3, 0);
  vagon.available_volume_m3 = lots.reduce((sum, lot) => sum + lot.available_volume_m3, 0);
  vagon.sold_volume_m3 = lots.reduce((sum, lot) => sum + lot.sold_volume_m3, 0);
  vagon.remaining_volume_m3 = lots.reduce((sum, lot) => sum + lot.remaining_volume_m3, 0);
  
  // USD
  const usdLots = lots.filter(lot => lot.purchase_currency === 'USD');
  vagon.usd_total_cost = usdLots.reduce((sum, lot) => sum + lot.total_expenses, 0);
  vagon.usd_total_revenue = usdLots.reduce((sum, lot) => sum + lot.total_revenue, 0);
  vagon.usd_profit = usdLots.reduce((sum, lot) => sum + lot.profit, 0);
  
  // RUB
  const rubLots = lots.filter(lot => lot.purchase_currency === 'RUB');
  vagon.rub_total_cost = rubLots.reduce((sum, lot) => sum + lot.total_expenses, 0);
  vagon.rub_total_revenue = rubLots.reduce((sum, lot) => sum + lot.total_revenue, 0);
  vagon.rub_profit = rubLots.reduce((sum, lot) => sum + lot.profit, 0);
  
  await vagon.save();
}

module.exports = router;
