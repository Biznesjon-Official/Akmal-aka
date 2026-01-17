const mongoose = require('mongoose');

const vagonSaleSchema = new mongoose.Schema({
  // Asosiy bog'lanishlar
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: [true, 'Vagon tanlanishi shart']
  },
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonLot',
    required: [true, 'Lot tanlanishi shart']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Mijoz tanlanishi shart']
  },
  
  // ANIQ HAJM MA'LUMOTLARI (Yangi terminologiya)
  warehouse_dispatched_volume_m3: {
    type: Number,
    required: [true, 'Ombordan jo\'natilgan hajm kiritilishi shart'],
    min: [0.01, 'Hajm 0 dan katta bo\'lishi kerak'],
    comment: 'Ombordan jo\'natilgan hajm'
  },
  transport_loss_m3: {
    type: Number,
    default: 0,
    min: [0, 'Transport yo\'qotishi 0 dan kichik bo\'lishi mumkin emas'],
    comment: 'Transport vaqtidagi yo\'qotish'
  },
  client_received_volume_m3: {
    type: Number,
    min: 0,
    comment: 'Mijoz qabul qilgan hajm = dispatched - transport_loss'
  },
  
  // Transport yo'qotishi uchun javobgarlik
  transport_loss_responsible_person: {
    type: String,
    trim: true,
    comment: 'Transport yo\'qotishi uchun javobgar shaxs'
  },
  transport_loss_reason: {
    type: String,
    trim: true,
    comment: 'Transport yo\'qotishi sababi'
  },
  
  // BRAK JAVOBGARLIK TAQSIMOTI
  brak_liability_distribution: {
    seller_percentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
      comment: 'Sotuvchi (biznes) javobgarlik foizi'
    },
    buyer_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      comment: 'Xaridor javobgarlik foizi'
    },
    total_brak_volume_m3: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Jami brak hajmi'
    },
    seller_liable_volume_m3: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Sotuvchi javobgarligidagi brak hajmi'
    },
    buyer_liable_volume_m3: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Xaridor javobgarligidagi brak hajmi'
    },
    buyer_must_pay_for_brak: {
      type: Boolean,
      default: false,
      comment: 'Xaridor brak uchun to\'lov qilishi kerakmi'
    }
  },
  
  // ESKI FIELD'LAR (Backward compatibility)
  sent_volume_m3: {
    type: Number,
    required: [true, 'Jo\'natilgan hajm kiritilishi shart'],
    min: [0.01, 'Hajm 0 dan katta bo\'lishi kerak'],
    comment: 'DEPRECATED: warehouse_dispatched_volume_m3 ishlatiladi'
  },
  client_loss_m3: {
    type: Number,
    default: 0,
    min: [0, 'Yo\'qotish 0 dan kichik bo\'lishi mumkin emas'],
    comment: 'DEPRECATED: transport_loss_m3 ishlatiladi'
  },
  client_loss_responsible_person: {
    type: String,
    trim: true,
    comment: 'DEPRECATED: transport_loss_responsible_person ishlatiladi'
  },
  client_loss_reason: {
    type: String,
    trim: true,
    comment: 'DEPRECATED: transport_loss_reason ishlatiladi'
  },
  accepted_volume_m3: {
    type: Number,
    min: 0,
    comment: 'DEPRECATED: client_received_volume_m3 ishlatiladi'
  },
  
  // Narx ma'lumotlari
  sale_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: [true, 'Valyuta tanlanishi shart']
  },
  price_per_m3: {
    type: Number,
    required: [true, 'Narx kiritilishi shart'],
    min: [1, 'Narx 0 dan katta bo\'lishi kerak']
  },
  exchange_rate: {
    type: Number,
    default: 1
  },
  total_price: {
    type: Number,
    min: 0,
    comment: 'Jami narx (lot valyutasida)'
  },
  
  // To'lov ma'lumotlari (lot valyutasida)
  paid_amount: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'To\'langan summa (lot valyutasida)'
  },
  debt: {
    type: Number,
    default: 0,
    comment: 'Qarz (lot valyutasida)'
  },
  
  // Qo'shimcha
  sale_date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  
  // Holat
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
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
vagonSaleSchema.index({ vagon: 1 });
vagonSaleSchema.index({ client: 1 });
vagonSaleSchema.index({ status: 1 });
vagonSaleSchema.index({ isDeleted: 1 });
vagonSaleSchema.index({ sale_date: -1 });

