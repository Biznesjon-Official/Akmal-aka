// VagonSale uchun business logic
const VagonSale = require('../models/VagonSale');
const Client = require('../models/Client');
const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');
const Cash = require('../models/Cash');

/**
 * Vagon sotuvini yaratish
 */
async function createVagonSale(saleData, userId) {
  const {
    saleType,
    client,
    saleItems,
    woodType,
    saleUnit,
    sentVolume,
    sentQuantity,
    acceptedVolume,
    acceptedQuantity,
    clientLossVolume,
    clientLossQuantity,
    clientLossResponsiblePerson,
    clientLossReason,
    transportLossVolume,
    transportLossResponsiblePerson,
    transportLossReason,
    saleCurrency,
    pricePerM3,
    pricePerPiece,
    totalPrice,
    paidAmount,
    paymentCurrency,
    saleDate,
    notes
  } = saleData;

  // Mijozni tekshirish
  const clientDoc = await Client.findById(client);
  if (!clientDoc) {
    throw new Error('Mijoz topilmadi');
  }

  // Sotuv yaratish
  const sale = new VagonSale({
    sale_type: saleType,
    client,
    wood_type: woodType,
    sale_unit: saleUnit,
    sent_volume_m3: sentVolume,
    sent_quantity: sentQuantity,
    accepted_volume_m3: acceptedVolume,
    accepted_quantity: acceptedQuantity,
    client_loss_m3: clientLossVolume,
    client_loss_quantity: clientLossQuantity,
    client_loss_responsible_person: clientLossResponsiblePerson,
    client_loss_reason: clientLossReason,
    transport_loss_m3: transportLossVolume,
    transport_loss_responsible_person: transportLossResponsiblePerson,
    transport_loss_reason: transportLossReason,
    sale_currency: saleCurrency,
    price_per_m3: pricePerM3,
    price_per_piece: pricePerPiece,
    total_price: totalPrice,
    paid_amount: paidAmount,
    debt: totalPrice - paidAmount,
    sale_date: saleDate,
    notes,
    createdBy: userId
  });

  await sale.save();

  // Agar to'lov bo'lsa, Cash ga yozish
  if (paidAmount > 0) {
    const cashEntry = new Cash({
      type: 'client_payment',
      amount: paidAmount,
      currency: paymentCurrency,
      description: `Vagon sotuvi uchun to'lov - ${clientDoc.name}`,
      client,
      vagonSale: sale._id,
      createdBy: userId
    });
    await cashEntry.save();
  }

  // Mijoz qarzini yangilash
  await updateClientDebt(client, saleCurrency, totalPrice - paidAmount);

  return sale;
}

/**
 * Mijoz qarzini yangilash
 */
async function updateClientDebt(clientId, currency, debtAmount) {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Mijoz topilmadi');
  }

  if (currency === 'USD') {
    client.usd_current_debt = (client.usd_current_debt || 0) + debtAmount;
    client.usd_total_debt = (client.usd_total_debt || 0) + debtAmount;
  } else if (currency === 'RUB') {
    client.rub_current_debt = (client.rub_current_debt || 0) + debtAmount;
    client.rub_total_debt = (client.rub_total_debt || 0) + debtAmount;
  }

  await client.save();
  return client;
}

/**
 * Vagon sotuviga to'lov qo'shish
 */
async function addPaymentToSale(saleId, paymentData, userId) {
  const { amount, currency, description } = paymentData;

  const sale = await VagonSale.findById(saleId);
  if (!sale) {
    throw new Error('Sotuv topilmadi');
  }

  // To'lovni Cash ga yozish
  const cashEntry = new Cash({
    type: 'client_payment',
    amount,
    currency,
    description: description || `Vagon sotuvi uchun to'lov`,
    client: sale.client,
    vagonSale: sale._id,
    createdBy: userId
  });
  await cashEntry.save();

  // Sotuvni yangilash
  sale.paid_amount += amount;
  sale.debt = sale.total_price - sale.paid_amount;
  await sale.save();

  // Mijoz qarzini kamaytirish
  await updateClientDebt(sale.client, currency, -amount);

  return sale;
}

/**
 * Vagon sotuvlarini olish (pagination bilan)
 */
async function getVagonSales(filters, page = 1, limit = 20) {
  const { client, saleType, startDate, endDate, search } = filters;

  const matchStage = {};
  if (client) matchStage.client = client;
  if (saleType) matchStage.sale_type = saleType;
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    VagonSale.find(matchStage)
      .populate('client', 'name phone')
      .populate('vagon', 'vagonCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    VagonSale.countDocuments(matchStage)
  ]);

  return {
    sales,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    }
  };
}

/**
 * Vagon sotuvini o'chirish
 */
async function deleteVagonSale(saleId) {
  const sale = await VagonSale.findById(saleId);
  if (!sale) {
    throw new Error('Sotuv topilmadi');
  }

  // Mijoz qarzini qaytarish
  await updateClientDebt(sale.client, sale.sale_currency, -sale.debt);

  // Cash yozuvlarini o'chirish
  await Cash.deleteMany({ vagonSale: saleId });

  // Sotuvni o'chirish
  await VagonSale.findByIdAndDelete(saleId);

  return { message: 'Sotuv muvaffaqiyatli o\'chirildi' };
}

module.exports = {
  createVagonSale,
  addPaymentToSale,
  getVagonSales,
  deleteVagonSale,
  updateClientDebt
};
