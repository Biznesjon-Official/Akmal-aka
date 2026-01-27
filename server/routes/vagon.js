const express = require('express');
const router = express.Router();
const Vagon = require('../models/Vagon');
const auth = require('../middleware/auth');
const { cacheMiddleware, SmartInvalidation } = require('../utils/cacheManager');

// Barcha vagonlar ro'yxati (OPTIMIZED PAGINATION + CACHE)
router.get('/', auth, cacheMiddleware(180), async (req, res) => {
  try {
    const { 
      status, 
      month, 
      page = 1, 
      limit = 20,
      includeLots = 'true', // Default true for better UX
      search
    } = req.query;
    
    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (month) filter.month = month;
    
    // Search filter
    if (search) {
      filter.$or = [
        { vagonCode: { $regex: search, $options: 'i' } },
        { sending_place: { $regex: search, $options: 'i' } },
        { receiving_place: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination parametrlari
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;
    
    // Parallel execution for better performance
    const [total, vagons] = await Promise.all([
      Vagon.countDocuments(filter),
      Vagon.find(filter)
        .select('vagonCode month sending_place receiving_place status total_volume_m3 total_loss_m3 available_volume_m3 sold_volume_m3 remaining_volume_m3 usd_total_cost usd_total_revenue usd_profit rub_total_cost rub_total_revenue rub_profit closure_date closure_reason closure_notes createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean() // Use lean for better performance
    ]);
    
    // Conditionally load lots (only if requested)
    if (includeLots === 'true' && vagons.length > 0) {
      const VagonLot = require('../models/VagonLot');
      const vagonIds = vagons.map(v => v._id);
      
      // Batch load lots with selected fields only
      const allLots = await VagonLot.find({ 
        vagon: { $in: vagonIds }, 
        isDeleted: false 
      })
      .select('vagon dimensions quantity volume_m3 loss_volume_m3 loss_responsible_person loss_reason loss_date warehouse_available_volume_m3 warehouse_dispatched_volume_m3 warehouse_remaining_volume_m3 purchase_currency purchase_amount total_investment realized_profit unrealized_value break_even_price_per_m3 remaining_quantity')
      .lean();
      
      // Map lots to vagons efficiently
      const lotsMap = allLots.reduce((acc, lot) => {
        const vagonId = lot.vagon.toString();
        if (!acc[vagonId]) acc[vagonId] = [];
        acc[vagonId].push({
          ...lot,
          // Backward compatibility fields
          currency: lot.purchase_currency,
          remaining_volume_m3: lot.warehouse_remaining_volume_m3
        });
        return acc;
      }, {});
      
      vagons.forEach(vagon => {
        vagon.lots = lotsMap[vagon._id.toString()] || [];
      });
    }
    
    // Pagination ma'lumotlari
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      vagons,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + limitNum, total)
      }
    });

  } catch (error) {
    console.error('Vagon list error:', error);
    res.status(500).json({ message: 'Vagonlar ro\'yxatini olishda xatolik' });
  }
});

// Bitta vagon ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const vagon = await Vagon.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    res.json(vagon);
  } catch (error) {
    console.error('Vagon get error:', error);
    res.status(500).json({ message: 'Vagon ma\'lumotlarini olishda xatolik' });
  }
});

// Vagon batafsil ma'lumotlari (sotuvlar va xarajatlar bilan)
router.get('/:id/details', auth, async (req, res) => {
  try {
    const vagon = await Vagon.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    // Sotuvlarni olish
    const VagonSale = require('../models/VagonSale');
    const sales = await VagonSale.find({ 
      vagon: req.params.id, 
      isDeleted: false 
    })
      .populate('client', 'name phone')
      .sort({ createdAt: -1 });
    
    // Xarajatlarni olish
    const Expense = require('../models/Expense');
    const expenses = await Expense.find({ 
      woodLot: req.params.id,
      isDeleted: false 
    }).sort({ createdAt: -1 });
    
    const details = {
      vagon,
      sales,
      expenses,
      summary: {
        total_sales: sales.length,
        total_clients: [...new Set(sales.map(s => s.client?._id?.toString()))].length,
        total_expenses: expenses.length,
        total_expense_amount: expenses.reduce((sum, e) => sum + (e.amount_rub || 0), 0)
      }
    };
    
    res.json(details);
  } catch (error) {
    console.error('Vagon details error:', error);
    res.status(500).json({ message: 'Vagon ma\'lumotlarini olishda xatolik' });
  }
});