// Avtomatik hisoblashlar (save dan oldin)
vagonSaleSchema.pre('save', function(next) {
  // YANGI TERMINOLOGIYA BILAN HISOBLASH
  
  // 1. Yangi field'larni eski field'lardan to'ldirish (agar yangi field'lar bo'sh bo'lsa)
  if (!this.warehouse_dispatched_volume_m3 && this.sent_volume_m3) {
    this.warehouse_dispatched_volume_m3 = this.sent_volume_m3;
  }
  if (!this.transport_loss_m3 && this.client_loss_m3) {
    this.transport_loss_m3 = this.client_loss_m3;
  }
  if (!this.transport_loss_responsible_person && this.client_loss_responsible_person) {
    this.transport_loss_responsible_person = this.client_loss_responsible_person;
  }
  if (!this.transport_loss_reason && this.client_loss_reason) {
    this.transport_loss_reason = this.client_loss_reason;
  }
  
  // 2. BRAK JAVOBGARLIK HISOBLASH
  if (this.brak_liability_distribution) {
    const brakDist = this.brak_liability_distribution;
    
    // Foizlar yig'indisi 100% bo'lishi kerak
    if (brakDist.seller_percentage + brakDist.buyer_percentage !== 100) {
      brakDist.seller_percentage = 100 - brakDist.buyer_percentage;
    }
    
    // Brak hajmlarini hisoblash
    if (brakDist.total_brak_volume_m3 > 0) {
      brakDist.seller_liable_volume_m3 = (brakDist.total_brak_volume_m3 * brakDist.seller_percentage) / 100;
      brakDist.buyer_liable_volume_m3 = (brakDist.total_brak_volume_m3 * brakDist.buyer_percentage) / 100;
      
      // Xaridor brak uchun to'lov qilishi kerakmi?
      brakDist.buyer_must_pay_for_brak = brakDist.buyer_percentage > 0;
    }
    
    // Transport yo'qotishini brak bilan sinxronlash
    if (!this.transport_loss_m3) {
      this.transport_loss_m3 = brakDist.total_brak_volume_m3;
    }
  }
  
  // 3. Mijoz qabul qilgan hajm = Ombordan jo'natilgan - Transport yo'qotishi
  this.client_received_volume_m3 = this.warehouse_dispatched_volume_m3 - this.transport_loss_m3;
  
  // 4. Backward compatibility uchun eski field'larni yangilash
  this.sent_volume_m3 = this.warehouse_dispatched_volume_m3;
  this.client_loss_m3 = this.transport_loss_m3;
  this.accepted_volume_m3 = this.client_received_volume_m3;
  
  // 5. YANGI TO'LOV HISOBLASH LOGIKASI
  let billableVolume = this.client_received_volume_m3; // Asosiy qabul qilingan hajm
  
  // Agar xaridor brak uchun javobgar bo'lsa, uni ham to'lashi kerak
  if (this.brak_liability_distribution && this.brak_liability_distribution.buyer_must_pay_for_brak) {
    billableVolume += this.brak_liability_distribution.buyer_liable_volume_m3;
  }
  
  // 6. Jami narx = To'lanishi kerak bo'lgan hajm × Narx
  this.total_price = billableVolume * this.price_per_m3;
  
  // 7. Qarz = Jami narx - To'langan
  this.debt = this.total_price - this.paid_amount;
  
  // 8. Holat
  if (this.debt === 0 && this.total_price > 0) {
    this.status = 'paid';
  } else if (this.paid_amount > 0) {
    this.status = 'partial';
  } else {
    this.status = 'pending';
  }
  
  next();
});

// Virtual fields
vagonSaleSchema.virtual('payment_percentage').get(function() {
  if (this.total_price === 0) return 0;
  return ((this.paid_amount / this.total_price) * 100).toFixed(2);
});

vagonSaleSchema.virtual('loss_percentage').get(function() {
  if (this.warehouse_dispatched_volume_m3 === 0) return 0;
  return ((this.transport_loss_m3 / this.warehouse_dispatched_volume_m3) * 100).toFixed(2);
});

