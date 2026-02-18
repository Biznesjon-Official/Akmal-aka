const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Birinchi admin yaratish (faqat admin yo'q bo'lsa)
router.post('/create-first-admin', [
  body('username').isLength({ min: 3 }).withMessage('Username kamida 3 ta belgi bo\'lishi kerak'),
  body('password').isLength({ min: 6 }).withMessage('Parol kamida 6 ta belgi bo\'lishi kerak')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Admin mavjudligini tekshirish
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin allaqachon mavjud' });
    }

    const { username, password } = req.body;

    // Foydalanuvchi mavjudligini tekshirish
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu username allaqachon mavjud' });
    }

    // Birinchi admin yaratish
    const user = new User({ username, password, role: 'admin' });
    await user.save();

    // JWT token yaratish (1 hafta)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Birinchi admin muvaffaqiyatli yaratildi',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Admin mavjudligini tekshirish
router.get('/check-admin', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    res.json({ adminExists: !!adminExists });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// EMERGENCY: Admin parolini reset qilish (faqat development)
router.post('/emergency-reset-admin', async (req, res) => {
  try {
    // Faqat development muhitida ishlaydi
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        message: 'Bu endpoint production muhitida ishlamaydi. SSH orqali server/scripts/reset-admin-password.js ishga tushiring.' 
      });
    }

    const { username, newPassword, secretKey } = req.body;

    // Secret key tekshirish (qo'shimcha xavfsizlik)
    if (secretKey !== process.env.EMERGENCY_SECRET) {
      return res.status(403).json({ message: 'Noto\'g\'ri secret key' });
    }

    const user = await User.findOne({ username: username || 'admin' });
    
    if (!user) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    // Parolni yangilash
    user.password = newPassword || 'admin123';
    await user.save();

    res.json({
      message: 'Parol muvaffaqiyatli yangilandi',
      username: user.username,
      newPassword: newPassword || 'admin123'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});
// Ro'yxatdan o'tish (faqat birinchi admin yaratish uchun ishlatiladi)
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username kamida 3 ta belgi bo\'lishi kerak'),
  body('password').isLength({ min: 6 }).withMessage('Parol kamida 6 ta belgi bo\'lishi kerak'),
  body('role').isIn(['admin', 'yordamchi']).withMessage('Noto\'g\'ri rol')
], async (req, res) => {
  try {
    // Bu endpoint faqat test maqsadida qoldirildi, ishlatilmaydi
    return res.status(403).json({ message: 'Bu endpoint ishlatilmaydi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kirish
router.post('/login', [
  body('username').notEmpty().withMessage('Username kiritilishi shart'),
  body('password').notEmpty().withMessage('Parol kiritilishi shart')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // HARDCODED ADMIN - har doim ishlaydi
    if (username === 'admin' && password === 'admin123') {
      // Hardcoded admin uchun token yaratish
      const token = jwt.sign(
        { userId: 'hardcoded-admin-id', role: 'admin', username: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: 'hardcoded-admin-id',
          username: 'admin',
          role: 'admin'
        }
      });
    }

    // Database'dan foydalanuvchini topish
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(400).json({ message: 'Noto\'g\'ri username yoki parol' });
    }

    // Parolni tekshirish
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Noto\'g\'ri username yoki parol' });
    }

    // JWT token yaratish (1 hafta)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Foydalanuvchi ma'lumotlarini olish
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;