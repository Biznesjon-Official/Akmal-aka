/**
 * Hardcoded admin uchun createdBy ni to'g'ri handle qilish
 * @param {Object} user - req.user object
 * @returns {String|null} - Valid ObjectId yoki null
 */
function getCreatedById(user) {
  if (!user) return null;
  
  // Hardcoded admin uchun null qaytarish
  if (user.userId === 'hardcoded-admin-id') {
    return null;
  }
  
  // Oddiy user uchun userId yoki _id qaytarish
  return user.userId || user._id || null;
}

module.exports = {
  getCreatedById
};
