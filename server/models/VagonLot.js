const mongoose = require('mongoose');

const vagonLotSchema = new mongoose.Schema({
  // Vagon bog'lanishi
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: [true, 'Vagon tanlanishi shart']
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
  
  // Xarid ma'lumotlari
  purchase_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: [true, 'Valyuta tanlanishi shart']
  },
  purchase_amount: {
    type: Number,
    required: [true, 'Xarid summasi kiritilishi shart'],
    min: [0, 'Summa 0 dan kichik bo\'lishi mumkin emas']
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
  available_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'DEPRECATED: warehouse_available_volume_m3 ishlatiladi'
  },
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
  remaining_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'DEPRECATED: Ishlatilmaydi, warehouse_remaining_volume_m3 ishlatiladi'
  },
  
  // Moliyaviy ma'lumotlar (YANGI TERMINOLOGIYA)
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
  profit: {
    type: Number,
    default: 0,
    comment: 'DEPRECATED: realized_profit ishlatiladi'
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

// Indexlar
vagonLotSchema.index({ vagon: 1 });
vagonLotSchema.index({ isDeleted: 1 });

// Avtomatik hisoblashlar (save dan oldin)
vagonLotSchema.pre('save', async function(next) {
  // 1. Omborda mavjud hajm = Umumiy hajm - Brak
  const volume = Number(this.volume_m3) || 0;
  const lossVolume = Number(this.loss_volume_m3) || 0;
  const dispatchedVolume = Number(this.warehouse_dispatched_volume_m3) || 0;
  
  this.warehouse_available_volume_m3 = Math.max(0, volume - lossVolume);
  
  // 2. Omborda qolgan hajm = Mavjud - Jo'natilgan
  this.warehouse_remaining_volume_m3 = Math.max(0, this.warehouse_available_volume_m3 - dispatchedVolume);
  
  // 3. Backward compatibility uchun eski field'larni yangilash
  this.sold_volume_m3 = dispatchedVolume;
  this.remaining_volume_m3 = this.warehouse_remaining_volume_m3;
  this.available_volume_m3 = this.warehouse_available_volume_m3;
  
  // 4. Qolgan soni (taxminiy)
  if (volume > 0 && this.quantity > 0) {
    const remaining_percentage = this.warehouse_remaining_volume_m3 / volume;
    this.remaining_quantity = Math.max(0, Math.floor(this.quantity * remaining_percentage));
  } else {
    this.remaining_quantity = 0;
  }
  
  // 5. YANGI MOLIYAVIY HISOBLASHLAR (UNIFIED CURRENCY)
  
  try {
    const SystemSettings = require('./SystemSettings');
    
    // Jami sarmoya = Xarid + Taqsimlangan xarajatlar
    const purchaseAmount = Number(this.purchase_amount) || 0;
    const allocatedExpenses = Number(this.allocated_expenses) || 0;
    const totalRevenue = Number(this.total_revenue) || 0;
    
    this.total_investment = purchaseAmount + allocatedExpenses;
    
    // Asosiy valyutaga konvertatsiya
    const investmentInBase = await SystemSettings.convertToBaseCurrency(
      this.total_investment, 
      this.purchase_currency
    );
    
    const revenueInBase = await SystemSettings.convertToBaseCurrency(
      totalRevenue, 
      this.purchase_currency
    );
    
    // Tannarx = Jami sarmoya / Umumiy hajm (asosiy valyutada)
    if (volume > 0) {
      this.cost_per_m3 = this.total_investment / volume;
      this.break_even_price_per_m3 = this.cost_per_m3;
      
      // Asosiy valyutada tannarx
      this.base_currency_cost_per_m3 = investmentInBase.amount / volume;
    } else {
      this.cost_per_m3 = 0;
      this.break_even_price_per_m3 = 0;
      this.base_currency_cost_per_m3 = 0;
    }
    
    // Haqiqiy foyda = Daromad - (Sarmoya * Sotilgan foiz)
    if (volume > 0) {
      const sold_percentage = dispatchedVolume / volume;
      const proportional_investment = this.total_investment * sold_percentage;
      this.realized_profit = totalRevenue - proportional_investment;
      
      // Asosiy valyutada foyda
      const proportional_investment_base = investmentInBase.amount * sold_percentage;
      this.base_currency_realized_profit = revenueInBase.amount - proportional_investment_base;
    } else {
      this.realized_profit = 0;
      this.base_currency_realized_profit = 0;
    }
    
    // Sotilmagan qiymat = Qolgan hajm * Tannarx
    this.unrealized_value = this.warehouse_remaining_volume_m3 * this.cost_per_m3;
    this.base_currency_unrealized_value = this.warehouse_remaining_volume_m3 * (this.base_currency_cost_per_m3 || 0);
    
    // Asosiy valyutada jami qiymatlar
    this.base_currency_total_investment = investmentInBase.amount;
    this.base_currency_total_revenue = revenueInBase.amount;
    
    // 6. Backward compatibility
    this.total_expenses = this.total_investment;
    this.profit = this.realized_profit;
    
  } catch (error) {
    console.error('Currency conversion error in VagonLot:', error);
    // Xatolik bo'lsa, eski usul bilan hisoblash
    const purchaseAmount = Number(this.purchase_amount) || 0;
    const allocatedExpenses = Number(this.allocated_expenses) || 0;
    const totalRevenue = Number(this.total_revenue) || 0;
    
    this.total_investment = purchaseAmount + allocatedExpenses;
    
    if (volume > 0) {
      this.cost_per_m3 = this.total_investment / volume;
      this.break_even_price_per_m3 = this.cost_per_m3;
    } else {
      this.cost_per_m3 = 0;
      this.break_even_price_per_m3 = 0;
    }
    
    if (volume > 0) {
      const sold_percentage = dispatchedVolume / volume;
      const proportional_investment = this.total_investment * sold_percentage;
      this.realized_profit = totalRevenue - proportional_investment;
    } else {
      this.realized_profit = 0;
    }
    
    this.unrealized_value = this.warehouse_remaining_volume_m3 * this.cost_per_m3;
    this.total_expenses = this.total_investment;
    this.profit = this.realized_profit;
    
    // Asosiy valyutada default qiymatlar
    this.base_currency_cost_per_m3 = this.cost_per_m3;
    this.base_currency_realized_profit = this.realized_profit;
    this.base_currency_unrealized_value = this.unrealized_value;
    this.base_currency_total_investment = this.total_investment;
    this.base_currency_total_revenue = totalRevenue;
  }
  
  next();
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

module.exports = mongoose.model('VagonLot', vagonLotSchema);