const express = require('express');
const router = express.Router();
const VagonLot = require('../models/VagonLot');
const Vagon = require('../models/Vagon');
const VagonExpense = require('../models/VagonExpense');
const auth = require('../middleware/auth');
const { logUserAction } = require('../middleware/auditLog');
const { SmartInvalidation } = require('../utils/cacheManager');

// Barcha lotlar (vagon bo'yicha filter)
router.get('/', auth, async (req, res) => {
  try {
    const { vagon } = req.query;
    
    const filter = { isDeleted: false };
    if (vagon) filter.vagon = vagon;
    
    const lots = await VagonLot.find(filter)
      .populate('vagon', 'vagonCode month status')
      .sort({ createdAt: -1 });
    
    res.json(lots);
  } catch (error) {
    console.error('VagonLot list error:', error);
    res.status(500).json({ message: 'Lotlar ro\'yxatini olishda xatolik' });
  }
});

// Bitta lot ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const lot = await VagonLot.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).populate('vagon');
    
    if (!lot) {
      return res.status(404).json({ message: 'Lot topilmadi' });
    }
    
    res.json(lot);
  } catch (error) {
    console.error('VagonLot get error:', error);
    res.status(500).json({ message: 'Lot ma\'lumotlarini olishda xatolik' });
  }
});

// Yangi lot yaratish
router.post('/', auth, async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  
  try {
    const {
      vagon,
      dimensions,
      quantity,
      volume_m3,
      purchase_currency,
      purchase_amount,
      loss_volume_m3,
      loss_responsible_person,
      loss_reason,
      loss_date,
      notes
    } = req.body;
    
    // Validatsiya
    if (!vagon || !dimensions || !quantity || !volume_m3 || !purchase_currency || !purchase_amount) {
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
    
    // Lot yaratish
    const lot = new VagonLot({
      vagon,
      dimensions,
      quantity,
      volume_m3,
      purchase_currency,
      purchase_amount,
      loss_volume_m3: loss_volume_m3 || 0,
      loss_responsible_person: loss_responsible_person || null,
      loss_reason: loss_reason || null,
      loss_date: loss_date ? new Date(loss_date) : null,
      notes
    });
    
    // Jami xarajat = Xarid summasi (xarajatlar keyinroq qo'shiladi)
    lot.total_expenses = purchase_amount;
    
    await lot.save({ session });
    
    // Audit log
    await logUserAction(
      req, 
      'CREATE', 
      'VagonLot', 
      lot._id, 
      null, 
      lot.toObject(), 
      `Yangi lot yaratildi: ${lot.dimensions}`,
      { vagon: vagon, volume_m3: lot.volume_m3, loss_volume_m3: lot.loss_volume_m3 }
    );
    
    // Vagonni yangilash
    await updateVagonTotals(vagon, session);
    
    // Cache invalidation
    SmartInvalidation.onVagonLotChange(vagon, lot._id);
    
    await session.commitTransaction();
    
    res.status(201).json(lot);
  } catch (error) {
    await session.abortTransaction();
    console.error('VagonLot create error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Lotni yangilash
router.put('/:id', auth, async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  
  try {
    const lot = await VagonLot.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).session(session).read('primary');
    
    if (!lot) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Lot topilmadi' });
    }
    
    // Yangilanishi mumkin bo'lgan maydonlar
    const allowedUpdates = [
      'dimensions',
      'quantity',
      'volume_m3',
      'purchase_currency',
      'purchase_amount',
      'loss_volume_m3',
      'loss_responsible_person',
      'loss_reason',
      'loss_date',
      'notes'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        lot[field] = req.body[field];
      }
    });
    
    // Xarajatlarni qayta hisoblash
    const expenses = await VagonExpense.find({ 
      lot: lot._id, 
      isDeleted: false 
    }).session(session);
    const totalExpenses = expenses.reduce((sum, exp) => {
      if (exp.currency === lot.purchase_currency) {
        return sum + exp.amount;
      }
      return sum;
    }, 0);
    
    lot.total_expenses = lot.purchase_amount + totalExpenses;
    
    await lot.save({ session });
    
    // Vagonni yangilash
    await updateVagonTotals(lot.vagon, session);
    
    // Cache invalidation
    SmartInvalidation.onVagonLotChange(lot.vagon, lot._id);
    
    await session.commitTransaction();
    
    res.json(lot);
  } catch (error) {
    await session.abortTransaction();
    console.error('VagonLot update error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Lotni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  
  try {
    const lot = await VagonLot.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).session(session).read('primary');
    
    if (!lot) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Lot topilmadi' });
    }
    
    // Sotilgan bo'lsa o'chirish mumkin emas
    if (lot.sold_volume_m3 > 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Bu lot bo\'yicha sotuvlar mavjud. O\'chirish mumkin emas' 
      });
    }
    
    lot.isDeleted = true;
    await lot.save({ session });
    
    // Vagonni yangilash
    await updateVagonTotals(lot.vagon, session);
    
    await session.commitTransaction();
    
    res.json({ message: 'Lot o\'chirildi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('VagonLot delete error:', error);
    res.status(500).json({ message: 'Lotni o\'chirishda xatolik' });
  } finally {
    session.endSession();
  }
});

// Helper function: Vagon jami ma'lumotlarini yangilash
async function updateVagonTotals(vagonId) {
  const lots = await VagonLot.find({ 
    vagon: vagonId, 
    isDeleted: false 
  });
  
  const vagon = await Vagon.findById(vagonId);
  if (!vagon) return;
  
  // Hajmlar (yangi terminologiya bilan)
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
