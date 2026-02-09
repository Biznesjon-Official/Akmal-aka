/**
 * Yo'qotish Javobgarligi Helper
 * Transport va brak yo'qotishlari uchun avtomatik liability yaratish
 */

const logger = require('./logger');

/**
 * Transport yo'qotishi uchun liability yaratish
 */
async function createTransportLossLiability(vagonSale, session = null) {
  try {
    // Transport yo'qotishi bo'lmasa, hech narsa qilmaslik
    if (!vagonSale.transport_loss_m3 || vagonSale.transport_loss_m3 <= 0) {
      return null;
    }
    
    const LossLiability = require('../models/LossLiability');
    
    // Yo'qotish qiymatini hisoblash
    const lossValue = vagonSale.transport_loss_m3 * (vagonSale.price_per_m3 || 0);
    
    // Javobgar shaxs
    const responsiblePerson = vagonSale.transport_loss_responsible_person || 'Noma\'lum';
    
    const liabilityData = {
      loss_source_type: 'vagon_sale',
      loss_source_id: vagonSale._id,
      loss_source_model: 'VagonSale',
      loss_type: 'transport',
      loss_volume_m3: vagonSale.transport_loss_m3,
      loss_value_estimation: lossValue,
      loss_value_currency: vagonSale.sale_currency,
      responsible_person: {
        name: responsiblePerson,
        position: '',
        phone: '',
        employee_id: ''
      },
      liability_amount: lossValue, // 100% javobgarlik
      liability_currency: vagonSale.sale_currency,
      liability_percentage: 100,
      incident_date: vagonSale.sale_date || new Date(),
      incident_description: vagonSale.transport_loss_reason || 'Transport yo\'qotishi',
      reported_by: vagonSale.createdBy || 'System',
      status: 'liability_assigned'
    };
    
    let liability;
    if (session) {
      [liability] = await LossLiability.create([liabilityData], { session });
    } else {
      liability = await LossLiability.create(liabilityData);
    }
    
    logger.info(`✅ Transport yo'qotish liability yaratildi: ${liability._id}`, {
      vagonSaleId: vagonSale._id,
      lossVolume: vagonSale.transport_loss_m3,
      lossValue,
      responsiblePerson
    });
    
    return liability;
    
  } catch (error) {
    logger.error('❌ Transport yo\'qotish liability yaratishda xato:', error);
    throw error;
  }
}

/**
 * Brak yo'qotishi uchun liability yaratish
 */
async function createBrakLossLiability(vagonSale, session = null) {
  try {
    // Brak yo'qotishi bo'lmasa, hech narsa qilmaslik
    if (!vagonSale.brak_volume_m3 || vagonSale.brak_volume_m3 <= 0) {
      return null;
    }
    
    const LossLiability = require('../models/LossLiability');
    
    // Brak qiymatini hisoblash
    const brakValue = vagonSale.brak_volume_m3 * (vagonSale.price_per_m3 || 0);
    
    // Javobgarlik taqsimoti
    const distribution = vagonSale.brak_liability_distribution || {
      seller_percentage: 100,
      buyer_percentage: 0
    };
    
    const liabilities = [];
    
    // Sotuvchi javobgarligi
    if (distribution.seller_percentage > 0) {
      const sellerLiabilityAmount = (brakValue * distribution.seller_percentage) / 100;
      
      const sellerLiabilityData = {
        loss_source_type: 'vagon_sale',
        loss_source_id: vagonSale._id,
        loss_source_model: 'VagonSale',
        loss_type: 'brak',
        loss_volume_m3: vagonSale.brak_volume_m3,
        loss_value_estimation: brakValue,
        loss_value_currency: vagonSale.sale_currency,
        responsible_person: {
          name: 'Sotuvchi (Biznes)',
          position: 'Seller',
          phone: '',
          employee_id: ''
        },
        liability_amount: sellerLiabilityAmount,
        liability_currency: vagonSale.sale_currency,
        liability_percentage: distribution.seller_percentage,
        incident_date: vagonSale.sale_date || new Date(),
        incident_description: `Brak yo'qotishi - Sotuvchi javobgarligi (${distribution.seller_percentage}%)`,
        reported_by: vagonSale.createdBy || 'System',
        status: 'liability_assigned'
      };
      
      let sellerLiability;
      if (session) {
        [sellerLiability] = await LossLiability.create([sellerLiabilityData], { session });
      } else {
        sellerLiability = await LossLiability.create(sellerLiabilityData);
      }
      
      liabilities.push(sellerLiability);
      logger.info(`✅ Sotuvchi brak liability yaratildi: ${sellerLiability._id}`);
    }
    
    // Xaridor javobgarligi
    if (distribution.buyer_percentage > 0) {
      const buyerLiabilityAmount = (brakValue * distribution.buyer_percentage) / 100;
      
      const buyerLiabilityData = {
        loss_source_type: 'vagon_sale',
        loss_source_id: vagonSale._id,
        loss_source_model: 'VagonSale',
        loss_type: 'brak',
        loss_volume_m3: vagonSale.brak_volume_m3,
        loss_value_estimation: brakValue,
        loss_value_currency: vagonSale.sale_currency,
        responsible_person: {
          name: vagonSale.client?.name || 'Mijoz',
          position: 'Buyer',
          phone: vagonSale.client?.phone || '',
          employee_id: ''
        },
        liability_amount: buyerLiabilityAmount,
        liability_currency: vagonSale.sale_currency,
        liability_percentage: distribution.buyer_percentage,
        incident_date: vagonSale.sale_date || new Date(),
        incident_description: `Brak yo'qotishi - Xaridor javobgarligi (${distribution.buyer_percentage}%)`,
        reported_by: vagonSale.createdBy || 'System',
        status: 'liability_assigned'
      };
      
      let buyerLiability;
      if (session) {
        [buyerLiability] = await LossLiability.create([buyerLiabilityData], { session });
      } else {
        buyerLiability = await LossLiability.create(buyerLiabilityData);
      }
      
      liabilities.push(buyerLiability);
      logger.info(`✅ Xaridor brak liability yaratildi: ${buyerLiability._id}`);
    }
    
    return liabilities;
    
  } catch (error) {
    logger.error('❌ Brak liability yaratishda xato:', error);
    throw error;
  }
}

