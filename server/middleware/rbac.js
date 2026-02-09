/**
 * Role-Based Access Control (RBAC) Middleware
 * Foydalanuvchi rollariga asoslangan ruxsat tizimi
 */

const logger = require('../utils/logger');

// Rollar va ularning ruxsatlari
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  VIEWER: 'viewer'
};

// Har bir rol uchun ruxsatlar
const PERMISSIONS = {
  [ROLES.ADMIN]: [
    'vagon:create', 'vagon:read', 'vagon:update', 'vagon:delete', 'vagon:close',
    'sale:create', 'sale:read', 'sale:update', 'sale:delete',
    'client:create', 'client:read', 'client:update', 'client:delete',
    'cash:create', 'cash:read', 'cash:update', 'cash:delete',
    'debt:create', 'debt:read', 'debt:update', 'debt:delete',
    'expense:create', 'expense:read', 'expense:update', 'expense:delete',
    'user:create', 'user:read', 'user:update', 'user:delete',
    'settings:read', 'settings:update',
    'report:read', 'report:export'
  ],
  [ROLES.MANAGER]: [
    'vagon:create', 'vagon:read', 'vagon:update', 'vagon:close',
    'sale:create', 'sale:read', 'sale:update',
    'client:create', 'client:read', 'client:update',
    'cash:create', 'cash:read',
    'debt:read', 'debt:update',
    'expense:create', 'expense:read', 'expense:update',
    'report:read', 'report:export'
  ],
  [ROLES.ACCOUNTANT]: [
    'vagon:read',
    'sale:read',
    'client:read',
    'cash:create', 'cash:read', 'cash:update',
    'debt:read', 'debt:update',
    'expense:create', 'expense:read', 'expense:update',
    'report:read', 'report:export'
  ],
  [ROLES.VIEWER]: [
    'vagon:read',
    'sale:read',
    'client:read',
    'cash:read',
    'debt:read',
    'expense:read',
    'report:read'
  ]
};

/**
 * Foydalanuvchining roli borligini tekshirish
 */
function hasRole(user, requiredRoles) {
  if (!user || !user.role) {
    return false;
  }
  
  // Admin har doim ruxsat etiladi
  if (user.role === ROLES.ADMIN) {
    return true;
  }
  
  // Agar requiredRoles array bo'lsa
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }
  
  // Agar bitta rol bo'lsa
  return user.role === requiredRoles;
}

/**
 * Foydalanuvchining ruxsati borligini tekshirish
 */
function hasPermission(user, requiredPermission) {
  if (!user || !user.role) {
    return false;
  }
  
  // Admin har doim ruxsat etiladi
  if (user.role === ROLES.ADMIN) {
    return true;
  }
  
  const userPermissions = PERMISSIONS[user.role] || [];
  
  // Agar requiredPermission array bo'lsa (kamida bittasi kerak)
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some(perm => userPermissions.includes(perm));
  }
  
  // Agar bitta permission bo'lsa
  return userPermissions.includes(requiredPermission);
}

/**
 * Middleware: Rol tekshiruvi
 * @param {string|string[]} requiredRoles - Kerakli rol(lar)
 */
function requireRole(requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('RBAC: Foydalanuvchi autentifikatsiya qilinmagan');
      return res.status(401).json({ 
        message: 'Autentifikatsiya talab qilinadi',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (!hasRole(req.user, requiredRoles)) {
      logger.warn(`RBAC: Ruxsat rad etildi - User: ${req.user.username}, Role: ${req.user.role}, Required: ${requiredRoles}`);
      return res.status(403).json({ 
        message: 'Sizda bu amalni bajarish uchun ruxsat yo\'q',
        code: 'FORBIDDEN',
        requiredRole: requiredRoles,
        userRole: req.user.role
      });
    }
    
    logger.info(`RBAC: Ruxsat berildi - User: ${req.user.username}, Role: ${req.user.role}`);
    next();
  };
}

/**
 * Middleware: Ruxsat tekshiruvi
 * @param {string|string[]} requiredPermission - Kerakli ruxsat(lar)
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('RBAC: Foydalanuvchi autentifikatsiya qilinmagan');
      return res.status(401).json({ 
        message: 'Autentifikatsiya talab qilinadi',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (!hasPermission(req.user, requiredPermission)) {
      logger.warn(`RBAC: Ruxsat rad etildi - User: ${req.user.username}, Permission: ${requiredPermission}`);
      return res.status(403).json({ 
        message: 'Sizda bu amalni bajarish uchun ruxsat yo\'q',
        code: 'FORBIDDEN',
        requiredPermission,
        userRole: req.user.role
      });
    }
    
    logger.info(`RBAC: Ruxsat berildi - User: ${req.user.username}, Permission: ${requiredPermission}`);
    next();
  };
}

/**
 * Middleware: Faqat o'z ma'lumotlarini ko'rish
 * Admin va Manager boshqalarning ham ma'lumotlarini ko'rishi mumkin
 */
function requireOwnershipOrRole(allowedRoles = [ROLES.ADMIN, ROLES.MANAGER]) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Autentifikatsiya talab qilinadi',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Agar ruxsat etilgan rolda bo'lsa
    if (hasRole(req.user, allowedRoles)) {
      return next();
    }
    
    // Agar o'z ma'lumotlari bo'lsa
    const resourceUserId = req.params.userId || req.body.userId || req.query.userId;
    if (resourceUserId && resourceUserId === req.user.userId) {
      return next();
    }
    
    logger.warn(`RBAC: Ownership rad etildi - User: ${req.user.username}`);
    return res.status(403).json({ 
      message: 'Siz faqat o\'z ma\'lumotlaringizni ko\'rishingiz mumkin',
      code: 'FORBIDDEN'
    });
  };
}

/**
 * Helper: Foydalanuvchi admin ekanligini tekshirish
 */
function isAdmin(user) {
  return user && user.role === ROLES.ADMIN;
}

/**
 * Helper: Foydalanuvchi manager yoki admin ekanligini tekshirish
 */
function isManagerOrAdmin(user) {
  return user && (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  hasRole,
  hasPermission,
  requireRole,
  requirePermission,
  requireOwnershipOrRole,
  isAdmin,
  isManagerOrAdmin
};
