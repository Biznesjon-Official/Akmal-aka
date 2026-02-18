const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Token yo\'q, ruxsat berilmadi' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // Agar userId mavjud bo'lsa, _id sifatida ham qo'shamiz (backward compatibility)
    if (decoded.userId && !decoded._id) {
      req.user._id = decoded.userId;
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token noto\'g\'ri' });
  }
};

// Faqat admin uchun
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Faqat admin ruxsati' });
  }
  next();
};

module.exports = auth;
module.exports.adminOnly = adminOnly;