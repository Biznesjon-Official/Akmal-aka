const express = require('express');
const ExpenseAllocation = require('../models/ExpenseAllocation');
const VagonLot = require('../models/VagonLot');
const Cash = require('../models/Cash');
const auth = require('../middleware/auth');
const { auditMiddleware, logUserAction } = require('../middleware/auditLog');

const router = express.Router();

// Barcha xarajat taqsimotlarini olish
router.get('/', auth, async (req, res) => {
  try {
    const { 
      vagon, 
      allocation_type, 
      startDate, 
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = { isDeleted: false };
    
    if (vagon) filter.vagon = vagon;
    if (allocation_type) filter.allocation_type = allocation_type;
    
    if (startDate || endDate) {
      filter.allocation_date = {};
      if (startDate) filter.allocation_date.$gte = new Date(startDate);
      if (endDate) filter.allocation_date.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const allocations = await ExpenseAllocation.find(filter)
      .populate('vagon', 'vagon_number')
      .populate('expense', 'summa xarajatTuri izoh')
      .populate('lots.lot', 'dimensions volume_m3')
      .sort({ allocation_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ExpenseAllocation.countDocuments(filter);
    
    res.json({
      allocations,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('ExpenseAllocation list error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Xarajatni taqsimlash
router.post('/', [auth, auditMiddleware('ExpenseAllocation')], async (req, res) => {
  try {
    const {
      vagon,
      expense,
      allocation_type,
      lots_allocation,
      allocation_notes
    } = req.body;
    
    // Xarajat ma'lumotlarini olish
    const expenseData = await Kassa.findById(expense);
    if (!expenseData) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    if (expenseData.turi !== 'rasxod') {
      return res.status(400).json({ message: 'Faqat xarajat turini taqsimlash mumkin' });
    }
    
    // Vagon lotlarini olish
    const vagonLots = await VagonLot.find({ 
      vagon, 
      isDeleted: false,
      warehouse_remaining_volume_m3: { $gt: 0 } // Faqat qolgan hajmi bor lotlar
    });
    
    if (vagonLots.length === 0) {
      return res.status(400).json({ message: 'Vagon uchun faol lotlar topilmadi' });
    }
    
    let allocatedLots = [];
    let totalAllocatedAmount = 0;
    
    if (allocation_type === 'equal') {
      // Teng taqsimlash
      const amountPerLot = expenseData.summa / vagonLots.length;
      
      allocatedLots = vagonLots.map(lot => ({
        lot: lot._id,
        allocated_amount: amountPerLot,
        allocation_percentage: (100 / vagonLots.length).toFixed(2),
        lot_volume_m3: lot.warehouse_remaining_volume_m3,
        cost_per_m3: amountPerLot / lot.warehouse_remaining_volume_m3
      }));
      
      totalAllocatedAmount = expenseData.summa;
      
    } else if (allocation_type === 'volume_based') {
      // Hajm bo'yicha taqsimlash
      const totalVolume = vagonLots.reduce((sum, lot) => sum + lot.warehouse_remaining_volume_m3, 0);
      
      allocatedLots = vagonLots.map(lot => {
        const percentage = (lot.warehouse_remaining_volume_m3 / totalVolume) * 100;
        const allocatedAmount = (expenseData.summa * percentage) / 100;
        
        return {
          lot: lot._id,
          allocated_amount: allocatedAmount,
          allocation_percentage: percentage.toFixed(2),
          lot_volume_m3: lot.warehouse_remaining_volume_m3,
          cost_per_m3: allocatedAmount / lot.warehouse_remaining_volume_m3
        };
      });
      
      totalAllocatedAmount = expenseData.summa;
      
    } else if (allocation_type === 'manual' && lots_allocation) {
      // Qo'lda taqsimlash
      const totalPercentage = lots_allocation.reduce((sum, item) => sum + item.percentage, 0);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({ message: 'Foizlar yig\'indisi 100% bo\'lishi kerak' });
      }
      
      allocatedLots = lots_allocation.map(item => {
        const lot = vagonLots.find(l => l._id.toString() === item.lot_id);
        if (!lot) {
          throw new Error(`Lot topilmadi: ${item.lot_id}`);
        }
        
        const allocatedAmount = (expenseData.summa * item.percentage) / 100;
        
        return {
          lot: lot._id,
          allocated_amount: allocatedAmount,
          allocation_percentage: item.percentage,
          lot_volume_m3: lot.warehouse_remaining_volume_m3,
          cost_per_m3: allocatedAmount / lot.warehouse_remaining_volume_m3
        };
      });
      
      totalAllocatedAmount = expenseData.summa;
      
    } else {
      return res.status(400).json({ message: 'Noto\'g\'ri taqsimlash turi' });
    }
    
    // ExpenseAllocation yaratish
    const allocation = new ExpenseAllocation({
      vagon,
      expense,
      allocation_type,
      total_expense_amount: expenseData.summa,
      expense_currency: expenseData.valyuta,
      lots: allocatedLots,
      total_allocated_amount: totalAllocatedAmount,
      allocation_date: new Date(),
      allocation_notes,
      created_by: req.user.id
    });
    
    await allocation.save();
    
    // Lotlarga allocated_expenses qo'shish
    for (const lotAllocation of allocatedLots) {
      await VagonLot.findByIdAndUpdate(
        lotAllocation.lot,
        { 
          $inc: { allocated_expenses: lotAllocation.allocated_amount }
        }
      );
    }
    
    // Xarajatni "taqsimlangan" deb belgilash
    await Kassa.findByIdAndUpdate(expense, {
      allocated_to_lots: true,
      allocation_id: allocation._id
    });
    
    // Populate qilish
    await allocation.populate([
      { path: 'vagon', select: 'vagon_number' },
      { path: 'expense', select: 'summa xarajatTuri izoh' },
      { path: 'lots.lot', select: 'dimensions volume_m3' }
    ]);
    
    res.status(201).json({
      message: 'Xarajat muvaffaqiyatli taqsimlandi',
      allocation
    });
  } catch (error) {
    console.error('ExpenseAllocation create error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Taqsimotni yangilash
router.put('/:id', [auth, auditMiddleware('ExpenseAllocation')], async (req, res) => {
  try {
    const { id } = req.params;
    const { lots_allocation, allocation_notes } = req.body;
    
    const allocation = await ExpenseAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: 'Taqsimot topilmadi' });
    }
    
    // Eski taqsimotni bekor qilish
    for (const lotAllocation of allocation.lots) {
      await VagonLot.findByIdAndUpdate(
        lotAllocation.lot,
        { 
          $inc: { allocated_expenses: -lotAllocation.allocated_amount }
        }
      );
    }
    
    // Yangi taqsimot
    let newAllocatedLots = [];
    let totalAllocatedAmount = 0;
    
    if (lots_allocation) {
      const totalPercentage = lots_allocation.reduce((sum, item) => sum + item.percentage, 0);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({ message: 'Foizlar yig\'indisi 100% bo\'lishi kerak' });
      }
      
      for (const item of lots_allocation) {
        const lot = await VagonLot.findById(item.lot_id);
        if (!lot) {
          return res.status(404).json({ message: `Lot topilmadi: ${item.lot_id}` });
        }
        
        const allocatedAmount = (allocation.total_expense_amount * item.percentage) / 100;
        
        newAllocatedLots.push({
          lot: lot._id,
          allocated_amount: allocatedAmount,
          allocation_percentage: item.percentage,
          lot_volume_m3: lot.warehouse_remaining_volume_m3,
          cost_per_m3: allocatedAmount / lot.warehouse_remaining_volume_m3
        });
        
        totalAllocatedAmount += allocatedAmount;
      }
    }
    
    // Yangi taqsimotni saqlash
    allocation.lots = newAllocatedLots;
    allocation.total_allocated_amount = totalAllocatedAmount;
    allocation.allocation_notes = allocation_notes || allocation.allocation_notes;
    allocation.updated_by = req.user.id;
    
    await allocation.save();
    
    // Lotlarga yangi taqsimotni qo'shish
    for (const lotAllocation of newAllocatedLots) {
      await VagonLot.findByIdAndUpdate(
        lotAllocation.lot,
        { 
          $inc: { allocated_expenses: lotAllocation.allocated_amount }
        }
      );
    }
    
    await allocation.populate([
      { path: 'vagon', select: 'vagon_number' },
      { path: 'expense', select: 'summa xarajatTuri izoh' },
      { path: 'lots.lot', select: 'dimensions volume_m3' }
    ]);
    
    res.json({
      message: 'Taqsimot muvaffaqiyatli yangilandi',
      allocation
    });
  } catch (error) {
    console.error('ExpenseAllocation update error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Taqsimotni bekor qilish
router.delete('/:id', [auth, auditMiddleware('ExpenseAllocation')], async (req, res) => {
  try {
    const { id } = req.params;
    
    const allocation = await ExpenseAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: 'Taqsimot topilmadi' });
    }
    
    // Lotlardan taqsimlangan xarajatni olib tashlash
    for (const lotAllocation of allocation.lots) {
      await VagonLot.findByIdAndUpdate(
        lotAllocation.lot,
        { 
          $inc: { allocated_expenses: -lotAllocation.allocated_amount }
        }
      );
    }
    
    // Xarajatni "taqsimlanmagan" deb belgilash
    await Kassa.findByIdAndUpdate(allocation.expense, {
      allocated_to_lots: false,
      $unset: { allocation_id: 1 }
    });
    
    // Soft delete
    allocation.isDeleted = true;
    allocation.deleted_by = req.user.id;
    allocation.deleted_at = new Date();
    
    await allocation.save();
    
    res.json({ message: 'Taqsimot muvaffaqiyatli bekor qilindi' });
  } catch (error) {
    console.error('ExpenseAllocation delete error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Vagon bo'yicha taqsimot statistikasi
router.get('/stats/:vagonId', auth, async (req, res) => {
  try {
    const { vagonId } = req.params;
    
    // Vagon bo'yicha barcha taqsimotlar
    const allocations = await ExpenseAllocation.find({
      vagon: vagonId,
      isDeleted: false
    }).populate('expense', 'summa xarajatTuri valyuta');
    
    // Umumiy statistika
    const totalStats = {
      total_allocations: allocations.length,
      total_allocated_amount: 0,
      by_expense_type: {},
      by_currency: {}
    };
    
    allocations.forEach(allocation => {
      totalStats.total_allocated_amount += allocation.total_allocated_amount;
      
      // Xarajat turi bo'yicha
      const expenseType = allocation.expense.xarajatTuri || 'Noma\'lum';
      if (!totalStats.by_expense_type[expenseType]) {
        totalStats.by_expense_type[expenseType] = 0;
      }
      totalStats.by_expense_type[expenseType] += allocation.total_allocated_amount;
      
      // Valyuta bo'yicha
      const currency = allocation.expense_currency;
      if (!totalStats.by_currency[currency]) {
        totalStats.by_currency[currency] = 0;
      }
      totalStats.by_currency[currency] += allocation.total_allocated_amount;
    });
    
    // Lot bo'yicha taqsimot
    const lotStats = {};
    allocations.forEach(allocation => {
      allocation.lots.forEach(lotAllocation => {
        const lotId = lotAllocation.lot.toString();
        if (!lotStats[lotId]) {
          lotStats[lotId] = {
            lot_id: lotId,
            total_allocated: 0,
            allocations_count: 0
          };
        }
        lotStats[lotId].total_allocated += lotAllocation.allocated_amount;
        lotStats[lotId].allocations_count += 1;
      });
    });
    
    res.json({
      total: totalStats,
      by_lots: Object.values(lotStats),
      recent_allocations: allocations.slice(-5) // Oxirgi 5 ta
    });
  } catch (error) {
    console.error('ExpenseAllocation stats error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Taqsimlanmagan xarajatlar
router.get('/unallocated', auth, async (req, res) => {
  try {
    const { vagon } = req.query;
    
    const filter = {
      turi: 'rasxod',
      isDeleted: false,
      $or: [
        { allocated_to_lots: { $exists: false } },
        { allocated_to_lots: false }
      ]
    };
    
    if (vagon) {
      filter.woodLot = { $exists: true }; // Vagon bilan bog'langan xarajatlar
      // Vagon ID bo'yicha filter qo'shish kerak bo'lsa
    }
    
    const unallocatedExpenses = await Kassa.find(filter)
      .populate('woodLot', 'vagon dimensions')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const totalUnallocated = await Kassa.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$valyuta',
          total: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      expenses: unallocatedExpenses,
      summary: totalUnallocated
    });
  } catch (error) {
    console.error('Unallocated expenses error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;