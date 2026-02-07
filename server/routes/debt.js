const express = require('express');
const router = express.Router();
const Debt = require('../models/Debt');
const Client = require('../models/Client');
const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Barcha qarzlar ro'yxati
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      client_id,
      search,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const filter = { isDeleted: false };
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Client filter
    if (client_id) {
      filter.client = client_id;
    }
    
    // Search filter
    let searchFilter = {};
    if (search) {
      const clients = await Client.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ],
        isDeleted: false
      }).select('_id');
      
      const clientIds = clients.map(c => c._id);
      
      if (clientIds.length > 0) {
        searchFilter.client = { $in: clientIds };
      } else {
        // Agar mijoz topilmasa, bo'sh natija qaytarish
        return res.json({
          debts: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: parseInt(limit)
          }
        });
      }
    }
    
    const finalFilter = { ...filter, ...searchFilter };
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;
    
    // Parallel execution
    const [total, debts] = await Promise.all([
      Debt.countDocuments(finalFilter),
      Debt.find(finalFilter)
        .populate('client', 'name phone email')
        .populate('vagon', 'vagonCode month sending_place receiving_place')
        .populate('yogoch', 'name dimensions quantity volume_m3')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);
    
    // Status'ni yangilash (overdue check)
    const updatedDebts = debts.map(debt => {
      if (debt.status === 'active') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (new Date(debt.sale_date) < thirtyDaysAgo) {
          debt.status = 'overdue';
          // Database'da ham yangilash (background task)
          Debt.findByIdAndUpdate(debt._id, { status: 'overdue' }).catch(err => {
            logger.error('Debt status update error:', err);
          });
        }
      }
      return debt;
    });
    
    const totalPages = Math.ceil(total / limitNum);
    
    res.json({
      debts: updatedDebts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    logger.error('Debt list error:', error);
    res.status(500).json({ message: 'Qarzlar ro\'yxatini olishda xatolik' });
  }
});

// Bitta qarz ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const debt = await Debt.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
      .populate('client', 'name phone email')
      .populate('vagon', 'vagonCode month sending_place receiving_place')
      .populate('yogoch', 'name dimensions quantity volume_m3')
      .populate('payment_history.created_by', 'username');
    
    if (!debt) {
      return res.status(404).json({ message: 'Qarz topilmadi' });
    }
    
    res.json(debt);
  } catch (error) {
    logger.error('Debt get error:', error);
    res.status(500).json({ message: 'Qarz ma\'lumotlarini olishda xatolik' });
  }
});

// Yangi qarz yaratish (kassa sahifasidan avtomatik)
router.post('/', auth, async (req, res) => {
  try {
    const {
      client_id,
      vagon_id,
      yogoch_id,
      total_amount,
      paid_amount = 0,
      currency,
      sold_quantity,
      sale_date,
      notes
    } = req.body;
    
    // Validatsiya
    if (!client_id || !vagon_id || !yogoch_id || !total_amount || !currency || !sold_quantity) {
      return res.status(400).json({ 
        message: 'Barcha majburiy maydonlar to\'ldirilishi shart' 
      });
    }
    
    if (total_amount <= 0) {
      return res.status(400).json({ 
        message: 'Jami summa 0 dan katta bo\'lishi kerak' 
      });
    }
    
    if (paid_amount < 0) {
      return res.status(400).json({ 
        message: 'To\'langan summa 0 dan kichik bo\'lmasin' 
      });
    }
    
    if (paid_amount > total_amount) {
      return res.status(400).json({ 
        message: 'To\'langan summa jami summadan katta bo\'lmasin' 
      });
    }
    
    // Mijoz, vagon va yog'och mavjudligini tekshirish
    const [client, vagon, yogoch] = await Promise.all([
      Client.findOne({ _id: client_id, isDeleted: false }),
      Vagon.findOne({ _id: vagon_id, isDeleted: false }),
      VagonLot.findOne({ _id: yogoch_id, isDeleted: false })
    ]);
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    if (!yogoch) {
      return res.status(404).json({ message: 'Yog\'och topilmadi' });
    }
    
    // Yangi qarz yaratish
    const debt = new Debt({
      client: client_id,
      vagon: vagon_id,
      yogoch: yogoch_id,
      total_amount,
      paid_amount,
      currency,
      sold_quantity,
      sale_date: sale_date || new Date(),
      notes
    });
    
    // Agar dastlabki to'lov bo'lsa, payment history'ga qo'shish
    if (paid_amount > 0) {
      debt.payment_history.push({
        amount: paid_amount,
        date: new Date(),
        description: 'Dastlabki to\'lov',
        created_by: req.user.userId
      });
    }
    
    await debt.save();
    
    // Populate qilib qaytarish
    const populatedDebt = await Debt.findById(debt._id)
      .populate('client', 'name phone')
      .populate('vagon', 'vagonCode')
      .populate('yogoch', 'name dimensions');
    
    logger.info(`Yangi qarz yaratildi: ${client.name} - ${formatCurrency(total_amount, currency)}`);
    
    res.status(201).json(populatedDebt);
  } catch (error) {
    logger.error('Debt create error:', error);
    res.status(400).json({ message: error.message || 'Qarz yaratishda xatolik' });
  }
});

