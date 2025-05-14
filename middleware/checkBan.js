import User from '../models/User.js';

export default async function(req, res, next) {
  if (!req.session.userId) return next(); // not logged in, skip ban check

  try {
    const user = await User.findById(req.session.userId);
    if (user?.banned) {
      req.session.destroy(() => {
        return res.status(403).render('banned'); // banned.ejs view (we'll create this next)
      });
    } else {
      next();
    }
  } catch (err) {
    console.error('Error in ban check middleware:', err);
    next(err);
  }
};
