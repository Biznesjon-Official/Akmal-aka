const express = require('express');
const router = express.Router();
const Cash = require('../models/Cash');
const VagonSale = require('../models/VagonSale');
const Client = require('../models/Client');
const Debt = require('../models/Debt');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { ClientNotFoundError, InvalidCurrencyError, handleCustomError } = require('../utils/customErrors');

// Double submit prevention middleware
const preventDoubleSubmit = (req, res, next) => {
  const key = `${req.user.userId}-${req.method}-${req.originalUrl}`;
  const now = Date.now();
  
  if (!req.app.locals.recentRequests) {
    req.app.locals.recentRequests = new Map();
  }
  
  const lastRequest = req.app.locals.recentRequests.get(key);
  if (lastRequest && (now - lastRequest) < 2000) { // 2 sekund ichida
    return res.status(409).json({ 
      message: 'Takroriy yuborildi. Iltimos kutib turing.',
      code: 'DUPLICATE_REQUEST'
    });
  }
  
  req.app.locals.recentRequests.set(key, now);
  
  // Eski requestlarni tozalash
  if (req.app.locals.recentRequests.size > 1000) {
    const cutoff = now - 10000; // 10 sekund
    for (const [k, v] of req.app.locals.recentRequests.entries()) {
      if (v < cutoff) {
        req.app.locals.recentRequests.delete(k);
      }
    }
  }
  
  next();
};

// Umumiy balans (/:id dan oldin bo'lishi kerak!)
router.get('/balance', auth, async (req, res) => {
  try {
    const balances = await Cash.getBalanceByCurrency();
    
    // Frontend format'iga moslashtirish
    const formattedBalances = Object.keys(balances).map(currency => ({
      _id: currency,
      jamiKirim: balances[currency].income || 0,
      xarajatlar: balances[currency].expense || 0,
      sof: balances[currency].balance || 0,
      vagonSotuvi: 0, // Hisoblash kerak
      mijozTolovi: 0  // Hisoblash kerak
    }));
    
    res.json(formattedBalances);
  } catch (error) {
    logger.error('Balance error:', error);
    res.status(500).json({ message: 'Balansni hisoblashda xatolik' });
  }
});

router.get('/balance/total', auth, async (req, res) => {
  try {
    const balance = await Cash.getTotalBalance();
    res.json(balance);
  } catch (error) {
    logger.error('Balance error:', error);
    res.status(500).json({ message: 'Balansni hisoblashda xatolik' });
  }
});

// Valyuta bo'yicha balans
router.get('/balance/by-currency', auth, async (req, res) => {
  try {
    const balances = await Cash.getBalanceByCurrency();
    res.json(balances);
  } catch (error) {
    logger.error('Balance by currency error:', error);
    res.status(500).json({ message: 'Valyuta bo\'yicha balansni hisoblashda xatolik' });
  }
});

// Multi-currency balans (USD va RUB alohida)
router.get('/balance-multi', auth, async (req, res) => {
  try {
    const { getAllBalances } = require('../utils/currencyTransferHelper');
    const balances = await getAllBalances();
    
    res.json({
      success: true,
      data: {
        USD: {
          balance: balances.USD || 0,
          currency: 'USD',
          symbol: '$'
        },
        RUB: {
          balance: balances.RUB || 0,
          currency: 'RUB',
          symbol: '₽'
        }
      }
    });
  } catch (error) {
    logger.error('Multi-currency balance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Multi-currency balansni hisoblashda xatolik' 
    });
  }
});

// Barcha tranzaksiyalar (PAGINATION BILAN)
router.get('/', auth, async (req, res) => {
  try {
    const { 
      type, 
      startDate, 
      endDate, 
      currency, 
      client,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = { isDeleted: false };
    if (type) filter.type = type;
    if (currency) filter.currency = currency;
    if (client) filter.client = client;
    
    if (startDate || endDate) {
      filter.transaction_date = {};
      if (startDate) filter.transaction_date.$gte = new Date(startDate);
      if (endDate) filter.transaction_date.$lte = new Date(endDate);
    }
    
    // Pagination parametrlari
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Jami soni
    const total = await Cash.countDocuments(filter);
    
    // Tranzaksiyalarni olish (faqat kerakli fieldlar)
    const transactions = await Cash.find(filter)
      .select('type client vagon vagonSale expense currency amount description transaction_date createdAt')
      .populate('client', 'name phone')
      .populate('vagon', 'vagonCode month')
      .populate('createdBy', 'username')
      .sort({ transaction_date: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Pagination ma'lumotlari
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      transactions: transactions,
      kassa: transactions, // Backward compatibility
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    logger.error('Cash list error:', error);
    res.status(500).json({ message: 'Tranzaksiyalar ro\'yxatini olishda xatolik' });
  }
});

// Bitta tranzaksiya ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Cash.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
      .populate('client')
      .populate('vagon')
      .populate('vagonSale')
      .populate('expense')
      .populate('createdBy', 'username');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Tranzaksiya topilmadi' });
    }
    
    res.json(transaction);
  } catch (error) {
    logger.error('Cash get error:', error);
    res.status(500).json({ message: 'Tranzaksiya ma\'lumotlarini olishda xatolik' });
  }
});

