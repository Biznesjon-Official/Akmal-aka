const mongoose = require('mongoose');

const vagonLotSchema = new mongoose.Schema({
  // Vagon bog'lanishi
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: [true, 'Vagon tanlanishi shart']
  },
  
  // Yog'och nomi (ixtiyoriy) - YANGILANDI: Ixtiyoriy qilindi
  name: {
    type: String,
    trim: true,
    required: false, // Ixtiyoriy
    comment: 'Yog\'och nomi (ixtiyoriy), masalan: "Premium Taxta"'
  },
  
  // O'lcham ma'lumotlari
  dimensions: {
    type: String,
    required: [true, 'O\'lcham kiritilishi shart'],
    trim: true,
    comment: 'Masalan: 35×125×6 mm'
  },
  quantity: {
    type: Number,
    required: [true, 'Soni kiritilishi shart'],
    min: [1, 'Son 0 dan katta bo\'lishi kerak']
  },
  volume_m3: {
    type: Number,
    required: [true, 'Hajm kiritilishi shart'],
    min: [0.001, 'Hajm 0 dan katta bo\'lishi kerak']
  },
  
  // Xarid ma'lumotlari - YANGILANDI: Faqat RUB
  purchase_currency: {
    type: String,
    enum: ['RUB'], // Faqat RUB
    default: 'RUB',
    required: [true, 'Valyuta tanlanishi shart']
  },
  purchase_amount: {
    type: Number,
    default: 0, // Default 0 - xarajatlar orqali kiritiladi
    min: [0, 'Summa 0 dan kichik bo\'lishi mumkin emas'],
    comment: 'Xarid summasi (0 bo\'lsa, xarajatlar orqali kiritiladi)'
  },
  
  // Yo'qotish (brak) - faqat hajm (m³)
  loss_volume_m3: {
    type: Number,
    default: 0,
    min: [0, 'Yo\'qotish 0 dan kichik bo\'lishi mumkin emas'],
    comment: 'Ombor/transport braki (omborga kelguncha yo\'qotish)'
  },
  loss_responsible_person: {
    type: String,
    trim: true,
    comment: 'Yo\'qotish uchun javobgar shaxs'
  },
  loss_reason: {
    type: String,
    trim: true,
    comment: 'Yo\'qotish sababi'
  },
  loss_date: {
    type: Date,
    comment: 'Yo\'qotish sanasi'
  },
  
  // ANIQ HAJM HISOBI (Yangi terminologiya)
  warehouse_available_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Omborda mavjud hajm = volume_m3 - loss_volume_m3'
  },
  warehouse_dispatched_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Ombordan jo\'natilgan hajm (sotuvlar yig\'indisi)'
  },
  warehouse_remaining_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Omborda qolgan hajm = available - dispatched'
  },
  
  // Sotilgan (avtomatik) - ESKI FIELD'LAR (Backward compatibility)
  sold_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'DEPRECATED: Ishlatilmaydi, warehouse_dispatched_volume_m3 ishlatiladi'
  },
  
  // Qolgan dona soni (avtomatik hisoblash)
  remaining_quantity: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Qolgan dona soni (avtomatik hisoblash)'
  },
  
  // Moliyaviy ma'lumotlar (YANGI TERMINOLOGIYA)
  allocated_expenses: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Taqsimlangan xarajatlar (ExpenseAllocation dan)'
  },
  total_investment: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Jami sarmoya = purchase_amount + allocated_expenses'
  },
  cost_per_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Tannarx = total_investment / volume_m3'
  },
  // YANGI: Tavsiya etilgan sotuv narxi
  recommended_sale_price_per_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Tavsiya etilgan sotuv narxi (m³ uchun) - kirim qilishda avtomatik to\'ldiriladi'
  },
  expected_profit_per_m3: {
    type: Number,
    default: 0,
    comment: 'Kutilayotgan foyda = recommended_sale_price - cost_per_m3'
  },
  expected_profit_margin_percentage: {
    type: Number,
    default: 0,
    comment: 'Kutilayotgan foyda foizi = (expected_profit / recommended_sale_price) * 100'
  },
  total_revenue: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Jami daromad (sotuvlardan)'
  },
  realized_profit: {
    type: Number,
    default: 0,
    comment: 'Haqiqiy foyda = revenue - (investment * sold_percentage)'
  },
  unrealized_value: {
    type: Number,
    default: 0,
    comment: 'Sotilmagan qiymat = remaining_volume * cost_per_m3'
  },
  break_even_price_per_m3: {
    type: Number,
    default: 0,
    comment: 'Rentabellik narxi = cost_per_m3'
  },
  
  // ASOSIY VALYUTADA HISOBLASHLAR (YANGI)
  base_currency_cost_per_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Tannarx asosiy valyutada (USD)'
  },
  base_currency_realized_profit: {
    type: Number,
    default: 0,
    comment: 'Haqiqiy foyda asosiy valyutada (USD)'
  },
  base_currency_unrealized_value: {
    type: Number,
    default: 0,
    comment: 'Sotilmagan qiymat asosiy valyutada (USD)'
  },
  base_currency_total_investment: {
    type: Number,
    default: 0,
    comment: 'Jami sarmoya asosiy valyutada (USD)'
  },
  base_currency_total_revenue: {
    type: Number,
    default: 0,
    comment: 'Jami daromad asosiy valyutada (USD)'
  },
  
  // ESKI FIELD'LAR (Backward compatibility)
  total_expenses: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'DEPRECATED: total_investment ishlatiladi'
  },
  
  // Qo'shimcha
  notes: {
    type: String,
    trim: true
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ⚡ OPTIMIZATSIYA: MongoDB Indexlar (tezroq qidirish uchun)
vagonLotSchema.index({ vagon: 1 });
vagonLotSchema.index({ isDeleted: 1 });
vagonLotSchema.index({ createdAt: -1 }); // Yangi qo'shildi
vagonLotSchema.index({ dimensions: 1 }); // Yangi qo'shildi - o'lcham bo'yicha qidiruv

// Compound indexes - vagon yog'ochlari uchun (Performance Optimization)
vagonLotSchema.index({ vagon: 1, createdAt: -1 }); // Vagon lots by date
vagonLotSchema.index({ vagon: 1, isDeleted: 1 }); // Active vagon lots

// Avtomatik hisoblashlar (save dan oldin)
vagonLotSchema.pre('save', async function(next) {
  try {
    // 0. Avtomatik nom yaratish (agar nom berilmagan bo'lsa)
    if (!this.name && this.isNew) {
      // Shu vagondagi yog'ochlar sonini hisoblash
      const existingCount = await mongoose.model('VagonLot').countDocuments({
        vagon: this.vagon,
        isDeleted: false
      });
      this.name = `Yog'och ${existingCount + 1}`;
    }
    
    // 1. Omborda mavjud hajm = Umumiy hajm - Brak
    const volume = Number(this.volume_m3) || 0;
    const lossVolume = Number(this.loss_volume_m3) || 0;
    const dispatchedVolume = Number(this.warehouse_dispatched_volume_m3) || 0;
    
    this.warehouse_available_volume_m3 = Math.max(0, volume - lossVolume);
    
    // 2. Omborda qolgan hajm = Mavjud - Jo'natilgan
    this.warehouse_remaining_volume_m3 = Math.max(0, this.warehouse_available_volume_m3 - dispatchedVolume);
    
    // 3. Backward compatibility uchun eski field'larni yangilash
    this.sold_volume_m3 = dispatchedVolume;
    this.available_volume_m3 = this.warehouse_available_volume_m3;
    
    // 4. Qolgan soni (taxminiy)
    if (volume > 0 && this.quantity > 0) {
      // Agar hech qanday sotuv bo'lmagan bo'lsa, asl quantity ni qaytarish
      if (dispatchedVolume === 0) {
        this.remaining_quantity = this.quantity;
      } else {
        const remaining_percentage = this.warehouse_remaining_volume_m3 / volume;
        this.remaining_quantity = Math.max(0, Math.round(this.quantity * remaining_percentage));
      }
    } else {
      this.remaining_quantity = 0;
    }
    
    // 5. YANGI MOLIYAVIY HISOBLASHLAR (UNIFIED CURRENCY)
    
    // MUHIM: Yo'g'och xaridi RUB da, lekin tannarx USD da hisoblanishi kerak
    const purchaseAmount = Number(this.purchase_amount) || 0;
    const allocatedExpenses = Number(this.allocated_expenses) || 0;
    const totalRevenue = Number(this.total_revenue) || 0;
    
    // RUB ni USD ga o'tkazish (agar yo'g'och RUB da sotib olingan bo'lsa)
    let purchaseAmountInUsd = purchaseAmount;
    if (this.purchase_currency === 'RUB' && purchaseAmount > 0) {
      try {
        const { getActiveExchangeRate } = require('../utils/exchangeRateHelper');
        const usdToRubRate = await getActiveExchangeRate('USD', 'RUB');
        purchaseAmountInUsd = purchaseAmount / usdToRubRate;
        console.log(`💱 Yo'g'och xaridi konvertatsiya: ${purchaseAmount} RUB / ${usdToRubRate} = ${purchaseAmountInUsd.toFixed(2)} USD`);
      } catch (error) {
        console.error('⚠️ Valyuta kursi topilmadi, default ishlatiladi (1 USD = 90 RUB)');
        purchaseAmountInUsd = purchaseAmount / 90; // Default kurs
      }
    }
    
    // Jami sarmoya USD da = Yo'g'och (USD ga o'tkazilgan) + Qo'shimcha xarajatlar (USD)
    this.total_investment = purchaseAmountInUsd + allocatedExpenses;
    
    // Tannarx = Jami sarmoya / Umumiy hajm
    if (volume > 0) {
      this.cost_per_m3 = this.total_investment / volume;
      this.break_even_price_per_m3 = this.cost_per_m3;
      
      // Kutilayotgan foyda hisoblash (agar tavsiya etilgan narx kiritilgan bo'lsa)
      if (this.recommended_sale_price_per_m3 > 0) {
        this.expected_profit_per_m3 = this.recommended_sale_price_per_m3 - this.cost_per_m3;
        this.expected_profit_margin_percentage = (this.expected_profit_per_m3 / this.recommended_sale_price_per_m3) * 100;
      } else {
        this.expected_profit_per_m3 = 0;
        this.expected_profit_margin_percentage = 0;
      }
    } else {
      this.cost_per_m3 = 0;
      this.break_even_price_per_m3 = 0;
      this.expected_profit_per_m3 = 0;
      this.expected_profit_margin_percentage = 0;
    }
    
    // Haqiqiy foyda = Daromad - (Sarmoya * Sotilgan foiz)
    if (volume > 0) {
      const sold_percentage = dispatchedVolume / volume;
      const proportional_investment = this.total_investment * sold_percentage;
      this.realized_profit = totalRevenue - proportional_investment;
    } else {
      this.realized_profit = 0;
    }
    
    // Sotilmagan qiymat = Qolgan hajm * Tannarx
    this.unrealized_value = this.warehouse_remaining_volume_m3 * this.cost_per_m3;
    
    // Backward compatibility
    this.total_expenses = this.total_investment;
    
    // Asosiy valyutaga konvertatsiya (xatolik bo'lsa ham davom etadi)
    try {
      const SystemSettings = require('./SystemSettings');
      
      const investmentInBase = await SystemSettings.convertToBaseCurrency(
        this.total_investment, 
        this.purchase_currency
      );
      
      const revenueInBase = await SystemSettings.convertToBaseCurrency(
        totalRevenue, 
        this.purchase_currency
      );
      
      // Asosiy valyutada tannarx
      if (volume > 0) {
        this.base_currency_cost_per_m3 = investmentInBase.amount / volume;
      } else {
        this.base_currency_cost_per_m3 = 0;
      }
      
      // Asosiy valyutada foyda
      if (volume > 0) {
        const sold_percentage = dispatchedVolume / volume;
        const proportional_investment_base = investmentInBase.amount * sold_percentage;
        this.base_currency_realized_profit = revenueInBase.amount - proportional_investment_base;
      } else {
        this.base_currency_realized_profit = 0;
      }
      
      // Asosiy valyutada qiymatlar
      this.base_currency_unrealized_value = this.warehouse_remaining_volume_m3 * (this.base_currency_cost_per_m3 || 0);
      this.base_currency_total_investment = investmentInBase.amount;
      this.base_currency_total_revenue = revenueInBase.amount;
      
    } catch (error) {
      console.error('⚠️ Currency conversion error in VagonLot (using fallback):', error.message);
      
      // MUHIM: Valyuta konvertatsiya xatosi - foydalanuvchiga ogohlantirish
      const logger = require('../utils/logger');
      logger.error('Valyuta konvertatsiya xatosi:', {
        lotId: this._id,
        currency: this.purchase_currency,
        error: error.message
      });
      
      // Xatolik bo'lsa, asl valyutadagi qiymatlarni ishlatish
      this.base_currency_cost_per_m3 = this.cost_per_m3;
      this.base_currency_realized_profit = this.realized_profit;
      this.base_currency_unrealized_value = this.unrealized_value;
      this.base_currency_total_investment = this.total_investment;
      this.base_currency_total_revenue = totalRevenue;
      
      // Ogohlantirish belgisi qo'shish
      if (!this.notes) {
        this.notes = '';
      }
      if (!this.notes.includes('⚠️ VALYUTA KONVERTATSIYA XATOSI')) {
        this.notes += '\n⚠️ VALYUTA KONVERTATSIYA XATOSI: Hisob-kitoblar asl valyutada ko\'rsatilgan. Iltimos, valyuta kursini tekshiring.';
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ VagonLot pre-save hook error:', error);
    next(error);
  }
});

// Post-save: Brak uchun LossLiability yaratish
vagonLotSchema.post('save', async function(doc) {
  // Agar brak bor va javobgar shaxs ko'rsatilgan bo'lsa
  if (doc.loss_volume_m3 > 0 && doc.loss_responsible_person && doc.isNew) {
    try {
      const LossLiability = require('./LossLiability');
      
      // Zarar qiymatini hisoblash
      const estimatedLossValue = doc.loss_volume_m3 * doc.cost_per_m3;
      
      const lossLiability = new LossLiability({
        loss_type: 'warehouse_loss',
        vagon: doc.vagon,
        lot: doc._id,
        loss_volume_m3: doc.loss_volume_m3,
        loss_date: doc.loss_date || new Date(),
        loss_location: 'Ombor/Transport',
        loss_reason: doc.loss_reason || 'Noma\'lum sabab',
        responsible_person: doc.loss_responsible_person,
        estimated_loss_value: estimatedLossValue,
        estimated_loss_currency: doc.purchase_currency,
        liability_percentage: 100, // To'liq javobgarlik
        created_by: doc.created_by || doc.vagon // Fallback
      });
      
      await lossLiability.save();
      
      console.log(`✅ LossLiability yaratildi: ${doc.loss_responsible_person} - ${doc.loss_volume_m3} m³`);
    } catch (error) {
      console.error('❌ LossLiability yaratishda xatolik:', error);
      // Xatolik asosiy jarayonni to'xtatmasligi kerak
    }
  }
});

// Virtual fields
vagonLotSchema.virtual('sold_percentage').get(function() {
  if (this.volume_m3 === 0) return 0;
  return ((this.sold_volume_m3 / this.volume_m3) * 100).toFixed(2);
});

vagonLotSchema.virtual('loss_percentage').get(function() {
  if (this.volume_m3 === 0) return 0;
  return ((this.loss_volume_m3 / this.volume_m3) * 100).toFixed(2);
});

// JSON ga o'tkazganda virtual fieldlarni ko'rsatish
vagonLotSchema.set('toJSON', { virtuals: true });
vagonLotSchema.set('toObject', { virtuals: true });

// Instance method: Brak uchun javobgarlik yaratish
vagonLotSchema.methods.createLossLiability = async function(
  responsiblePerson, 
  lossType, 
  incidentDescription,
  reportedBy,
  liabilityPercentage = 100
) {
  if (this.loss_volume_m3 <= 0) {
    throw new Error('Brak hajmi 0 dan katta bo\'lishi kerak');
  }
  
  const LossLiability = require('./LossLiability');
  
  // Yo'qotish qiymatini hisoblash
  const lossValue = this.loss_volume_m3 * this.cost_per_m3;
  const liabilityAmount = (lossValue * liabilityPercentage) / 100;
  
  const liability = new LossLiability({
    loss_source_type: 'vagon_lot',
    loss_source_id: this._id,
    loss_source_model: 'VagonLot',
    loss_type: lossType,
    loss_volume_m3: this.loss_volume_m3,
    loss_value_estimation: lossValue,
    loss_value_currency: this.purchase_currency,
    responsible_person: {
      name: responsiblePerson.name || responsiblePerson,
      position: responsiblePerson.position || '',
      phone: responsiblePerson.phone || '',
      employee_id: responsiblePerson.employee_id || ''
    },
    liability_amount: liabilityAmount,
    liability_currency: this.purchase_currency,
    liability_percentage: liabilityPercentage,
    incident_date: this.loss_date || new Date(),
    incident_description: incidentDescription,
    reported_by: reportedBy,
    status: 'liability_assigned'
  });
  
  await liability.save();
  
  // Audit log
  const AuditLog = require('./AuditLog');
  await AuditLog.createLog({
    user: reportedBy,
    username: 'System',
    action: 'CREATE',
    resource_type: 'LossLiability',
    resource_id: liability._id,
    description: `Brak uchun javobgarlik yaratildi: ${responsiblePerson.name || responsiblePerson}`,
    context: {
      lot_id: this._id,
      loss_volume: this.loss_volume_m3,
      liability_amount: liabilityAmount,
      responsible_person: responsiblePerson.name || responsiblePerson
    }
  });
  
  return liability;
};

// Post-save hook: Vagon jami ma'lumotlarini yangilash (AVTOMATIK OPTIMIZATSIYA)
vagonLotSchema.post('save', async function(doc) {
  try {
    const { autoUpdateVagonTotals, autoCreateIndexes } = require('../middleware/autoOptimization');
    
    // Vagon totals'ni avtomatik yangilash
    await autoUpdateVagonTotals(doc.vagon);
    
    // Yangi field'lar uchun avtomatik index yaratish
    await autoCreateIndexes('vagonlots', doc.toObject());
    
  } catch (error) {
    console.error('❌ VagonLot post-save optimization error:', error.message);
    // Xatolik asosiy jarayonni to'xtatmasligi kerak
  }
});

// Post-remove hook: Vagon jami ma'lumotlarini yangilash
vagonLotSchema.post('remove', async function(doc) {
  try {
    const { autoUpdateVagonTotals } = require('../middleware/autoOptimization');
    await autoUpdateVagonTotals(doc.vagon);
  } catch (error) {
    console.error('❌ VagonLot post-remove optimization error:', error.message);
  }
});

module.exports = mongoose.model('VagonLot', vagonLotSchema);