// Mavjud hajmni olish
router.get('/:id/available', auth, async (req, res) => {
  try {
    const vagon = await Vagon.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    res.json({
      available: vagon.remaining_volume_m3,
      sent: vagon.sent_volume_m3,
      accepted: vagon.accepted_volume_m3,
      total: vagon.available_volume_m3,
      percentage: vagon.sold_percentage
    });
  } catch (error) {
    console.error('Vagon available error:', error);
    res.status(500).json({ message: 'Mavjud hajmni olishda xatolik' });
  }
});

// Yangi vagon yaratish
router.post('/', auth, async (req, res) => {
  try {
    const {
      month,
      sending_place,
      receiving_place,
      notes
    } = req.body;
    
    // Validatsiya
    if (!month || !sending_place || !receiving_place) {
      return res.status(400).json({ 
        message: 'Barcha majburiy maydonlar to\'ldirilishi shart' 
      });
    }
    
    // Vagon kodi generatsiya
    const year = new Date().getFullYear();
    const vagonCode = await Vagon.generateVagonCode(year);
    
    // Yangi vagon yaratish (lotlar keyinroq qo'shiladi)
    const vagon = new Vagon({
      vagonCode,
      month,
      sending_place,
      receiving_place,
      notes,
      status: 'active'
    });
    
    await vagon.save();
    
    // Smart cache invalidation
    SmartInvalidation.onVagonChange(vagon._id);
    
    res.status(201).json(vagon);
  } catch (error) {
    console.error('Vagon create error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Vagonni yangilash
router.put('/:id', auth, async (req, res) => {
  try {
    const vagon = await Vagon.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    // Faqat ma'lum maydonlarni yangilash mumkin
    const allowedUpdates = [
      'month',
      'sending_place',
      'receiving_place',
      'notes',
      'status'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        vagon[field] = req.body[field];
      }
    });
    
    await vagon.save();
    
    res.json(vagon);
  } catch (error) {
    console.error('Vagon update error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Vagonni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const vagon = await Vagon.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    // Sotilgan bo'lsa o'chirish mumkin emas
    if (vagon.sold_volume_m3 > 0) {
      return res.status(400).json({ 
        message: 'Bu vagon bo\'yicha sotuvlar mavjud. O\'chirish mumkin emas' 
      });
    }
    
    // Lotlar bo'lsa o'chirish mumkin emas
    const VagonLot = require('../models/VagonLot');
    const lotsCount = await VagonLot.countDocuments({ 
      vagon: req.params.id, 
      isDeleted: false 
    });
    
    if (lotsCount > 0) {
      return res.status(400).json({ 
        message: 'Bu vagonda lotlar mavjud. Avval lotlarni o\'chiring' 
      });
    }
    
    vagon.isDeleted = true;
    await vagon.save();
    
    res.json({ message: 'Vagon o\'chirildi' });
  } catch (error) {
    console.error('Vagon delete error:', error);
    res.status(500).json({ message: 'Vagonni o\'chirishda xatolik' });
  }
});

// Vagon statistikasi
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const vagon = await Vagon.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    const stats = {
      // Hajm
      arrived_volume: vagon.arrived_volume_m3,
      arrival_loss: vagon.arrival_loss_m3,
      available_volume: vagon.available_volume_m3,
      sent_volume: vagon.sent_volume_m3,
      accepted_volume: vagon.accepted_volume_m3,
      loss_volume: vagon.loss_volume_m3,
      remaining_volume: vagon.remaining_volume_m3,
      sold_percentage: vagon.sold_percentage,
      loss_percentage: vagon.loss_percentage,
      
      // Moliya
      total_cost: vagon.total_cost,
      additional_expenses: vagon.additional_expenses,
      total_expenses: vagon.total_expenses,
      cost_per_m3: vagon.cost_per_m3,
      loss_amount: vagon.loss_amount,
      total_revenue: vagon.total_revenue,
      realized_profit: vagon.realized_profit,
      expected_profit: vagon.expected_profit,
      profit_percentage: vagon.profit_percentage,
      
      // Holat
      status: vagon.status,
      can_close: vagon.canClose()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Vagon stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

// Vagonni yopish
router.patch('/:id/close', auth, async (req, res) => {
  try {
    const vagon = await Vagon.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    if (vagon.status === 'closed') {
      return res.status(400).json({ message: 'Vagon allaqachon yopilgan' });
    }
    
    const { reason, notes } = req.body;
    
    vagon.status = 'closed';
    vagon.closure_date = new Date();
    vagon.closure_reason = reason || 'manual_closure';
    vagon.closure_notes = notes || '';
    vagon.closed_by = req.user.userId;
    
    await vagon.save();
    
    res.json({ 
      message: 'Vagon yopildi',
      vagon 
    });
  } catch (error) {
    console.error('Vagon close error:', error);
    res.status(500).json({ message: 'Vagonni yopishda xatolik', error: error.message });
  }
});

// YANGI: Vagon hajmini tuzatish (brak, yo'qotish, tuzatish)
router.patch('/:id/adjust-volume', auth, async (req, res) => {
  try {
    const vagon = await Vagon.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    if (vagon.status === 'closed' || vagon.status === 'archived') {
      return res.status(400).json({ message: 'Yopilgan yoki arxivlangan vagonni tuzatish mumkin emas' });
    }
    
    const { 
      adjustment_type, // 'loss' yoki 'correction'
      adjustment_amount, 
      adjustment_reason, 
      responsible_person, 
      notes 
    } = req.body;
    
    // Validatsiya
    if (!adjustment_type || !adjustment_amount || !adjustment_reason) {
      return res.status(400).json({ 
        message: 'Tuzatish turi, miqdori va sababi majburiy' 
      });
    }
    
    const adjustmentValue = parseFloat(adjustment_amount);
    if (adjustmentValue <= 0) {
      return res.status(400).json({ 
        message: 'Tuzatish miqdori 0 dan katta bo\'lishi kerak' 
      });
    }
    
    // Brak bo'lsa, mavjud hajmdan katta bo'lmasligi kerak
    if (adjustment_type === 'loss' && adjustmentValue > vagon.available_volume_m3) {
      return res.status(400).json({ 
        message: `Brak miqdori mavjud hajmdan (${vagon.available_volume_m3.toFixed(2)} m³) katta bo'lishi mumkin emas` 
      });
    }
    
    // Tuzatish tarixini saqlash
    const adjustmentRecord = {
      type: adjustment_type,
      amount: adjustmentValue,
      reason: adjustment_reason,
      responsible_person: responsible_person || null,
      notes: notes || null,
      adjusted_by: req.user.userId,
      adjusted_at: new Date(),
      // Tuzatishdan oldingi qiymatlar
      before_total_volume: vagon.total_volume_m3,
      before_available_volume: vagon.available_volume_m3,
      before_remaining_volume: vagon.remaining_volume_m3
    };
    
    // Hajmlarni yangilash
    if (adjustment_type === 'loss') {
      // Brak - hajmni kamaytirish
      vagon.total_loss_m3 = (vagon.total_loss_m3 || 0) + adjustmentValue;
      vagon.available_volume_m3 = Math.max(0, vagon.available_volume_m3 - adjustmentValue);
      vagon.remaining_volume_m3 = Math.max(0, vagon.remaining_volume_m3 - adjustmentValue);
    } else if (adjustment_type === 'correction') {
      // Tuzatish - hajmni o'zgartirish (musbat yoki manfiy bo'lishi mumkin)
      // Bu yerda foydalanuvchi to'g'ri hajmni kiritadi
      const correctionDiff = adjustmentValue - vagon.total_volume_m3;
      vagon.total_volume_m3 = adjustmentValue;
      vagon.available_volume_m3 = Math.max(0, vagon.available_volume_m3 + correctionDiff);
      vagon.remaining_volume_m3 = Math.max(0, vagon.remaining_volume_m3 + correctionDiff);
    }
    
    // Tuzatish tarixini qo'shish
    if (!vagon.volume_adjustments) {
      vagon.volume_adjustments = [];
    }
    vagon.volume_adjustments.push(adjustmentRecord);
    
    // Tuzatishdan keyingi qiymatlarni saqlash
    adjustmentRecord.after_total_volume = vagon.total_volume_m3;
    adjustmentRecord.after_available_volume = vagon.available_volume_m3;
    adjustmentRecord.after_remaining_volume = vagon.remaining_volume_m3;
    
    await vagon.save();
    
    // Smart cache invalidation
    SmartInvalidation.onVagonChange(vagon._id);
    
    const actionText = adjustment_type === 'loss' ? 'brak' : 'tuzatish';
    res.json({ 
      message: `Vagon hajmi muvaffaqiyatli tuzatildi (${actionText}: ${adjustmentValue} m³)`,
      vagon,
      adjustment: adjustmentRecord
    });
  } catch (error) {
    console.error('Volume adjustment error:', error);
    res.status(500).json({ message: 'Hajm tuzatishda xatolik', error: error.message });
  }
});

module.exports = router;
