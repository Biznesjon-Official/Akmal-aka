const express = require('express');
const router = express.Router();
const VagonLot = require('../models/VagonLot');
const Vagon = require('../models/Vagon');
const VagonExpense = require('../models/VagonExpense');
const auth = require('../middleware/auth');
const { logUserAction } = require('../middleware/auditLog');
const { SmartInvalidation } = require('../utils/cacheManager');
const { safeTransaction } = require('../utils/safeTransaction');
const logger = require('../utils/logger');
const { 
  VagonLotNotFoundError, 
  InsufficientVolumeError,
  handleCustomError 
} = require('../utils/customErrors');

// Barcha yog'ochlar (vagon bo'yicha filter)
router.get('/', auth, async (req, res) => {
  try {
    const { vagon } = req.query;
    
    const filter = { isDeleted: false };
    if (vagon) filter.vagon = vagon;
    
    const yogochlar = await VagonLot.find(filter)
      .populate('vagon', 'vagonCode month status')
      .sort({ createdAt: -1 });
    
    res.json(yogochlar);
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Bitta yog'och ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const yogoch = await VagonLot.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).populate('vagon');
    
    if (!yogoch) {
      throw new VagonLotNotFoundError(req.params.id);
    }
    
    res.json(yogoch);
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Yangi yog'och yaratish yoki mavjudini yangilash
router.post('/', auth, async (req, res) => {
  try {
    const {
      vagon,
      name, // Yangi field
      dimensions,
      quantity,
      volume_m3,
      purchase_currency,
      purchase_amount,
      recommended_sale_price_per_m3, // YANGI: Tavsiya etilgan sotuv narxi
      loss_volume_m3,
      loss_responsible_person,
      loss_reason,
      loss_date,
      notes,
      mergeIfExists = true // Yangi parametr: agar bir xil o'lcham bo'lsa, birlashtirish
    } = req.body;
    
    // Validatsiya
    if (!vagon || !dimensions || !quantity || !volume_m3 || !purchase_currency || purchase_amount === undefined || purchase_amount === null) {
      logger.error('VagonLot validation failed:', {
        vagon: !!vagon,
        dimensions: !!dimensions,
        quantity: !!quantity,
        volume_m3: !!volume_m3,
        purchase_currency: !!purchase_currency,
        purchase_amount: purchase_amount !== undefined && purchase_amount !== null,
        receivedData: req.body
      });
      return res.status(400).json({ 
        message: 'Barcha majburiy maydonlar to\'ldirilishi shart',
        missing: {
          vagon: !vagon,
          dimensions: !dimensions,
          quantity: !quantity,
          volume_m3: !volume_m3,
          purchase_currency: !purchase_currency,
          purchase_amount: purchase_amount === undefined || purchase_amount === null
        }
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
    
    const result = await safeTransaction(async (session) => {
      // Bir xil o'lchamdagi mavjud yog'ochni topish
      let existingYogoch = null;
      if (mergeIfExists) {
        existingYogoch = await VagonLot.findOne({
          vagon,
          dimensions,
          purchase_currency,
          isDeleted: false
        }).session(session);
      }
      
      let yogoch;
      let isUpdated = false;
      
      if (existingYogoch) {
        // Mavjud lotni yangilash
        console.log(`📦 Bir xil o'lchamdagi lot topildi: ${dimensions}, miqdorni oshirish...`);
        
        const oldQuantity = existingYogoch.quantity;
        const oldVolume = existingYogoch.volume_m3;
        const oldAmount = existingYogoch.purchase_amount;
        
        // Miqdor va hajmni qo'shish
        existingYogoch.quantity += quantity;
        existingYogoch.volume_m3 += volume_m3;
        existingYogoch.purchase_amount += purchase_amount;
        existingYogoch.total_expenses += purchase_amount;
        
        // Warehouse qiymatlarini yangilash
        existingYogoch.warehouse_available_volume_m3 += volume_m3;
        existingYogoch.warehouse_remaining_volume_m3 += volume_m3;
        existingYogoch.remaining_quantity += quantity;
        
        // Yo'qotish ma'lumotlarini qo'shish (agar berilgan bo'lsa)
        if (loss_volume_m3) {
          existingYogoch.loss_volume_m3 = (existingYogoch.loss_volume_m3 || 0) + loss_volume_m3;
          existingYogoch.warehouse_available_volume_m3 -= loss_volume_m3;
          existingYogoch.warehouse_remaining_volume_m3 -= loss_volume_m3;
        }
        
        // Notes ni qo'shish
        if (notes) {
          existingYogoch.notes = existingYogoch.notes 
            ? `${existingYogoch.notes}\n---\n${new Date().toLocaleDateString()}: ${notes}`
            : notes;
        }
        
        await existingYogoch.save({ session });
        
        yogoch = existingYogoch;
        isUpdated = true;
        
        console.log(`✅ Lot yangilandi: ${oldQuantity} → ${existingYogoch.quantity} dona, ${oldVolume.toFixed(2)} → ${existingYogoch.volume_m3.toFixed(2)} m³`);
        
        // Audit log
        await logUserAction(
          req, 
          'UPDATE', 
          'VagonLot', 
          yogoch._id, 
          { quantity: oldQuantity, volume_m3: oldVolume, purchase_amount: oldAmount },
          { quantity: yogoch.quantity, volume_m3: yogoch.volume_m3, purchase_amount: yogoch.purchase_amount },
          `Lot miqdori oshirildi: ${dimensions} (+${quantity} dona, +${volume_m3.toFixed(2)} m³)`,
          { vagon: vagon, added_quantity: quantity, added_volume: volume_m3 }
        );
        
      } else {
        // Yangi lot yaratish
        console.log(`📦 Yangi lot yaratilmoqda: ${dimensions}`);
        
        yogoch = new VagonLot({
          vagon,
          name, // Yangi field qo'shildi
          dimensions,
          quantity,
          volume_m3,
          purchase_currency,
          purchase_amount,
          recommended_sale_price_per_m3: recommended_sale_price_per_m3 || 0, // YANGI
          loss_volume_m3: loss_volume_m3 || 0,
          loss_responsible_person: loss_responsible_person || null,
          loss_reason: loss_reason || null,
          loss_date: loss_date ? new Date(loss_date) : null,
          notes
        });
        
        // Jami xarajat = Xarid summasi
        yogoch.total_expenses = purchase_amount;
        
        await yogoch.save({ session });
        
        // Audit log
        await logUserAction(
          req, 
          'CREATE', 
          'VagonLot', 
          yogoch._id, 
          null, 
          yogoch.toObject(), 
          `Yangi lot yaratildi: ${yogoch.dimensions}`,
          { vagon: vagon, volume_m3: yogoch.volume_m3, loss_volume_m3: yogoch.loss_volume_m3 }
        );
      }
      
      // Vagonni yangilash
      await updateVagonTotals(vagon, session);
      
      // Cache invalidation
      SmartInvalidation.onVagonLotChange(vagon, yogoch._id);
      
      return {
        ...yogoch.toObject(),
        message: isUpdated 
          ? `✅ Mavjud lot yangilandi: +${quantity} dona, +${volume_m3.toFixed(2)} m³`
          : '✅ Yangi lot yaratildi',
        isUpdated
      };
    }, {
      maxRetries: 5,
      onRetry: (attempt) => {
        console.log(`🔄 Lot yaratish qayta urinilmoqda (${attempt}-marta)...`);
      }
    });
    
    res.status(result.isUpdated ? 200 : 201).json(result);
  } catch (error) {
    logger.error('VagonLot create/update error:', error);
    
    // Write conflict xatoligini tekshirish
    const isWriteConflict = 
      error.code === 112 || 
      error.codeName === 'WriteConflict' ||
      (error.message && error.message.includes('Write conflict'));
    
    if (isWriteConflict) {
      return res.status(409).json({ 
        message: 'Tizim band, iltimos bir oz kuting va qayta urinib ko\'ring.',
        code: 'WRITE_CONFLICT'
      });
    }
    
    res.status(400).json({ message: error.message });
  }
});

// Lotni yangilash
router.put('/:id', auth, async (req, res) => {
  try {
    const result = await safeTransaction(async (session) => {
      const lot = await VagonLot.findOne({ 
        _id: req.params.id, 
        isDeleted: false 
      }).session(session);
      
      if (!lot) {
        throw new VagonLotNotFoundError(req.params.id);
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
      
      return lot.toObject();
    }, {
      maxRetries: 5,
      onRetry: (attempt) => {
        console.log(`🔄 Lot yangilash qayta urinilmoqda (${attempt}-marta)...`);
      }
    });
    
    res.json(result);
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Lotni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await safeTransaction(async (session) => {
      const lot = await VagonLot.findOne({ 
        _id: req.params.id, 
        isDeleted: false 
      }).session(session);
      
      if (!lot) {
        throw new VagonLotNotFoundError(req.params.id);
      }
      
      // Sotilgan bo'lsa o'chirish mumkin emas
      if (lot.sold_volume_m3 > 0) {
        throw new InsufficientVolumeError(0, lot.sold_volume_m3);
      }
      
      lot.isDeleted = true;
      await lot.save({ session });
      
      // Vagonni yangilash
      await updateVagonTotals(lot.vagon, session);
      
      return { message: 'Lot o\'chirildi' };
    }, {
      maxRetries: 5,
      onRetry: (attempt) => {
        console.log(`🔄 Lot o'chirish qayta urinilmoqda (${attempt}-marta)...`);
      }
    });
    
    res.json(result);
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Helper function: Vagon jami ma'lumotlarini yangilash
async function updateVagonTotals(vagonId, session = null) {
  const query = { 
    vagon: vagonId, 
    isDeleted: false 
  };
  
  // Agar session berilgan bo'lsa, uni ishlatamiz
  const lots = session 
    ? await VagonLot.find(query).session(session)
    : await VagonLot.find(query);
  
  // Vagonni olish
  const vagon = session
    ? await Vagon.findById(vagonId).session(session)
    : await Vagon.findById(vagonId);
    
  if (!vagon) {
    console.log(`⚠️  Vagon topilmadi: ${vagonId}`);
    return;
  }
  
  console.log(`🔄 Vagon ${vagon.vagonCode} jami ma'lumotlari yangilanmoqda...`);
  console.log(`   Lotlar soni: ${lots.length}`);
  
  // Hajmlar (yangi terminologiya bilan)
  vagon.total_volume_m3 = lots.reduce((sum, lot) => sum + (lot.volume_m3 || 0), 0);
  vagon.total_loss_m3 = lots.reduce((sum, lot) => sum + (lot.loss_volume_m3 || 0), 0);
  vagon.available_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_available_volume_m3 || lot.available_volume_m3 || 0), 0);
  vagon.sold_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_dispatched_volume_m3 || lot.sold_volume_m3 || 0), 0);
  vagon.remaining_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_remaining_volume_m3 || lot.remaining_volume_m3 || 0), 0);
  
  console.log(`   Jami hajm: ${vagon.total_volume_m3} m³`);
  console.log(`   Mavjud hajm: ${vagon.available_volume_m3} m³`);
  console.log(`   Sotilgan hajm: ${vagon.sold_volume_m3} m³`);
  console.log(`   Qolgan hajm: ${vagon.remaining_volume_m3} m³`);
  
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
  
  // Session bilan yoki session'siz saqlash
  if (session) {
    await vagon.save({ session });
  } else {
    await vagon.save();
  }
  
  console.log(`✅ Vagon ${vagon.vagonCode} jami ma'lumotlari yangilandi`);
}

module.exports = router;