// YANGI VIRTUAL FIELD'LAR - BRAK HISOBLASH
vagonSaleSchema.virtual('billable_volume_breakdown').get(function() {
  const received = this.client_received_volume_m3 || 0;
  const buyerBrak = (this.brak_liability_distribution && this.brak_liability_distribution.buyer_must_pay_for_brak) 
    ? this.brak_liability_distribution.buyer_liable_volume_m3 || 0 
    : 0;
  
  return {
    received_volume: received,
    buyer_liable_brak: buyerBrak,
    total_billable: received + buyerBrak,
    brak_payment_required: buyerBrak > 0
  };
});

vagonSaleSchema.virtual('brak_summary').get(function() {
  if (!this.brak_liability_distribution) return null;
  
  const dist = this.brak_liability_distribution;
  return {
    total_brak: dist.total_brak_volume_m3 || 0,
    seller_responsible: {
      percentage: dist.seller_percentage || 100,
      volume: dist.seller_liable_volume_m3 || 0,
      cost_absorbed: (dist.seller_liable_volume_m3 || 0) * this.price_per_m3
    },
    buyer_responsible: {
      percentage: dist.buyer_percentage || 0,
      volume: dist.buyer_liable_volume_m3 || 0,
      must_pay: dist.buyer_must_pay_for_brak || false,
      payment_amount: dist.buyer_must_pay_for_brak ? (dist.buyer_liable_volume_m3 || 0) * this.price_per_m3 : 0
    }
  };
});

// Backward compatibility
vagonSaleSchema.virtual('sent_volume_percentage').get(function() {
  return this.loss_percentage; // Bir xil hisoblash
});

// JSON ga o'tkazganda virtual fieldlarni ko'rsatish
vagonSaleSchema.set('toJSON', { virtuals: true });
vagonSaleSchema.set('toObject', { virtuals: true });

// Post-save: Transport yo'qotishi uchun LossLiability yaratish
vagonSaleSchema.post('save', async function(doc) {
  // Agar transport yo'qotishi bor va javobgar shaxs ko'rsatilgan bo'lsa
  if (doc.transport_loss_m3 > 0 && doc.transport_loss_responsible_person && doc.isNew) {
    try {
      const LossLiability = require('./LossLiability');
      const VagonLot = require('./VagonLot');
      
      // Lot ma'lumotlarini olish (tannarx uchun)
      const lot = await VagonLot.findById(doc.lot);
      if (!lot) return;
      
      // Zarar qiymatini hisoblash
      const estimatedLossValue = doc.transport_loss_m3 * lot.cost_per_m3;
      
      const lossLiability = new LossLiability({
        loss_type: 'transport_loss',
        vagon: doc.vagon,
        lot: doc.lot,
        sale: doc._id,
        loss_volume_m3: doc.transport_loss_m3,
        loss_date: doc.sale_date || new Date(),
        loss_location: 'Transport/Yetkazib berish',
        loss_reason: doc.transport_loss_reason || 'Transport yo\'qotishi',
        responsible_person: doc.transport_loss_responsible_person,
        estimated_loss_value: estimatedLossValue,
        estimated_loss_currency: lot.purchase_currency,
        liability_percentage: 100, // To'liq javobgarlik
        created_by: doc.created_by || doc.vagon // Fallback
      });
      
      await lossLiability.save();
      
      console.log(`✅ Transport LossLiability yaratildi: ${doc.transport_loss_responsible_person} - ${doc.transport_loss_m3} m³`);
    } catch (error) {
      console.error('❌ Transport LossLiability yaratishda xatolik:', error);
      // Xatolik asosiy jarayonni to'xtatmasligi kerak
    }
  }
});

// Instance method: To'lov qilish mumkinligini tekshirish
vagonSaleSchema.methods.canPay = function(amount) {
  return amount > 0 && amount <= this.debt;
};

// Instance method: To'liq to'langanligini tekshirish
vagonSaleSchema.methods.isPaid = function() {
  return this.debt === 0 && this.total_price > 0;
};

