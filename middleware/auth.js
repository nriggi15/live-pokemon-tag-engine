// middleware/auth.js
function requireAdmin(req, res, next) {
  //console.log('🔐 requireAdmin → userId:', req.session?.userId, 'role:', req.session?.role);

  if (req.session && req.session.userId && req.session.role === 'admin') {
    return next();
  }
  return res.status(403).send('Access denied. Admins only.');
}

function requireLogin(req, res, next) {
  //console.log('🔐 requireLogin → userId:', req.session?.userId);

  if (req.session && req.session.userId) {
    return next();
  }

  return res.status(403).send('Access denied. Login required.');
}

function requireModeratorOrAdmin(req, res, next) {
  const role = req.session?.role;
  if (req.session?.userId && (role === 'moderator' || role === 'admin')) {
    return next();
  }
  return res.status(403).send('Access denied. Moderators only.');
}


//
// //
// //
// // DO NOT PUT ANYTHING BELOW THIS LINE

export { requireAdmin, requireModeratorOrAdmin, requireLogin };

