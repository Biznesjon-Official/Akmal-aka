// Client uchun business logic
const Client = require('../models/Client');
const Cash = require('../models/Cash');

/**
 * Mijozlarni olish (pagination bilan)
 */
async function getClients(filters, page = 1, limit = 20) {
  const { search, hasDebt } = filters;

  const matchStage = {};
  
  if (search) {
    matchStage.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  if (hasDebt === 'true') {
    matchStage.$or = [
      { usd_current_debt: { $gt: 0 } },
      { rub_current_debt: { $gt: 0 } },
      { delivery_current_debt: { $gt: 0 } }
    ];
  } else if (hasDebt === 'false') {
    matchStage.usd_current_debt = { $lte: 0 };
    matchStage.rub_current_debt = { $lte: 0 };
    matchStage.delivery_current_debt = { $lte: 0 };
  }

  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    Client.find(matchStage)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Client.countDocuments(matchStage)
  ]);

  return {
    clients,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}

/**
 * Mijoz yaratish
 */
async function createClient(clientData) {
  const { name, phone, address, notes } = clientData;

  // Telefon raqami mavjudligini tekshirish
  const existingClient = await Client.findOne({ phone });
  if (existingClient) {
    throw new Error('Bu telefon raqami bilan mijoz allaqachon mavjud');
  }

  const client = new Client({
    name,
    phone,
    address,
    notes,
    usd_total_received_volume: 0,
    usd_total_debt: 0,
    usd_total_paid: 0,
    usd_current_debt: 0,
    rub_total_received_volume: 0,
    rub_total_debt: 0,
    rub_total_paid: 0,
    rub_current_debt: 0,
    delivery_total_debt: 0,
    delivery_total_paid: 0,
    delivery_current_debt: 0
  });

  await client.save();
  return client;
}

/**
 * Mijozni yangilash
 */
async function updateClient(clientId, updateData) {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Mijoz topilmadi');
  }

  Object.assign(client, updateData);
  await client.save();
  return client;
}

/**
 * Mijozni o'chirish
 */
async function deleteClient(clientId) {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Mijoz topilmadi');
  }

  // Qarz borligini tekshirish
  if (
    client.usd_current_debt > 0 ||
    client.rub_current_debt > 0 ||
    client.delivery_current_debt > 0
  ) {
    throw new Error('Qarzi bor mijozni o\'chirish mumkin emas');
  }

  await Client.findByIdAndDelete(clientId);
  return { message: 'Mijoz muvaffaqiyatli o\'chirildi' };
}

/**
 * Mijoz qarzini boshqarish
 */
async function manageClientDebt(clientId, debtData, userId) {
  const { amount, currency, description, type } = debtData;

  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Mijoz topilmadi');
  }

  // Qarzni yangilash
  if (currency === 'USD') {
    if (type === 'add') {
      // Qarz qo'shish
      client.usd_total_debt = (client.usd_total_debt || 0) + amount;
    } else {
      // To'lov qilish
      client.usd_total_paid = (client.usd_total_paid || 0) + amount;
    }
    // Current debt ni to'g'ri hisoblash: total_debt - total_paid
    client.usd_current_debt = Math.max(0, (client.usd_total_debt || 0) - (client.usd_total_paid || 0));
  } else if (currency === 'RUB') {
    if (type === 'add') {
      // Qarz qo'shish
      client.rub_total_debt = (client.rub_total_debt || 0) + amount;
    } else {
      // To'lov qilish
      client.rub_total_paid = (client.rub_total_paid || 0) + amount;
    }
    // Current debt ni to'g'ri hisoblash: total_debt - total_paid
    client.rub_current_debt = Math.max(0, (client.rub_total_debt || 0) - (client.rub_total_paid || 0));
  }

  await client.save();

  // Cash yozuvini yaratish
  if (type === 'subtract') {
    const cashEntry = new Cash({
      type: 'debt_payment',
      amount,
      currency,
      description: description || `Qarz to'lovi - ${client.name}`,
      client: clientId,
      createdBy: userId
    });
    await cashEntry.save();
  }

  return client;
}

/**
 * Mijoz statistikasini olish
 */
async function getClientStats(clientId) {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Mijoz topilmadi');
  }

  // To'lovlar tarixini olish
  const payments = await Cash.find({
    client: clientId,
    type: { $in: ['client_payment', 'debt_payment', 'delivery_payment'] }
  })
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    client,
    payments,
    stats: {
      totalDebt: {
        USD: client.usd_current_debt || 0,
        RUB: client.rub_current_debt || 0,
        delivery: client.delivery_current_debt || 0
      },
      totalPaid: {
        USD: client.usd_total_paid || 0,
        RUB: client.rub_total_paid || 0
      },
      totalReceived: {
        USD: client.usd_total_received_volume || 0,
        RUB: client.rub_total_received_volume || 0
      }
    }
  };
}

module.exports = {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  manageClientDebt,
  getClientStats
};
