const express = require('express');
const LossLiability = require('../models/LossLiability');
const auth = require('../middleware/auth');
const { auditMiddleware, logUserAction } = require('../middleware/auditLog');

const router = express.Router();

// Barcha javobgarliklarni olish
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      responsible_person, 
      loss_type, 
      startDate, 
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = { isDeleted: false };
    
    if (status) filter.status = status;
    if (responsible_person) filter['responsible_person.name'] = new RegExp(responsible_person, 'i');
    if (loss_type) filter.loss_type = loss_type;
    
    if (startDate || endDate) {
      filter.incident_date = {};
      if (startDate) filter.incident_date.$gte = new Date(startDate);
      if (endDate) filter.incident_date.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const liabilities = await LossLiability.find(filter)
      .populate('vagon', 'vagon_number')
      .populate('lot', 'dimensions volume_m3')
      .populate('sale', 'sale_date client_received_volume_m3')
      .sort({ incident_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await LossLiability.countDocuments(filter);
    
    res.json({
      liabilities,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('LossLiability list error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Javobgarlik yaratish
router.post('/', [auth, auditMiddleware('LossLiability')], async (req, res) => {
  try {
    const {
      loss_source_type,
      loss_source_id,
      loss_type,
      loss_volume_m3,
      loss_value_estimation,
      loss_value_currency,
      responsible_person,
      liability_percentage = 100,
      incident_date,
      incident_description,
      loss_location
    } = req.body;
    
    // Javobgarlik summasi
    const liability_amount = (loss_value_estimation * liability_percentage) / 100;
    
    const liability = new LossLiability({
      loss_source_type,
      loss_source_id,
      loss_source_model: loss_source_type === 'vagon_lot' ? 'VagonLot' : 'VagonSale',
      loss_type,
      loss_volume_m3,
      loss_value_estimation,
      loss_value_currency,
      responsible_person: {
        name: responsible_person.name,
        position: responsible_person.position || '',
        phone: responsible_person.phone || '',
        employee_id: responsible_person.employee_id || ''
      },
      liability_amount,
      liability_currency: loss_value_currency,
      liability_percentage,
      incident_date: incident_date || new Date(),
      incident_description,
      loss_location,
      reported_by: req.user.id,
      status: 'liability_assigned'
    });
    
    await liability.save();
    
    // Populate qilish
    await liability.populate([
      { path: 'vagon', select: 'vagon_number' },
      { path: 'lot', select: 'dimensions volume_m3' },
      { path: 'sale', select: 'sale_date client_received_volume_m3' }
    ]);
    
    res.status(201).json({
      message: 'Javobgarlik muvaffaqiyatli yaratildi',
      liability
    });
  } catch (error) {
    console.error('LossLiability create error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Javobgarlikni yangilash
router.put('/:id', [auth, auditMiddleware('LossLiability')], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Javobgarlik foizini yangilash
    if (updates.liability_percentage && updates.loss_value_estimation) {
      updates.liability_amount = (updates.loss_value_estimation * updates.liability_percentage) / 100;
    }
    
    const liability = await LossLiability.findByIdAndUpdate(
      id,
      { ...updates, updated_by: req.user.id },
      { new: true, runValidators: true }
    ).populate([
      { path: 'vagon', select: 'vagon_number' },
      { path: 'lot', select: 'dimensions volume_m3' },
      { path: 'sale', select: 'sale_date client_received_volume_m3' }
    ]);
    
    if (!liability) {
      return res.status(404).json({ message: 'Javobgarlik topilmadi' });
    }
    
    res.json({
      message: 'Javobgarlik muvaffaqiyatli yangilandi',
      liability
    });
  } catch (error) {
    console.error('LossLiability update error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Javobgarlik holatini o'zgartirish
router.patch('/:id/status', [auth, auditMiddleware('LossLiability')], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;
    
    const validStatuses = [
      'liability_assigned',
      'under_investigation', 
      'liability_confirmed',
      'payment_pending',
      'partially_paid',
      'fully_paid',
      'disputed',
      'resolved',
      'cancelled'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Noto\'g\'ri holat' });
    }
    
    const updateData = {
      status,
      updated_by: req.user.id
    };
    
    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes;
    }
    
    if (status === 'resolved' || status === 'fully_paid') {
      updateData.resolution_date = new Date();
    }
    
    const liability = await LossLiability.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'vagon', select: 'vagon_number' },
      { path: 'lot', select: 'dimensions volume_m3' },
      { path: 'sale', select: 'sale_date client_received_volume_m3' }
    ]);
    
    if (!liability) {
      return res.status(404).json({ message: 'Javobgarlik topilmadi' });
    }
    
    res.json({
      message: 'Holat muvaffaqiyatli yangilandi',
      liability
    });
  } catch (error) {
    console.error('LossLiability status update error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// To'lov qilish
router.post('/:id/payment', [auth, auditMiddleware('LossLiabilityPayment')], async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_amount, payment_method, payment_notes } = req.body;
    
    const liability = await LossLiability.findById(id);
    if (!liability) {
      return res.status(404).json({ message: 'Javobgarlik topilmadi' });
    }
    
    if (payment_amount <= 0) {
      return res.status(400).json({ message: 'To\'lov summasi 0 dan katta bo\'lishi kerak' });
    }
    
    const remainingAmount = liability.liability_amount - liability.paid_amount;
    if (payment_amount > remainingAmount) {
      return res.status(400).json({ 
        message: `To'lov summasi qolgan qarzdan (${remainingAmount}) katta bo'lishi mumkin emas` 
      });
    }
    
    // To'lovni qo'shish
    liability.payments.push({
      payment_date: new Date(),
      payment_amount,
      payment_method,
      payment_notes,
      recorded_by: req.user.id
    });
    
    liability.paid_amount += payment_amount;
    
    // Holatni yangilash
    if (liability.paid_amount >= liability.liability_amount) {
      liability.status = 'fully_paid';
      liability.resolution_date = new Date();
    } else if (liability.paid_amount > 0) {
      liability.status = 'partially_paid';
    }
    
    liability.updated_by = req.user.id;
    
    await liability.save();
    
    res.json({
      message: 'To\'lov muvaffaqiyatli qo\'shildi',
      liability,
      remaining_amount: liability.liability_amount - liability.paid_amount
    });
  } catch (error) {
    console.error('LossLiability payment error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Javobgarlik statistikasi
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchFilter = { isDeleted: false };
    if (startDate || endDate) {
      matchFilter.incident_date = {};
      if (startDate) matchFilter.incident_date.$gte = new Date(startDate);
      if (endDate) matchFilter.incident_date.$lte = new Date(endDate);
    }
    
    // Umumiy statistika
    const totalStats = await LossLiability.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total_cases: { $sum: 1 },
          total_loss_volume: { $sum: '$loss_volume_m3' },
          total_liability_amount: { $sum: '$liability_amount' },
          total_paid_amount: { $sum: '$paid_amount' },
          avg_liability_amount: { $avg: '$liability_amount' }
        }
      }
    ]);
    
    // Holat bo'yicha statistika
    const statusStats = await LossLiability.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$liability_amount' },
          paid_amount: { $sum: '$paid_amount' }
        }
      }
    ]);
    
    // Javobgar shaxslar bo'yicha
    const responsiblePersonStats = await LossLiability.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$responsible_person.name',
          cases_count: { $sum: 1 },
          total_liability: { $sum: '$liability_amount' },
          total_paid: { $sum: '$paid_amount' },
          avg_liability: { $avg: '$liability_amount' }
        }
      },
      { $sort: { total_liability: -1 } }
    ]);
    
    // Yo'qotish turi bo'yicha
    const lossTypeStats = await LossLiability.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$loss_type',
          cases_count: { $sum: 1 },
          total_volume: { $sum: '$loss_volume_m3' },
          total_liability: { $sum: '$liability_amount' }
        }
      }
    ]);
    
    res.json({
      total: totalStats[0] || {
        total_cases: 0,
        total_loss_volume: 0,
        total_liability_amount: 0,
        total_paid_amount: 0,
        avg_liability_amount: 0
      },
      by_status: statusStats,
      by_responsible_person: responsiblePersonStats,
      by_loss_type: lossTypeStats
    });
  } catch (error) {
    console.error('LossLiability stats error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Javobgarlikni o'chirish (soft delete)
router.delete('/:id', [auth, auth.adminOnly, auditMiddleware('LossLiability')], async (req, res) => {
  try {
    const { id } = req.params;
    
    const liability = await LossLiability.findByIdAndUpdate(
      id,
      { 
        isDeleted: true, 
        deleted_by: req.user.id,
        deleted_at: new Date()
      },
      { new: true }
    );
    
    if (!liability) {
      return res.status(404).json({ message: 'Javobgarlik topilmadi' });
    }
    
    res.json({ message: 'Javobgarlik muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('LossLiability delete error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;