// YANGI FEATURE: Ko'p vagondan yog'och sotib olish
router.post('/multi-vagon-purchase', auth, preventDoubleSubmit, async (req, res) => {
  try {
    const { items, description, date } = req.body;
    
    // Validatsiya
    const errors = [];
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('Kamida 1 ta vagon tanlanishi kerak');
    }
    
    if (!description || description.trim().length < 3) {
      errors.push('Tavsif kamida 3 belgi bo\'lishi shart');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('Sana formati YYYY-MM-DD bo\'lishi shart');
    }
    
    // Har bir item validatsiyasi
    if (items && Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (!item.vagon_id) {
          errors.push(`Item ${i + 1}: vagon_id majburiy`);
        }
        
        if (!item.volume_m3 || item.volume_m3 <= 0) {
          errors.push(`Item ${i + 1}: volume_m3 0 dan katta bo'lishi kerak`);
        }
        
        if (!item.sale_price_per_m3 || item.sale_price_per_m3 <= 0) {
          errors.push(`Item ${i + 1}: sale_price_per_m3 0 dan katta bo'lishi kerak`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validatsiya xatoliklari',
        errors 
      });
    }
    
    const Vagon = require('../models/Vagon');
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const cashRecords = [];
      let totalAmount = 0;
      let currency = 'USD'; // Default
      
      // Har bir vagon uchun
      for (const item of items) {
        // Vagonni tekshirish
        const vagon = await Vagon.findOne({ 
          _id: item.vagon_id, 
          isDeleted: false 
        }).session(session);
        
        if (!vagon) {
          throw new Error(`Vagon topilmadi: ${item.vagon_id}`);
        }
        
        // Mavjud hajmni tekshirish
        if (vagon.remaining_volume_m3 < item.volume_m3) {
          throw new Error(
            `Vagon ${vagon.vagonCode}: Mavjud hajm (${vagon.remaining_volume_m3.toFixed(2)} m³) yetarli emas. ` +
            `Siz ${item.volume_m3} m³ sotib olmoqchisiz.`
          );
        }
        
        // Sotuv narxini tekshirish
        const salePrice = item.currency === 'RUB' 
          ? vagon.rub_sale_price_per_m3 
          : vagon.usd_sale_price_per_m3;
        
        if (!salePrice || salePrice <= 0) {
          throw new Error(
            `Vagon ${vagon.vagonCode}: Sotuv narxi belgilanmagan. ` +
            `Iltimos, avval vagon sahifasida narxni belgilang.`
          );
        }
        
        // Narxni hisoblash
        const itemTotal = item.volume_m3 * salePrice;
        totalAmount += itemTotal;
        currency = item.currency || 'USD';
        
        // Cash yozuvini yaratish
        const cash = new Cash({
          type: 'expense', // Yog'och sotib olish - chiqim
          vagon: item.vagon_id,
          amount: itemTotal,
          currency: currency,
          description: `${description} - ${vagon.vagonCode} (${item.volume_m3} m³ × ${salePrice} ${currency}/m³)`,
          transaction_date: new Date(date),
          createdBy: req.user.userId,
          expense_type: 'yogoch_sotib_olish'
        });
        
        await cash.save({ session });
        cashRecords.push(cash);
        
        // Vagon hajmini yangilash
        vagon.sold_volume_m3 += item.volume_m3;
        vagon.remaining_volume_m3 -= item.volume_m3;
        await vagon.save({ session });
      }
      
      await session.commitTransaction();
      
      res.status(201).json({
        message: 'Ko\'p vagondan yog\'och sotib olish muvaffaqiyatli amalga oshirildi',
        cashRecords,
        totalAmount,
        currency,
        itemCount: items.length
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error) {
    logger.error('Multi-vagon purchase error:', error);
    return res.status(400).json({ 
      message: error.message || 'Xatolik yuz berdi',
      error: error.message 
    });
  }
});

// YANGI FEATURE: Daromad qo'shish
router.post('/income', auth, preventDoubleSubmit, async (req, res) => {
  try {
    const { 
      income_source, amount, currency, description, client_id, date, 
      vagon_id, yogoch_id, client_type, one_time_client_name, one_time_client_phone, 
      total_price, paid_amount, sold_quantity,
      // YANGI: Ko'p vagonli sotuv
      sale_items, is_multi_sale
    } = req.body;
    
    // YANGI: Ko'p vagonli sotuv uchun alohida logika
    if (income_source === 'yogoch_tolovi' && is_multi_sale && sale_items && sale_items.length > 0) {
      const mongoose = require('mongoose');
      const session = await mongoose.startSession();
      
      try {
        session.startTransaction();
        
        const VagonLot = require('../models/VagonLot');
        const Vagon = require('../models/Vagon');
        
        let totalSaleAmount = 0;
        let totalPaidAmount = parseFloat(paid_amount) || 0;
        const vagonSales = [];
        
        // Har bir item uchun
        for (const item of sale_items) {
          // Yog'ochni tekshirish
          const yogoch = await VagonLot.findOne({ 
            _id: item.yogoch_id, 
            isDeleted: false 
          }).session(session);
          
          if (!yogoch) {
            throw new Error(`Yog'och topilmadi: ${item.yogoch_id}`);
          }
          
          let itemTotal = 0;
          let saleUnit = 'pieces';
          let sentQuantity = 0;
          let acceptedQuantity = 0;
          let dispatchedVolume = 0;
          let receivedVolume = 0;
          
          // Hajm (m³) bo'yicha sotuv
          if (item.volume_m3 !== undefined) {
            saleUnit = 'volume';
            dispatchedVolume = parseFloat(item.volume_m3);
            receivedVolume = dispatchedVolume;
            
            // Mavjud hajmni tekshirish
            if (yogoch.remaining_volume_m3 < dispatchedVolume) {
              throw new Error(
                `Yog'och ${yogoch.dimensions}: Mavjud hajm (${yogoch.remaining_volume_m3.toFixed(2)} m³) yetarli emas. ` +
                `Siz ${dispatchedVolume.toFixed(2)} m³ sotmoqchisiz.`
              );
            }
            
            itemTotal = dispatchedVolume * (item.price_per_m3 || 0);
            
            // Dona miqdorini hisoblash (taxminiy)
            if (yogoch.volume_m3 > 0 && yogoch.quantity > 0) {
              const volumePerPiece = yogoch.volume_m3 / yogoch.quantity;
              sentQuantity = Math.round(dispatchedVolume / volumePerPiece);
              acceptedQuantity = sentQuantity;
            }
          }
          // Dona bo'yicha sotuv
          else if (item.sold_quantity !== undefined) {
            saleUnit = 'pieces';
            sentQuantity = parseInt(item.sold_quantity);
            acceptedQuantity = sentQuantity;
            
            // Mavjud miqdorni tekshirish
            if (yogoch.remaining_quantity < sentQuantity) {
              throw new Error(
                `Yog'och ${yogoch.dimensions}: Mavjud miqdor (${yogoch.remaining_quantity} dona) yetarli emas. ` +
                `Siz ${sentQuantity} dona sotmoqchisiz.`
              );
            }
            
            itemTotal = sentQuantity * (item.price_per_unit || 0);
            
            // Hajmni hisoblash
            if (yogoch.volume_m3 > 0 && yogoch.quantity > 0) {
              const volumePerPiece = yogoch.volume_m3 / yogoch.quantity;
              dispatchedVolume = sentQuantity * volumePerPiece;
              receivedVolume = dispatchedVolume;
            }
          }
          
          totalSaleAmount += itemTotal;
          
          // VagonSale yaratish
          const vagonSale = new VagonSale({
            vagon: item.vagon_id,
            lot: item.yogoch_id,
            client: client_id || null,
            warehouse_dispatched_volume_m3: dispatchedVolume,
            client_received_volume_m3: receivedVolume,
            sale_unit: saleUnit,
            sent_quantity: sentQuantity,
            accepted_quantity: acceptedQuantity,
            price_per_m3: item.price_per_m3 || 0,
            price_per_piece: item.price_per_unit || 0,
            total_price: itemTotal,
            sale_currency: 'USD',
            paid_amount: 0, // Keyinroq taqsimlanadi
            debt: itemTotal,
            status: 'pending',
            sale_date: new Date(date),
            one_time_client_name: one_time_client_name?.trim() || null,
            one_time_client_phone: one_time_client_phone?.trim() || null
          });
          
          await vagonSale.save({ session });
          vagonSales.push(vagonSale);
          
          // Yog'och miqdorini yangilash
          if (saleUnit === 'volume') {
            yogoch.remaining_volume_m3 -= dispatchedVolume;
            yogoch.warehouse_dispatched_volume_m3 += dispatchedVolume;
            // Dona miqdorini ham yangilash
            if (sentQuantity > 0) {
              yogoch.remaining_quantity = Math.max(0, yogoch.remaining_quantity - sentQuantity);
            }
          } else {
            yogoch.remaining_quantity -= sentQuantity;
            yogoch.warehouse_dispatched_volume_m3 += dispatchedVolume;
            // Hajmni ham yangilash
            if (dispatchedVolume > 0) {
              yogoch.remaining_volume_m3 = Math.max(0, yogoch.remaining_volume_m3 - dispatchedVolume);
            }
          }
          
          await yogoch.save({ session });
        }
        
        // To'lovni taqsimlash (proporsional)
        if (totalPaidAmount > 0) {
          for (const sale of vagonSales) {
            const proportion = sale.total_price / totalSaleAmount;
            const salePayment = totalPaidAmount * proportion;
            
            sale.paid_amount = salePayment;
            sale.debt = sale.total_price - salePayment;
            
            if (sale.paid_amount >= sale.total_price) {
              sale.status = 'paid';
            } else if (sale.paid_amount > 0) {
              sale.status = 'partial';
            }
            
            await sale.save({ session });
          }
        }
        
        // Client modelini yangilash
        if (client_id) {
          const Client = require('../models/Client');
          const client = await Client.findById(client_id).session(session);
          if (client) {
            client.usd_total_debt += (totalSaleAmount - totalPaidAmount);
            client.usd_total_paid += totalPaidAmount;
            await client.save({ session });
          }
        }
        
        // YANGI: Qarz daftarchaga qo'shish (agar qarz bo'lsa)
        if ((totalSaleAmount - totalPaidAmount) > 0) {
          for (const sale of vagonSales) {
            if (sale.debt > 0) {
              const debt = new Debt({
                client: client_id || null,
                one_time_client_name: one_time_client_name?.trim() || null,
                one_time_client_phone: one_time_client_phone?.trim() || null,
                vagon: sale.vagon,
                yogoch: sale.yogoch,
                total_amount: sale.total_price,
                paid_amount: sale.paid_amount,
                remaining_amount: sale.debt,
                currency: 'USD',
                sale_date: new Date(date),
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 kun
                status: sale.status === 'paid' ? 'paid' : 'active',
                description: `${description.trim()} - ${sale.yogoch_name || 'Yog\'och'}`,
                vagonSale: sale._id,
                createdBy: req.user.userId
              });
              
              // Agar dastlabki to'lov bo'lsa, payment history'ga qo'shish
              if (sale.paid_amount > 0) {
                debt.payment_history.push({
                  amount: sale.paid_amount,
                  date: new Date(),
                  description: 'Dastlabki to\'lov',
                  created_by: req.user.userId
                });
              }
              
              await debt.save({ session });
            }
          }
        }
        
        // Cash tranzaksiyasi (faqat to'langan summa uchun)
        if (totalPaidAmount > 0) {
          const cash = new Cash({
            type: 'vagon_sale',
            client: client_id || null,
            amount: totalPaidAmount,
            currency: 'USD',
            description: `${description.trim()} - Ko'p vagonli sotuv (${sale_items.length} ta yog'och)`,
            transaction_date: new Date(date),
            createdBy: req.user.userId,
            one_time_client_name: one_time_client_name?.trim() || null,
            one_time_client_phone: one_time_client_phone?.trim() || null
          });
          
          await cash.save({ session });
        }
        
        await session.commitTransaction();
        
        res.status(201).json({
          message: 'Ko\'p vagonli sotuv muvaffaqiyatli yaratildi',
          vagonSales,
          totalSaleAmount,
          totalPaidAmount,
          totalDebt: totalSaleAmount - totalPaidAmount
        });
        
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
      
      return;
    }
    
    // ESKI LOGIKA: Bitta vagonli sotuv
    // Initialize variables
    let yogoch = null;
    
    // Validatsiya
    const errors = [];
    
    if (!income_source || !['yogoch_tolovi', 'qarz_daftarcha', 'yetkazib_berish'].includes(income_source)) {
      errors.push('income_source faqat yogoch_tolovi, qarz_daftarcha yoki yetkazib_berish bo\'lishi mumkin');
    }
    
    if (!amount || amount <= 0) {
      errors.push('amount 0 dan katta bo\'lishi shart');
    }
    
    if (amount > 1e9) {
      errors.push('amount juda katta (maksimal 1 milliard)');
    }
    
    if (!currency || !['USD', 'RUB'].includes(currency)) {
      errors.push('currency faqat USD yoki RUB bo\'lishi mumkin');
    }
    
    if (!description || description.trim().length < 3) {
      errors.push('description kamida 3 belgi bo\'lishi shart');
    }
    
    if (description && description.length > 500) {
      errors.push('description 500 belgidan oshmasin');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('date formati YYYY-MM-DD bo\'lishi shart');
    }
    
    // Qarz daftarcha uchun client_id majburiy
    if (income_source === 'qarz_daftarcha' && !client_id) {
      errors.push('Qarz daftarcha uchun client_id majburiy');
    }
    
    // Yogoch tolovi uchun vagon va yogoch majburiy
    if (income_source === 'yogoch_tolovi' && !vagon_id) {
      errors.push('Yogoch tolovi uchun vagon_id majburiy');
    }
    
    if (income_source === 'yogoch_tolovi' && vagon_id && !yogoch_id) {
      errors.push('Yogoch tolovi uchun yogoch_id majburiy');
    }
    
    // Yogoch tolovi uchun mijoz majburiy
    if (income_source === 'yogoch_tolovi') {
      if (client_type === 'existing' && !client_id) {
        errors.push('Yogoch tolovi uchun doimiy mijoz tanlanishi shart');
      }
      if (client_type === 'one_time') {
        if (!one_time_client_name || one_time_client_name.trim().length < 2) {
          errors.push('Bir martalik mijoz ismi kamida 2 belgi bo\'lishi shart');
        }
        if (!one_time_client_phone || one_time_client_phone.trim().length < 9) {
          errors.push('Bir martalik mijoz telefoni kamida 9 belgi bo\'lishi shart');
        }
      }
      if (!client_type || !['existing', 'one_time'].includes(client_type)) {
        errors.push('Yogoch tolovi uchun mijoz turi (existing yoki one_time) tanlanishi shart');
      }
    }
    
    // Yetkazib berish uchun faqat vagon majburiy (yogoch ixtiyoriy)
    if (income_source === 'yetkazib_berish' && !vagon_id) {
      errors.push('Yetkazib berish uchun vagon_id majburiy');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validatsiya xatoliklari',
        errors 
      });
    }
    
    // Client mavjudligini tekshirish
    if (client_id) {
      const Client = require('../models/Client');
      const client = await Client.findById(client_id);
      if (!client) {
        return res.status(400).json({ message: 'Mijoz topilmadi' });
      }
    }
    
    // Vagon mavjudligini tekshirish
    if (vagon_id) {
      const Vagon = require('../models/Vagon');
      const vagon = await Vagon.findOne({ _id: vagon_id, isDeleted: false });
      if (!vagon) {
        return res.status(400).json({ message: 'Vagon topilmadi' });
      }
    }
    
    // Yogoch mavjudligini tekshirish
    if (yogoch_id) {
      const VagonLot = require('../models/VagonLot');
      yogoch = await VagonLot.findOne({ _id: yogoch_id, isDeleted: false });
      if (!yogoch) {
        return res.status(400).json({ message: 'Yog\'och topilmadi' });
      }
      
      // Yogoch va vagon mos kelishini tekshirish
      if (vagon_id && yogoch.vagon.toString() !== vagon_id) {
        return res.status(400).json({ message: 'Tanlangan yog\'och bu vagonga tegishli emas' });
      }
    }
    
    // Type mapping
    let type = 'client_payment';
    if (income_source === 'yogoch_tolovi') type = 'vagon_sale';
    else if (income_source === 'yetkazib_berish') type = 'delivery_payment';
    else if (income_source === 'qarz_daftarcha') type = 'debt_payment';
    
    // Yogoch tolovi uchun VagonSale yaratish va qarz boshqaruvi
    let vagonSaleId = null;
    
    if (income_source === 'yogoch_tolovi') {
      // Narxlarni hisoblash
      const totalPrice = total_price || parseFloat(amount);
      const paidAmount = paid_amount || 0;
      const debt = totalPrice - paidAmount;
      
      // Status aniqlash
      let status = 'pending';
      if (paidAmount >= totalPrice) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      }
      
      // VagonSale yaratish
      const vagonSale = new VagonSale({
        vagon: vagon_id,
        lot: yogoch_id,
        client: client_id || null, // Doimiy mijoz bo'lsa
        warehouse_dispatched_volume_m3: yogoch ? yogoch.volume_m3 : 0,
        client_received_volume_m3: yogoch ? yogoch.volume_m3 : 0,
        sale_unit: 'volume',
        sent_quantity: yogoch ? yogoch.quantity : 0,
        accepted_quantity: yogoch ? yogoch.quantity : 0,
        total_price: totalPrice,
        sale_currency: currency,
        paid_amount: paidAmount,
        debt: debt,
        status: status,
        sale_date: new Date(date),
        // Bir martalik mijoz ma'lumotlari
        one_time_client_name: one_time_client_name?.trim() || null,
        one_time_client_phone: one_time_client_phone?.trim() || null
      });
      
      await vagonSale.save();
      vagonSaleId = vagonSale._id;
      
      // Agar doimiy mijoz bo'lsa, Client modelini yangilash
      if (client_id) {
        const Client = require('../models/Client');
        const client = await Client.findById(client_id);
        if (client) {
          if (currency === 'USD') {
            client.usd_total_debt += debt;
            client.usd_total_paid += paidAmount;
          } else {
            client.rub_total_debt += debt;
            client.rub_total_paid += paidAmount;
          }
          await client.save();
        }
      }
      
      // YANGI: Qarz daftarchaga qo'shish (agar qarz bo'lsa)
      if (debt > 0) {
        const debtRecord = new Debt({
          client: client_id || null,
          one_time_client_name: one_time_client_name?.trim() || null,
          one_time_client_phone: one_time_client_phone?.trim() || null,
          vagon: vagon_id,
          yogoch: yogoch_id,
          total_amount: totalPrice,
          paid_amount: paidAmount,
          remaining_amount: debt,
          currency: currency,
          sale_date: new Date(date),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 kun
          status: status === 'paid' ? 'paid' : 'active',
          description: description.trim(),
          vagonSale: vagonSaleId,
          createdBy: req.user.userId
        });
        
        // Agar dastlabki to'lov bo'lsa, payment history'ga qo'shish
        if (paidAmount > 0) {
          debtRecord.payment_history.push({
            amount: paidAmount,
            date: new Date(),
            description: 'Dastlabki to\'lov',
            created_by: req.user.userId
          });
        }
        
        await debtRecord.save();
      }
    }
    
    // Cash tranzaksiyasini yaratish (faqat to'langan summa uchun)
    let cash = null;
    if (income_source !== 'yogoch_tolovi' || (income_source === 'yogoch_tolovi' && paid_amount > 0)) {
      const cashAmount = income_source === 'yogoch_tolovi' ? parseFloat(paid_amount) : parseFloat(amount);
      
      cash = new Cash({
        type,
        client: client_id || null,
        vagon: vagon_id || null,
        yogoch: yogoch_id || null,
        vagonSale: vagonSaleId || null,
        amount: cashAmount,
        currency,
        description: description.trim(),
        transaction_date: new Date(date),
        createdBy: req.user.userId,
        // Bir martalik mijoz ma'lumotlari
        one_time_client_name: one_time_client_name?.trim() || null,
        one_time_client_phone: one_time_client_phone?.trim() || null
      });
      
      await cash.save();
    }
    
    res.status(201).json({
      message: income_source === 'yogoch_tolovi' 
        ? 'Yogoch sotuvi muvaffaqiyatli yaratildi' 
        : 'Daromad muvaffaqiyatli qo\'shildi',
      cash,
      vagonSale: vagonSaleId ? { _id: vagonSaleId } : null
    });
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// YANGI FEATURE: Xarajat qo'shish
router.post('/expense', auth, preventDoubleSubmit, async (req, res) => {
  try {
    const { expense_source, amount, currency, description, responsible_person, date, related_client_id, vagon_id, yogoch_id } = req.body;
    
    // Validatsiya
    const errors = [];
    
    if (!expense_source || !['transport', 'bojxona', 'ish_haqi', 'yuklash_tushurish', 'soliq', 'sifatsiz_mahsulot'].includes(expense_source)) {
      errors.push('expense_source faqat transport, bojxona, ish_haqi, yuklash_tushurish, soliq yoki sifatsiz_mahsulot bo\'lishi mumkin');
    }
    
    if (!amount || amount <= 0) {
      errors.push('amount 0 dan katta bo\'lishi shart');
    }
    
    if (amount > 1e9) {
      errors.push('amount juda katta (maksimal 1 milliard)');
    }
    
    if (!currency || !['USD', 'RUB'].includes(currency)) {
      errors.push('currency faqat USD yoki RUB bo\'lishi mumkin');
    }
    
    if (!description || description.trim().length < 3) {
      errors.push('description kamida 3 belgi bo\'lishi shart');
    }
    
    if (description && description.length > 500) {
      errors.push('description 500 belgidan oshmasin');
    }
    
    if (!responsible_person || responsible_person.trim().length === 0) {
      errors.push('responsible_person bo\'sh bo\'lmasin');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('date formati YYYY-MM-DD bo\'lishi shart');
    }
    
    // Sifatsiz mahsulot uchun maxsus validatsiya
    if (expense_source === 'sifatsiz_mahsulot' && description.trim().length < 10) {
      errors.push('Sifatsiz mahsulot uchun description kamida 10 belgi bo\'lishi shart');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validatsiya xatoliklari',
        errors 
      });
    }
    
    // Client mavjudligini tekshirish
    if (related_client_id) {
      const Client = require('../models/Client');
      const client = await Client.findById(related_client_id);
      if (!client) {
        return res.status(400).json({ message: 'Bog\'liq mijoz topilmadi' });
      }
    }
    
    // Vagon mavjudligini tekshirish
    if (vagon_id) {
      const Vagon = require('../models/Vagon');
      const vagon = await Vagon.findOne({ _id: vagon_id, isDeleted: false });
      if (!vagon) {
        return res.status(400).json({ message: 'Vagon topilmadi' });
      }
    }
    
    // Yogoch mavjudligini tekshirish
    if (yogoch_id) {
      const VagonLot = require('../models/VagonLot');
      const yogoch = await VagonLot.findOne({ _id: yogoch_id, isDeleted: false });
      if (!yogoch) {
        return res.status(400).json({ message: 'Yog\'och topilmadi' });
      }
      
      // Yogoch va vagon mos kelishini tekshirish
      if (vagon_id && yogoch.vagon.toString() !== vagon_id) {
        return res.status(400).json({ message: 'Tanlangan yog\'och bu vagonga tegishli emas' });
      }
    }
    
    // Type mapping
    let type = 'expense';
    if (expense_source === 'yetkazib_berish') type = 'delivery_expense';
    
    // Cash tranzaksiyasini yaratish
    const cash = new Cash({
      type,
      client: related_client_id || null,
      vagon: vagon_id || null,
      yogoch: yogoch_id || null,
      amount: parseFloat(amount),
      currency,
      description: `${expense_source.toUpperCase()}: ${description.trim()} (Javobgar: ${responsible_person.trim()})`,
      transaction_date: new Date(date),
      createdBy: req.user.userId
    });
    
    await cash.save();
    
    res.status(201).json({
      message: 'Xarajat muvaffaqiyatli qo\'shildi',
      cash
    });
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Mijoz to'lovi (client_payment)
router.post('/client-payment', auth, async (req, res) => {
  try {
    const { vagonSale, amount, currency, description } = req.body;
    
    // Validatsiya
    if (!vagonSale || !amount) {
      return res.status(400).json({ 
        message: 'Sotuv va summa kiritilishi shart' 
      });
    }
    
    // Valyuta validatsiyasi
    if (currency && !['USD', 'RUB'].includes(currency)) {
      throw new InvalidCurrencyError(currency);
    }
    
    // Sotuvni tekshirish
    const sale = await VagonSale.findOne({ 
      _id: vagonSale, 
      isDeleted: false 
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    // Qarzdan ko'p to'lash mumkin emas
    if (amount > sale.debt) {
      throw new PaymentExceedsDebtError(amount, sale.debt);
    }
    
    // Cash tranzaksiyasini yaratish
    const cash = new Cash({
      type: 'client_payment',
      client: sale.client,
      vagon: sale.vagon,
      vagonSale: vagonSale,
      amount,
      currency: currency || 'RUB',
      description: description || `To'lov: ${sale.client?.name || 'Mijoz'}`,
      createdBy: req.user.userId
    });
    
    await cash.save();
    
    // Sotuvni yangilash (VagonSale API orqali)
    sale.paid_amount += amount;
    await sale.save(); // pre-save hook avtomatik hisoblaydi
    
    // Mijozni yangilash
    const client = await Client.findById(sale.client);
    if (client) {
      client.total_paid += amount;
      await client.save();
    }
    
    res.status(201).json({
      message: 'To\'lov qabul qilindi',
      cash,
      sale
    });
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Boshlang'ich balans (initial_balance)
router.post('/initial-balance', auth, async (req, res) => {
  try {
    const { amount, currency, description } = req.body;
    
    // Validatsiya
    if (!amount) {
      return res.status(400).json({ 
        message: 'Summa kiritilishi shart' 
      });
    }
    
    // Cash tranzaksiyasini yaratish
    const cash = new Cash({
      type: 'initial_balance',
      amount,
      currency: currency || 'RUB',
      description: description || 'Boshlang\'ich balans',
      createdBy: req.user.userId
    });
    
    await cash.save();
    
    res.status(201).json({
      message: 'Boshlang\'ich balans qo\'shildi',
      cash
    });
  } catch (error) {
    logger.error('Initial balance error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Tranzaksiyani o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const cash = await Cash.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!cash) {
      return res.status(404).json({ message: 'Tranzaksiya topilmadi' });
    }
    
    // Mijoz to'lovi bo'lsa, sotuvni va mijozni qaytarish
    if (cash.type === 'client_payment' && cash.vagonSale) {
      const sale = await VagonSale.findById(cash.vagonSale);
      if (sale) {
        sale.paid_amount -= cash.amount_rub;
        await sale.save();
      }
      
      const client = await Client.findById(cash.client);
      if (client) {
        client.total_paid -= cash.amount_rub;
        await client.save();
      }
    }
    
    cash.isDeleted = true;
    await cash.save();
    
    res.json({ message: 'Tranzaksiya o\'chirildi' });
  } catch (error) {
    logger.error('Cash delete error:', error);
    res.status(500).json({ message: 'Tranzaksiyani o\'chirishda xatolik' });
  }
});

// Statistika (kunlik, oylik)
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { period } = req.query; // 'today', 'week', 'month', 'year'
    
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0); // Barcha vaqt
    }
    
    const transactions = await Cash.find({
      isDeleted: false,
      transaction_date: { $gte: startDate }
    });
    
    let income = 0;
    let expense = 0;
    
    transactions.forEach(t => {
      if (t.type === 'client_payment' || t.type === 'initial_balance' || t.type === 'debt_sale') {
        income += t.amount_rub;
      } else if (t.type === 'expense' || t.type === 'debt_payment') {
        expense += t.amount_rub;
      }
    });
    
    res.json({
      period,
      income,
      expense,
      balance: income - expense,
      transaction_count: transactions.length
    });
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

// YANGI: Operatsiyalar tarixi
router.get('/transactions', auth, async (req, res) => {
  try {
    const { 
      type = 'all',           // 'income' | 'expense' | 'all'
      currency = 'all',       // 'USD' | 'RUB' | 'all'
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    // Query yaratish
    const query = {};
    
    // Tur filtri
    if (type !== 'all') {
      query.type = type;
    }
    
    // Valyuta filtri
    if (currency !== 'all') {
      query.currency = currency;
    }
    
    // Sana filtri
    if (start_date || end_date) {
      query.date = {};
      if (start_date) query.date.$gte = new Date(start_date);
      if (end_date) query.date.$lte = new Date(end_date);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Ma'lumotlarni olish
    const [transactions, total] = await Promise.all([
      Cash.find(query)
        .populate('client', 'name phone')
        .populate('vagon', 'vagonCode sending_place receiving_place')
        .populate('created_by', 'username')
        .sort({ date: -1, created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Cash.countDocuments(query)
    ]);

    // Har bir tranzaksiya uchun balansni hisoblash
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        // Ushbu tranzaksiyagacha bo'lgan balansni hisoblash
        const balanceBefore = await Cash.aggregate([
          {
            $match: {
              currency: transaction.currency,
              $or: [
                { date: { $lt: transaction.date } },
                {
                  date: transaction.date,
                  created_at: { $lt: transaction.created_at }
                }
              ]
            }
          },
          {
            $group: {
              _id: null,
              income: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
                }
              },
              expense: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
                }
              }
            }
          }
        ]);

        const before = balanceBefore[0] 
          ? balanceBefore[0].income - balanceBefore[0].expense 
          : 0;
        
        const after = transaction.type === 'income' 
          ? before + transaction.amount 
          : before - transaction.amount;

        return {
          ...transaction,
          balance_before: before,
          balance_after: after
        };
      })
    );

    res.json({
      success: true,
      data: {
        transactions: enrichedTransactions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Transactions history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Operatsiyalar tarixini olishda xatolik' 
    });
  }
});

// YANGI: Oylik hisobot
router.get('/report/monthly', auth, async (req, res) => {
  try {
    const { 
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      currency = 'USD'
    } = req.query;

    // Oy boshi va oxiri
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Oy boshidagi balans
    const openingBalance = await Cash.aggregate([
      {
        $match: {
          currency,
          date: { $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          income: {
            $sum: {
              $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
            }
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    const opening = openingBalance[0] 
      ? openingBalance[0].income - openingBalance[0].expense 
      : 0;

    // Oy ichidagi operatsiyalar
    const transactions = await Cash.find({
      currency,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Kirim va chiqimlarni manbalar bo'yicha guruhlash
    const incomeBySource = {};
    const expenseBySource = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        const source = t.income_source || 'other';
        incomeBySource[source] = (incomeBySource[source] || 0) + t.amount;
        totalIncome += t.amount;
      } else {
        const source = t.expense_source || 'other';
        expenseBySource[source] = (expenseBySource[source] || 0) + t.amount;
        totalExpense += t.amount;
      }
    });

    const closing = opening + totalIncome - totalExpense;
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? netProfit / totalIncome : 0;

    res.json({
      success: true,
      data: {
        currency,
        period: { year: parseInt(year), month: parseInt(month) },
        opening_balance: opening,
        income: {
          total: totalIncome,
          by_source: incomeBySource
        },
        expense: {
          total: totalExpense,
          by_source: expenseBySource
        },
        closing_balance: closing,
        net_profit: netProfit,
        profit_margin: profitMargin
      }
    });
  } catch (error) {
    logger.error('Monthly report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Oylik hisobotni olishda xatolik' 
    });
  }
});

// YANGI: Yillik hisobot
router.get('/report/yearly', auth, async (req, res) => {
  try {
    const { 
      year = new Date().getFullYear(),
      currency = 'USD'
    } = req.query;

    // Yil boshi va oxiri
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Yil boshidagi balans
    const openingBalance = await Cash.aggregate([
      {
        $match: {
          currency,
          date: { $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          income: {
            $sum: {
              $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
            }
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    const opening = openingBalance[0] 
      ? openingBalance[0].income - openingBalance[0].expense 
      : 0;

    // Oylik taqsimot
    const monthlyBreakdown = [];
    let totalIncome = 0;
    let totalExpense = 0;

    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      const monthData = await Cash.aggregate([
        {
          $match: {
            currency,
            date: { $gte: monthStart, $lte: monthEnd }
          }
        },
        {
          $group: {
            _id: null,
            income: {
              $sum: {
                $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
              }
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
              }
            }
          }
        }
      ]);

      const income = monthData[0]?.income || 0;
      const expense = monthData[0]?.expense || 0;
      const profit = income - expense;

      monthlyBreakdown.push({
        month,
        income,
        expense,
        profit
      });

      totalIncome += income;
      totalExpense += expense;
    }

    const closing = opening + totalIncome - totalExpense;
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? netProfit / totalIncome : 0;

    // Eng yaxshi va yomon oylar
    const bestMonth = monthlyBreakdown.reduce((best, current) => 
      current.profit > best.profit ? current : best
    , monthlyBreakdown[0]);

    const worstMonth = monthlyBreakdown.reduce((worst, current) => 
      current.profit < worst.profit ? current : worst
    , monthlyBreakdown[0]);

    res.json({
      success: true,
      data: {
        currency,
        year: parseInt(year),
        opening_balance: opening,
        closing_balance: closing,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_profit: netProfit,
        profit_margin: profitMargin,
        monthly_breakdown: monthlyBreakdown,
        best_month: bestMonth,
        worst_month: worstMonth
      }
    });
  } catch (error) {
    logger.error('Yearly report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Yillik hisobotni olishda xatolik' 
    });
  }
});

module.exports = router;
