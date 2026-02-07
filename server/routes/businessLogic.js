const express = require('express');
const mongoose = require('mongoose');
const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');
const VagonSale = require('../models/VagonSale');
const Cash = require('../models/Cash');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// TO'LIQ BIZNES LOGIKASI - Vagon bo'yicha hisobot
router.get('/vagon-full-report/:vagonId', auth, async (req, res) => {
  try {
    const { vagonId } = req.params;
    
    // 1. VAGON MA'LUMOTLARI
    const vagon = await Vagon.findById(vagonId);
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    // 2. LOTLAR (Kelgan yog'och)
    const lots = await VagonLot.find({ vagon: vagonId, isDeleted: false })
      .populate('vagon', 'vagonCode sending_place receiving_place');
    
    // 3. XARAJATLAR (Vagon bo'yicha)
    const expenses = await Kassa.find({ 
      vagon: vagonId, 
      turi: 'rasxod',
      isDeleted: false 
    }).populate('yaratuvchi', 'username');
    
    // 4. SOTUVLAR
    const sales = await VagonSale.find({ vagon: vagonId, isDeleted: false })
      .populate('client', 'name phone')
      .populate('lot', 'dimensions volume_m3');
    
    // 5. HISOB-KITOBLAR
    let totalPurchaseCost = 0;
    let totalVolume = 0;
    let totalLoss = 0;
    let totalAvailable = 0;
    let totalSold = 0;
    let totalRemaining = 0;
    
    // Lot bo'yicha hisoblash (yangi terminologiya bilan)
    lots.forEach(lot => {
      totalPurchaseCost += lot.purchase_amount || 0;
      totalVolume += lot.volume_m3 || 0;
      totalLoss += lot.loss_volume_m3 || 0;
      totalAvailable += lot.warehouse_available_volume_m3 || lot.available_volume_m3 || 0;
      totalSold += lot.warehouse_dispatched_volume_m3 || lot.sold_volume_m3 || 0;
      totalRemaining += lot.warehouse_remaining_volume_m3 || lot.remaining_volume_m3 || 0;
    });
    
    // Xarajatlar bo'yicha hisoblash
    let totalExpenses = 0;
    const expensesByCategory = {};
    const expensesByResponsible = {};
    
    expenses.forEach(expense => {
      totalExpenses += expense.summaRUB || expense.summa;
      
      // Kategoriya bo'yicha
      if (!expensesByCategory[expense.xarajatTuri]) {
        expensesByCategory[expense.xarajatTuri] = 0;
      }
      expensesByCategory[expense.xarajatTuri] += expense.summaRUB || expense.summa;
      
      // Javobgar shaxs bo'yicha (qo'shimcha ma'lumotdan)
      try {
        const additionalInfo = JSON.parse(expense.qoshimchaMalumot || '{}');
        const responsible = additionalInfo.javobgarShaxs || 'Noma\'lum';
        if (!expensesByResponsible[responsible]) {
          expensesByResponsible[responsible] = 0;
        }
        expensesByResponsible[responsible] += expense.summaRUB || expense.summa;
      } catch (e) {
        // JSON parse error
      }
    });
    
    // Sotuvlar bo'yicha hisoblash
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDebt = 0;
    let totalClientLoss = 0;
    const salesByClient = {};
    const lossByResponsible = {};
    
    sales.forEach(sale => {
      totalRevenue += sale.total_price;
      totalPaid += sale.paid_amount;
      totalDebt += sale.debt;
      totalClientLoss += sale.client_loss_m3;
      
      // Mijoz bo'yicha
      const clientName = sale.client?.name || 'Noma\'lum';
      if (!salesByClient[clientName]) {
        salesByClient[clientName] = {
          totalSales: 0,
          totalPaid: 0,
          totalDebt: 0,
          salesCount: 0
        };
      }
      salesByClient[clientName].totalSales += sale.total_price;
      salesByClient[clientName].totalPaid += sale.paid_amount;
      salesByClient[clientName].totalDebt += sale.debt;
      salesByClient[clientName].salesCount += 1;
      
      // Yo'qotish javobgari bo'yicha
      if (sale.client_loss_m3 > 0) {
        const responsible = sale.client_loss_responsible || 'Noma\'lum';
        if (!lossByResponsible[responsible]) {
          lossByResponsible[responsible] = 0;
        }
        lossByResponsible[responsible] += sale.client_loss_m3;
      }
    });
    
    // 6. FOYDA/ZARAR HISOBLASH
    const totalCost = totalPurchaseCost + totalExpenses;
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const roi = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;
    
    // 7. BRAK TAHLILI
    const brakAnalysis = {
      // Lot brak (kelishda yo'qotish)
      lotLoss: {
        totalVolume: totalLoss,
        percentage: totalVolume > 0 ? (totalLoss / totalVolume) * 100 : 0,
        byResponsible: {}
      },
      // Mijoz brak (sotuvda yo'qotish)
      clientLoss: {
        totalVolume: totalClientLoss,
        percentage: totalSold > 0 ? (totalClientLoss / totalSold) * 100 : 0,
        byResponsible: lossByResponsible
      }
    };
    
    // Lot brak javobgarlari
    lots.forEach(lot => {
      if (lot.loss_volume_m3 > 0) {
        const responsible = lot.loss_responsible_person || 'Noma\'lum';
        if (!brakAnalysis.lotLoss.byResponsible[responsible]) {
          brakAnalysis.lotLoss.byResponsible[responsible] = 0;
        }
        brakAnalysis.lotLoss.byResponsible[responsible] += lot.loss_volume_m3;
      }
    });
    
    // 8. JAVOBGARLIK TAHLILI
    const responsibilityAnalysis = {
      expenses: expensesByResponsible,
      losses: {
        ...brakAnalysis.lotLoss.byResponsible,
        ...brakAnalysis.clientLoss.byResponsible
      }
    };
    
    // 9. QARZLAR TAHLILI
    const debtAnalysis = {
      totalDebt,
      totalPaid,
      paymentRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
      byClient: salesByClient
    };
    
    // 10. NATIJA
    const result = {
      vagon: {
        id: vagon._id,
        code: vagon.vagonCode,
        route: `${vagon.sending_place} → ${vagon.receiving_place}`,
        month: vagon.month,
        status: vagon.status
      },
      
      // Hajm ma'lumotlari
      volume: {
        total: totalVolume,
        loss: totalLoss,
        available: totalAvailable,
        sold: totalSold,
        remaining: totalRemaining,
        lossPercentage: totalVolume > 0 ? (totalLoss / totalVolume) * 100 : 0,
        soldPercentage: totalAvailable > 0 ? (totalSold / totalAvailable) * 100 : 0
      },
      
      // Moliyaviy ma'lumotlar
      finance: {
        purchaseCost: totalPurchaseCost,
        totalExpenses,
        totalCost,
        totalRevenue,
        grossProfit,
        profitMargin,
        roi,
        totalPaid,
        totalDebt,
        paymentRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0
      },
      
      // Brak tahlili
      brakAnalysis,
      
      // Javobgarlik
      responsibilityAnalysis,
      
      // Qarzlar
      debtAnalysis,
      
      // Xarajat kategoriyalari
      expensesByCategory,
      
      // Mijozlar bo'yicha sotuv
      salesByClient,
      
      // Batafsil ma'lumotlar
      details: {
        lots: lots.length,
        expenses: expenses.length,
        sales: sales.length,
        clients: Object.keys(salesByClient).length
      }
    };
    
    res.json(result);
    
  } catch (error) {
    logger.error('Vagon full report error:', error);
    res.status(500).json({ message: 'Hisobotni olishda xatolik', error: error.message });
  }
});

