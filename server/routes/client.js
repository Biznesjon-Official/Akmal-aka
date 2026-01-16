const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const auth = require('../middleware/auth');

// Barcha mijozlar ro'yxati
router.get('/', auth, async (req, res) => {
  try {
    const clients = await Client.find({ isDeleted: false })
      .sort({ createdAt: -1 });
    
    res.json(clients);
  } catch (error) {
    console.error('Client list error:', error);
    res.status(500).json({ message: 'Mijozlar ro\'yxatini olishda xatolik' });
  }
});

// Bitta mijoz ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Client get error:', error);
    res.status(500).json({ message: 'Mijoz ma\'lumotlarini olishda xatolik' });
  }
});

// Yangi mijoz yaratish
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    
    // Validatsiya
    if (!name || !phone) {
      return res.status(400).json({ 
        message: 'Mijoz nomi va telefon raqami kiritilishi shart' 
      });
    }
    
    // Telefon raqami mavjudligini tekshirish
    const existingClient = await Client.findOne({ 
      phone, 
      isDeleted: false 
    });
    
    if (existingClient) {
      return res.status(400).json({ 
        message: 'Bu telefon raqami bilan mijoz allaqachon mavjud' 
      });
    }
    
    // Yangi mijoz yaratish
    const client = new Client({
      name,
      phone,
      address,
      notes
    });
    
    await client.save();
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Client create error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Mijozni yangilash
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Telefon raqami o'zgargan bo'lsa, mavjudligini tekshirish
    if (phone && phone !== client.phone) {
      const existingClient = await Client.findOne({ 
        phone, 
        isDeleted: false,
        _id: { $ne: req.params.id }
      });
      
      if (existingClient) {
        return res.status(400).json({ 
          message: 'Bu telefon raqami bilan boshqa mijoz mavjud' 
        });
      }
    }
    
    // Yangilash
    if (name) client.name = name;
    if (phone) client.phone = phone;
    if (address !== undefined) client.address = address;
    if (notes !== undefined) client.notes = notes;
    
    await client.save();
    
    res.json(client);
  } catch (error) {
    console.error('Client update error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Mijozni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Qarz borligini tekshirish
    if (client.current_debt > 0) {
      return res.status(400).json({ 
        message: `Mijozning ${client.current_debt.toLocaleString()} so'm qarzi bor. Avval qarzni to'lang` 
      });
    }
    
    client.isDeleted = true;
    await client.save();
    
    res.json({ message: 'Mijoz o\'chirildi' });
  } catch (error) {
    console.error('Client delete error:', error);
    res.status(500).json({ message: 'Mijozni o\'chirishda xatolik' });
  }
});

// Mijoz statistikasi
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    const stats = {
      total_received_volume: client.total_received_volume,
      total_debt: client.total_debt,
      total_paid: client.total_paid,
      current_debt: client.current_debt,
      payment_percentage: client.total_debt > 0 
        ? ((client.total_paid / client.total_debt) * 100).toFixed(2)
        : 100
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Client stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

module.exports = router;
