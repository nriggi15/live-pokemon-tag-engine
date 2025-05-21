export default function sessionVars(req, res, next) {
  res.locals.isLoggedIn = !!req.session.userId;
  res.locals.role = req.session.role || 'guest';
  res.locals.username = req.session.username || '';
  res.locals.email = req.session.email || '';
  res.locals.isDarkMode = req.session.darkMode || false;
  next();
}