// UMUMIY BIZNES HISOBOTI (Barcha vagonlar)
router.get('/business-summary', auth, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const vagonFilter = { isDeleted: false };
    if (status) vagonFilter.status = status;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Barcha vagonlar
    const vagons = await Vagon.find(vagonFilter);
    
    let totalSummary = {
      vagons: vagons.length,
      totalVolume: 0,
      totalLoss: 0,
      totalSold: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      totalDebt: 0,
      responsibilityBreakdown: {},
      expenseBreakdown: {},
      clientBreakdown: {}
    };
    
    // Har bir vagon uchun hisoblash
    for (const vagon of vagons) {
      // Lotlar
      const lots = await VagonLot.find({ vagon: vagon._id, isDeleted: false });
      
      // Xarajatlar
      const expenses = await Cash.find({ 
        vagon: vagon._id, 
        type: 'expense',
        isDeleted: false,
        ...dateFilter
      });
      
      // Sotuvlar
      const sales = await VagonSale.find({ 
        vagon: vagon._id, 
        isDeleted: false,
        ...dateFilter
      }).populate('client', 'name');
      
      // Hisoblash
      lots.forEach(lot => {
        totalSummary.totalVolume += lot.volume_m3;
        totalSummary.totalLoss += lot.loss_volume_m3;
        
        // Lot brak javobgari
        if (lot.loss_volume_m3 > 0) {
          const responsible = lot.loss_responsible_person || 'Noma\'lum';
          if (!totalSummary.responsibilityBreakdown[responsible]) {
            totalSummary.responsibilityBreakdown[responsible] = { loss: 0, expense: 0 };
          }
          totalSummary.responsibilityBreakdown[responsible].loss += lot.loss_volume_m3;
        }
      });
      
      expenses.forEach(expense => {
        totalSummary.totalExpenses += expense.amount || 0;
        
        // Xarajat kategoriyasi
        const expenseType = expense.description || 'Noma\'lum';
        if (!totalSummary.expenseBreakdown[expenseType]) {
          totalSummary.expenseBreakdown[expenseType] = 0;
        }
        totalSummary.expenseBreakdown[expenseType] += expense.amount || 0;
      });
      
      sales.forEach(sale => {
        totalSummary.totalSold += sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0;
        totalSummary.totalRevenue += sale.total_price || 0;
        totalSummary.totalDebt += sale.debt || 0;
        
        // Mijoz bo'yicha
        const clientName = sale.client?.name || sale.one_time_client_name || 'Noma\'lum';
        if (!totalSummary.clientBreakdown[clientName]) {
          totalSummary.clientBreakdown[clientName] = {
            sales: 0,
            debt: 0,
            volume: 0
          };
        }
        totalSummary.clientBreakdown[clientName].sales += sale.total_price || 0;
        totalSummary.clientBreakdown[clientName].debt += sale.debt || 0;
        totalSummary.clientBreakdown[clientName].volume += sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0;
      });
    }
    
    // Foyda hisoblash
    totalSummary.totalProfit = totalSummary.totalRevenue - totalSummary.totalExpenses;
    totalSummary.profitMargin = totalSummary.totalRevenue > 0 ? 
      (totalSummary.totalProfit / totalSummary.totalRevenue) * 100 : 0;
    totalSummary.lossPercentage = totalSummary.totalVolume > 0 ? 
      (totalSummary.totalLoss / totalSummary.totalVolume) * 100 : 0;
    
    res.json(totalSummary);
    
  } catch (error) {
    logger.error('Business summary error:', error);
    res.status(500).json({ message: 'Biznes xulosasini olishda xatolik', error: error.message });
  }
});

