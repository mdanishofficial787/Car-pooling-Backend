/*
========================================
 Admin Middleware
========================================

Checks if user has admin role.
*/

const { forbidden } = require('../utils/responseHelper');

/*
========================================
 Require Admin Role
========================================
*/
const requireAdmin = (req, res, next) => {
  const user = req.user;

  if (!user || user.role !== 'admin') {
    return forbidden(res, 'Admin access required');
  }

  next();
};

module.exports = {
  requireAdmin
};
