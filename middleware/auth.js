// middleware/auth.js

function requireAdmin(req, res, next) {
  if (req.session?.userId && req.session?.role === 'admin') {
    return next();
  }

  return res.redirect('/403?message=🚫 This page is for admins only.');
}

export function requireLogin(req, res, next) {
  console.log('🧪 [requireLogin] session:', req.session);

  if (req.session && req.session.isLoggedIn) {
    return next();
  } else {
    return res.status(403).render('403', {
      message: '🔐 You must be logged in to access this page.'
    });
  }
}



function requireModeratorOrAdmin(req, res, next) {
  const role = req.session?.role;
  if (req.session?.userId && (role === 'moderator' || role === 'admin')) {
    return next();
  }

  return res.redirect('/403?message=🛡️ Moderators or admins only.');
}

// DO NOT PUT ANYTHING BELOW THIS LINE
export { requireAdmin, requireModeratorOrAdmin };

