/**
 * Hardcoded admin uchun createdBy ni to'g'ri handle qilish
 * @param {Object} user - req.user object
 * @returns {String|null} - Valid ObjectId yoki null
 */
function getCreatedById(user) {
  if (!user) return null;
  return user.userId || user._id || null;
}

module.exports = {
  getCreatedById
};
