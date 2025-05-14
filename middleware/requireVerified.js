import User from '../models/User.js';

export default function requireVerified(req, res, next) {
  if (!req.session || !req.session.userId || !req.session.role) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  User.findById(req.session.userId).then(user => {
    if (!user || !user.verified) {
      return res.status(403).json({ message: 'You must verify your email to use this feature.' });
    }
    next();
  }).catch(err => {
    console.error('Verification middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  });
}