const express = require('express');
const router = express.Router();
const Vagon = require('../models/Vagon');
const auth = require('../middleware/auth');

// Barcha vagonlar ro'yxati
router.get('/', auth, async (req, res) => {
  try {
    const { status, month } = req.query;
    
    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (month) filter.month = month;
    
    const vagons = await Vagon.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean(); // OPTIMIZATSIYA
    
    // Har bir vagon uchun lotlarni olish - OPTIMIZATSIYA
    const VagonLot = require('../models/VagonLot');
    const vagonIds = vagons.map(v => v._id);
    const allLots = await VagonLot.find({ 
      vagon: { $in: vagonIds }, 
      isDeleted: false 
    }).lean();
    
    // Lotlarni vagonlarga biriktirish
    const lotsMap = {};
    allLots.forEach(lot => {
      const vagonId = lot.vagon.toString();
      if (!lotsMap[vagonId]) lotsMap[vagonId] = [];
      lotsMap[vagonId].push(lot);
    });
    
    vagons.forEach(vagon => {
      vagon.lots = lotsMap[vagon._id.toString()] || [];
    });
    
    res.json(vagons);
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
router.post('/:id/close', auth, async (req, res) => {
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
    
    vagon.status = 'closed';
    await vagon.save();
    
    res.json({ 
      message: 'Vagon yopildi',
      vagon 
    });
  } catch (error) {
    console.error('Vagon close error:', error);
    res.status(500).json({ message: 'Vagonni yopishda xatolik' });
  }
});

module.exports = router;