// Instance method: Brak javobgarligini o'rnatish
vagonSaleSchema.methods.setBrakLiability = function(
  totalBrakVolume, 
  sellerPercentage = 100, 
  buyerPercentage = 0
) {
  // Foizlar yig'indisi 100% bo'lishi kerak
  if (sellerPercentage + buyerPercentage !== 100) {
    throw new Error('Javobgarlik foizlari yig\'indisi 100% bo\'lishi kerak');
  }
  
  if (totalBrakVolume < 0) {
    throw new Error('Brak hajmi 0 dan kichik bo\'lishi mumkin emas');
  }
  
  this.brak_liability_distribution = {
    seller_percentage: sellerPercentage,
    buyer_percentage: buyerPercentage,
    total_brak_volume_m3: totalBrakVolume,
    seller_liable_volume_m3: (totalBrakVolume * sellerPercentage) / 100,
    buyer_liable_volume_m3: (totalBrakVolume * buyerPercentage) / 100,
    buyer_must_pay_for_brak: buyerPercentage > 0
  };
  
  // Transport yo'qotishini yangilash
  this.transport_loss_m3 = totalBrakVolume;
  this.client_loss_m3 = totalBrakVolume; // Backward compatibility
  
  return this;
};

// Instance method: To'lov hisoblash tafsilotlari
vagonSaleSchema.methods.getPaymentBreakdown = function() {
  const receivedVolume = this.client_received_volume_m3 || 0;
  const pricePerM3 = this.price_per_m3 || 0;
  
  let buyerBrakVolume = 0;
  let buyerBrakPayment = 0;
  let sellerAbsorbedLoss = 0;
  
  if (this.brak_liability_distribution) {
    const dist = this.brak_liability_distribution;
    buyerBrakVolume = dist.buyer_liable_volume_m3 || 0;
    buyerBrakPayment = dist.buyer_must_pay_for_brak ? buyerBrakVolume * pricePerM3 : 0;
    sellerAbsorbedLoss = (dist.seller_liable_volume_m3 || 0) * pricePerM3;
  }
  
  const receivedPayment = receivedVolume * pricePerM3;
  const totalPayment = receivedPayment + buyerBrakPayment;
  
  return {
    received_volume: receivedVolume,
    received_payment: receivedPayment,
    buyer_brak_volume: buyerBrakVolume,
    buyer_brak_payment: buyerBrakPayment,
    total_billable_volume: receivedVolume + buyerBrakVolume,
    total_payment_due: totalPayment,
    seller_absorbed_loss: sellerAbsorbedLoss,
    currency: this.sale_currency,
    price_per_m3: pricePerM3
  };
};

// Instance method: Transport yo'qotishi uchun javobgarlik yaratish
vagonSaleSchema.methods.createTransportLossLiability = async function(
  responsiblePerson,
  lossType,
  incidentDescription,
  reportedBy,
  liabilityPercentage = 100
) {
  if (this.transport_loss_m3 <= 0) {
    throw new Error('Transport yo\'qotishi 0 dan katta bo\'lishi kerak');
  }
  
  const LossLiability = require('./LossLiability');
  
  // Yo'qotish qiymatini hisoblash (sotuv narxi bo'yicha)
  const lossValue = this.transport_loss_m3 * this.price_per_m3;
  const liabilityAmount = (lossValue * liabilityPercentage) / 100;
  
  const liability = new LossLiability({
    loss_source_type: 'vagon_sale',
    loss_source_id: this._id,
    loss_source_model: 'VagonSale',
    loss_type: lossType,
    loss_volume_m3: this.transport_loss_m3,
    loss_value_estimation: lossValue,
    loss_value_currency: this.sale_currency,
    responsible_person: {
      name: responsiblePerson.name || responsiblePerson,
      position: responsiblePerson.position || '',
      phone: responsiblePerson.phone || '',
      employee_id: responsiblePerson.employee_id || ''
    },
    liability_amount: liabilityAmount,
    liability_currency: this.sale_currency,
    liability_percentage: liabilityPercentage,
    incident_date: this.sale_date,
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
    description: `Transport yo\'qotishi uchun javobgarlik yaratildi: ${responsiblePerson.name || responsiblePerson}`,
    context: {
      sale_id: this._id,
      loss_volume: this.transport_loss_m3,
      liability_amount: liabilityAmount,
      responsible_person: responsiblePerson.name || responsiblePerson
    }
  });
  
  return liability;
};

module.exports = mongoose.model('VagonSale', vagonSaleSchema);