// To'lov qo'shish
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, description, date } = req.body;
    
    // Validatsiya
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        message: 'To\'lov summasi 0 dan katta bo\'lishi kerak' 
      });
    }
    
    if (!description || description.trim().length < 3) {
      return res.status(400).json({ 
        message: 'Tavsif kamida 3 belgi bo\'lishi kerak' 
      });
    }
    
    const debt = await Debt.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!debt) {
      return res.status(404).json({ message: 'Qarz topilmadi' });
    }
    
    if (debt.status === 'paid') {
      return res.status(400).json({ message: 'Bu qarz allaqachon to\'langan' });
    }
    
    if (amount > debt.remaining_amount) {
      return res.status(400).json({ 
        message: `To'lov summasi qolgan qarzdan (${debt.remaining_amount.toFixed(2)} ${debt.currency}) katta bo'lmasin` 
      });
    }
    
    // To'lov qo'shish
    debt.payment_history.push({
      amount,
      date: date || new Date(),
      description: description.trim(),
      created_by: req.user.userId
    });
    
    debt.paid_amount += amount;
    
    await debt.save();
    
    // Populate qilib qaytarish
    const updatedDebt = await Debt.findById(debt._id)
      .populate('client', 'name phone')
      .populate('vagon', 'vagonCode')
      .populate('yogoch', 'name dimensions');
    
    logger.info(`To'lov qo'shildi: ${debt._id} - ${amount} ${debt.currency}`);
    
    res.json({
      message: 'To\'lov muvaffaqiyatli qo\'shildi',
      debt: updatedDebt
    });
  } catch (error) {
    logger.error('Payment add error:', error);
    res.status(400).json({ message: error.message || 'To\'lov qo\'shishda xatolik' });
  }
});

// Qarzni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const debt = await Debt.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!debt) {
      return res.status(404).json({ message: 'Qarz topilmadi' });
    }
    
    // Faqat admin yoki to'langan qarzlarni o'chirish mumkin
    if (req.user.role !== 'admin' && debt.status !== 'paid') {
      return res.status(403).json({ 
        message: 'Faqat to\'langan qarzlarni o\'chirish mumkin' 
      });
    }
    
    debt.isDeleted = true;
    debt.deletedAt = new Date();
    debt.deletedBy = req.user.userId;
    
    await debt.save();
    
    logger.info(`Qarz o'chirildi: ${debt._id}`);
    
    res.json({ message: 'Qarz muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    logger.error('Debt delete error:', error);
    res.status(500).json({ message: 'Qarzni o\'chirishda xatolik' });
  }
});

// Mijoz qarzlari
router.get('/client/:clientId', auth, async (req, res) => {
  try {
    const debts = await Debt.find({ 
      client: req.params.clientId, 
      isDeleted: false 
    })
      .populate('vagon', 'vagonCode month')
      .populate('yogoch', 'name dimensions quantity')
      .sort({ createdAt: -1 });
    
    res.json(debts);
  } catch (error) {
    logger.error('Client debts error:', error);
    res.status(500).json({ message: 'Mijoz qarzlarini olishda xatolik' });
  }
});

// Statistika
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const [
      totalDebts,
      activeDebts,
      paidDebts,
      overdueDebts,
      totalAmount,
      totalPaid,
      totalRemaining
    ] = await Promise.all([
      Debt.countDocuments({ isDeleted: false }),
      Debt.countDocuments({ status: 'active', isDeleted: false }),
      Debt.countDocuments({ status: 'paid', isDeleted: false }),
      Debt.countDocuments({ status: 'overdue', isDeleted: false }),
      Debt.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$currency', total: { $sum: '$total_amount' } } }
      ]),
      Debt.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$currency', total: { $sum: '$paid_amount' } } }
      ]),
      Debt.aggregate([
        { $match: { status: 'active', isDeleted: false } },
        { $group: { _id: '$currency', total: { $sum: '$remaining_amount' } } }
      ])
    ]);
    
    res.json({
      counts: {
        total: totalDebts,
        active: activeDebts,
        paid: paidDebts,
        overdue: overdueDebts
      },
      amounts: {
        total: totalAmount,
        paid: totalPaid,
        remaining: totalRemaining
      }
    });
  } catch (error) {
    logger.error('Debt stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

// Helper function
function formatCurrency(amount, currency) {
  return `${amount.toFixed(2)} ${currency}`;
}

module.exports = router;