/**
 * VagonLot yo'qotishi uchun liability yaratish
 */
async function createLotLossLiability(vagonLot, session = null) {
  try {
    // Yo'qotish bo'lmasa, hech narsa qilmaslik
    if (!vagonLot.loss_volume_m3 || vagonLot.loss_volume_m3 <= 0) {
      return null;
    }
    
    const LossLiability = require('../models/LossLiability');
    
    // Yo'qotish qiymatini hisoblash
    const lossValue = vagonLot.loss_volume_m3 * (vagonLot.cost_per_m3 || 0);
    
    // Javobgar shaxs
    const responsiblePerson = vagonLot.loss_responsible_person || 'Noma\'lum';
    
    const liabilityData = {
      loss_source_type: 'vagon_lot',
      loss_source_id: vagonLot._id,
      loss_source_model: 'VagonLot',
      loss_type: 'warehouse',
      loss_volume_m3: vagonLot.loss_volume_m3,
      loss_value_estimation: lossValue,
      loss_value_currency: vagonLot.purchase_currency,
      responsible_person: {
        name: responsiblePerson,
        position: '',
        phone: '',
        employee_id: ''
      },
      liability_amount: lossValue,
      liability_currency: vagonLot.purchase_currency,
      liability_percentage: 100,
      incident_date: vagonLot.loss_date || new Date(),
      incident_description: vagonLot.loss_reason || 'Ombor yo\'qotishi',
      reported_by: vagonLot.createdBy || 'System',
      status: 'liability_assigned'
    };
    
    let liability;
    if (session) {
      [liability] = await LossLiability.create([liabilityData], { session });
    } else {
      liability = await LossLiability.create(liabilityData);
    }
    
    logger.info(`✅ Lot yo'qotish liability yaratildi: ${liability._id}`, {
      vagonLotId: vagonLot._id,
      lossVolume: vagonLot.loss_volume_m3,
      lossValue,
      responsiblePerson
    });
    
    return liability;
    
  } catch (error) {
    logger.error('❌ Lot yo\'qotish liability yaratishda xato:', error);
    throw error;
  }
}

/**
 * Barcha yo'qotishlar uchun liability yaratish (VagonSale uchun)
 */
async function createAllLiabilities(vagonSale, session = null) {
  const liabilities = [];
  
  try {
    // Transport yo'qotishi
    const transportLiability = await createTransportLossLiability(vagonSale, session);
    if (transportLiability) {
      liabilities.push(transportLiability);
    }
    
    // Brak yo'qotishi
    const brakLiabilities = await createBrakLossLiability(vagonSale, session);
    if (brakLiabilities && brakLiabilities.length > 0) {
      liabilities.push(...brakLiabilities);
    }
    
    logger.info(`✅ Jami ${liabilities.length} ta liability yaratildi`);
    
    return liabilities;
    
  } catch (error) {
    logger.error('❌ Liability yaratishda xato:', error);
    throw error;
  }
}

module.exports = {
  createTransportLossLiability,
  createBrakLossLiability,
  createLotLossLiability,
  createAllLiabilities
};