// JAVOBGARLIK HISOBOTI
router.get('/responsibility-report', auth, async (req, res) => {
  try {
    const { startDate, endDate, responsiblePerson } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Xarajatlar bo'yicha javobgarlik
    const expenseResponsibility = await Kassa.find({
      turi: 'rasxod',
      isDeleted: false,
      ...dateFilter
    });
    
    // Brak bo'yicha javobgarlik
    const lotLossResponsibility = await VagonLot.find({
      loss_volume_m3: { $gt: 0 },
      isDeleted: false,
      ...dateFilter
    });
    
    const clientLossResponsibility = await VagonSale.find({
      client_loss_m3: { $gt: 0 },
      isDeleted: false,
      ...dateFilter
    });
    
    const responsibilityReport = {};
    
    // Xarajat javobgarlari
    expenseResponsibility.forEach(expense => {
      try {
        const additionalInfo = JSON.parse(expense.qoshimchaMalumot || '{}');
        const responsible = additionalInfo.javobgarShaxs || 'Noma\'lum';
        
        if (responsiblePerson && responsible !== responsiblePerson) return;
        
        if (!responsibilityReport[responsible]) {
          responsibilityReport[responsible] = {
            expenses: 0,
            lotLoss: 0,
            clientLoss: 0,
            expenseDetails: [],
            lossDetails: []
          };
        }
        
        responsibilityReport[responsible].expenses += expense.summaRUB || expense.summa;
        responsibilityReport[responsible].expenseDetails.push({
          type: expense.xarajatTuri,
          amount: expense.summaRUB || expense.summa,
          date: expense.createdAt,
          description: expense.tavsif
        });
      } catch (e) {
        // JSON parse error
      }
    });
    
    // Lot brak javobgarlari
    lotLossResponsibility.forEach(lot => {
      const responsible = lot.loss_responsible_person || 'Noma\'lum';
      
      if (responsiblePerson && responsible !== responsiblePerson) return;
      
      if (!responsibilityReport[responsible]) {
        responsibilityReport[responsible] = {
          expenses: 0,
          lotLoss: 0,
          clientLoss: 0,
          expenseDetails: [],
          lossDetails: []
        };
      }
      
      responsibilityReport[responsible].lotLoss += lot.loss_volume_m3;
      responsibilityReport[responsible].lossDetails.push({
        type: 'lot_loss',
        volume: lot.loss_volume_m3,
        reason: lot.loss_reason,
        date: lot.loss_date || lot.createdAt,
        lotId: lot._id
      });
    });
    
    // Mijoz brak javobgarlari
    clientLossResponsibility.forEach(sale => {
      const responsible = sale.client_loss_responsible || 'Noma\'lum';
      
      if (responsiblePerson && responsible !== responsiblePerson) return;
      
      if (!responsibilityReport[responsible]) {
        responsibilityReport[responsible] = {
          expenses: 0,
          lotLoss: 0,
          clientLoss: 0,
          expenseDetails: [],
          lossDetails: []
        };
      }
      
      responsibilityReport[responsible].clientLoss += sale.client_loss_m3;
      responsibilityReport[responsible].lossDetails.push({
        type: 'client_loss',
        volume: sale.client_loss_m3,
        reason: sale.client_loss_reason,
        date: sale.createdAt,
        saleId: sale._id
      });
    });
    
    // Jami zarar hisoblash (taxminiy qiymat)
    Object.keys(responsibilityReport).forEach(responsible => {
      const report = responsibilityReport[responsible];
      // Har m³ brak uchun taxminiy 400$ zarar deb hisoblaymiz
      const lossValue = (report.lotLoss + report.clientLoss) * 400;
      report.totalDamage = report.expenses + lossValue;
    });
    
    res.json(responsibilityReport);
    
  } catch (error) {
    logger.error('Responsibility report error:', error);
    res.status(500).json({ message: 'Javobgarlik hisobotini olishda xatolik', error: error.message });
  }
});

module.exports = router;