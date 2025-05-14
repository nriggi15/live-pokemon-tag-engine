// At the top of your file if using dotenv:
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const router = express.Router();

import User from '../models/User.js';
import Tag from '../models/Tags.js';
import UserProfile from '../models/UserProfile.js';
import { requireAdmin } from '../middleware/auth.js';
import axios from 'axios';
import crypto from 'crypto';
import EmailVerification from '../models/EmailVerification.js';
import { loginLimiter, registerLimiter, resendLimiter } from '../middleware/rateLimiter.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/mailer.js';
import TagSubmission from '../models/TagSubmission.js';
import NewTag from '../models/NewTag.js';
import Collection from '../models/Collection.js';


// TEMPORARY: Create only ONE admin manually via POST
router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, confirm, username, 'g-recaptcha-response': captcha } = req.body;
  if (password !== confirm) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  if (!captcha) {
    return res.status(400).json({ error: 'Captcha is required' });
  }

  try {
    // 🚨 CAPTCHA Verification
    const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`;
    const captchaRes = await axios.post(captchaVerifyUrl);

    if (!captchaRes.data.success) {
      return res.status(403).json({ error: 'Captcha verification failed' });
    }

    // ✅ Continue with registration
    const rawUsername = username || '';
    const rawEmail = email || '';
    const rawPassword = password || '';
    const role = req.body.role || 'user';

    const cleanedUsername = rawUsername.trim();
    const cleanedEmail = rawEmail.trim().toLowerCase();
    const cleanedPassword = rawPassword.trim();

    if (!cleanedUsername || !cleanedEmail || !cleanedPassword) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const existingEmail = await User.findOne({ email: cleanedEmail });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email is already in use.' });
    }

    const existingUsername = await User.findOne({ username: cleanedUsername });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    if (role === 'admin') {
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        return res.status(403).json({ message: 'Admin already exists' });
      }
    }

    const user = new User({ username: cleanedUsername, email: cleanedEmail, role });
    await user.setPassword(cleanedPassword);
    await user.save();

    // 🧪 Create email verification token
    const token = crypto.randomBytes(32).toString('hex');

    await EmailVerification.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours from now
    });

    // ✅ Save the token for Step 3 (send it by email)
    const verificationLink = `http://localhost:3000/verify?token=${token}`; // or your real domain
    console.log(`📩 Send this link via email: ${verificationLink}`);

    await sendVerificationEmail(user.email, token);
    console.log(`✅ Verification email sent to ${user.email}`);

        const existingProfile = await UserProfile.findOne({ userId: user._id });
    if (!existingProfile) {
      await UserProfile.create({
        userId: user._id,
        username: user.username
      });
      console.log(`✅ Created profile for ${user.username}`);
    }

    const existingFavorites = await Collection.findOne({ userId: user._id, name: 'Favorites' });
    if (!existingFavorites) {
      await Collection.create({
        userId: user._id,
        name: 'Favorites',
        visibility: 'public',
        cards: []
      });
      console.log(`✅ Created 'Favorites' collection for ${user.username}`);
    }


    res.status(200).json({
  message: 'Registered successfully. Please check your email to verify your account.'
});


  } catch (err) {
    console.error('❌ Error in /register:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(409).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use.` });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});



// POST /api/login - Log in any user (admin/mod/user)
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    console.log('Login attempt:', email);
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    const isValid = user && await user.validatePassword(password);

    console.log('User found?', !!user);
    console.log('Password valid?', isValid);

    if (!user.verified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }


    if (!user || !isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.banned) {
      return res.status(403).json({ message: 'Your account has been banned.' });
    }

    // ✅ NEW: Add logs before and after setting session
    console.log('✅ Setting session values...');
    req.session.userId = user._id;
    req.session.role = user.role;

    try {
      const existingProfile = await UserProfile.findOne({ userId: user._id });
    
      if (!existingProfile) {
        await UserProfile.create({
          userId: user._id,
          username: user.username
        });
        console.log(`✅ Created profile for ${user.username}`);
      }
    } catch (err) {
      console.error('❌ Failed to auto-create profile on login:', err);
    }

      try {
        const existingFavorites = await Collection.findOne({ userId: user._id, name: 'Favorites' });
        if (!existingFavorites) {
          await Collection.create({
            userId: user._id,
            name: 'Favorites',
            visibility: 'public',
            cards: []
          });
          console.log(`✅ Created 'Favorites' collection for ${user.username}`);
        }
      } catch (err) {
        console.error('❌ Failed to create Favorites collection:', err);
      }

    
    req.session.save(err => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ message: 'Could not save session' });
      }

      console.log('✅ Session saved. Session now:', req.session); // 💥 The key line
      res.status(200).json({ message: 'Login successful', role: user.role });
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});


// Account Logout

router.get('/logout', (req, res) => {
  console.log('👉  Hitting /api/logout  – current session:', req.session);

  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Error logging out.');
    }

    // be explicit: clear the exact cookie your session middleware uses
    res.clearCookie('connect.sid', { path: '/' });
    console.log('👉  Hitting /api/logout  – current session:', req.session);

    return res.redirect('/login');
  });
});

router.get('/whoami', async (req, res) => {
  const userId = req.session?.userId;
  const role = req.session?.role;

  //console.log('📡 /whoami called — userId:', userId, 'role:', role);

  if (!userId) {
    return res.json({ userId: null, role: null, username: null });
  }

  try {
    const user = await User.findById(userId).lean();
    const username = user?.username || null;

    //console.log('🧠 /whoami user result:', user);
    res.json({ userId, role, username });
  } catch (err) {
    //console.error('❌ Failed to fetch user for /whoami:', err);
    res.status(500).json({ message: 'Failed to fetch user info' });
  }
});







router.get('/reset-password', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('Missing reset token');
  res.render('reset-password', { token });
});


router.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});
 

//Admin Panel Improvements
router.get('/admin/stats/users', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ totalUsers });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/stats/tags', requireAdmin, async (req, res) => {
  try {
    const tagDocs = await NewTag.find({});
    const uniqueTags = new Set(tagDocs.map(doc => doc.tag));
    const uniqueCards = new Set(tagDocs.map(doc => doc.cardId));

    res.json({
      totalUniqueTags: uniqueTags.size,
      totalCardsWithTags: uniqueCards.size
    });
  } catch (err) {
    console.error('Error fetching tag stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/stats/most-used-tags', requireAdmin, async (req, res) => {
  console.log('📊 Hitting /admin/stats/most-used-tags');

  try {
    const aggregation = await NewTag.aggregate([
      { $group: { _id: '$tag', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 99 }
    ]);


    console.log('✅ Aggregated Tags:', aggregation);

    res.json(aggregation.map(tag => ({
      name: tag._id,
      count: tag.count
    })));
  } catch (err) {
    console.error('Error fetching most used tags:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    // const users = await User.find({}, 'username email role banned createdAt').sort({ createdAt: -1 });
    const users = await User.find({}, 'username email role banned verified createdAt');

    res.json(users);
  } catch (err) {
    console.error('❌ Error fetching user list:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.banned = !user.banned;
    await user.save();

    res.json({ success: true, banned: user.banned });
  } catch (err) {
    console.error('❌ Error toggling ban:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const roleCycle = {
  guest: 'user',
  user: 'moderator',
  moderator: 'user' // can loop back down
};

  router.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      // 🔐 Do NOT allow changing owner/admin accounts
      if (user.role === 'owner' || user.role === 'admin') {
        return res.status(403).json({ message: 'Cannot modify this role' });
      }
  
      const next = roleCycle[user.role];
      if (!next) return res.status(400).json({ message: 'Invalid role transition' });
  
      user.role = next;
      await user.save();
  
      res.json({ success: true, newRole: user.role });
    } catch (err) {
      console.error('❌ Error changing role:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  const roleLevels = ['guest', 'user', 'moderator'];

  router.post('/admin/users/:id/promote', requireAdmin, async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user || user.role === 'admin' || user.role === 'owner') {
        return res.status(403).json({ message: 'Cannot promote this role' });
      }
  
      const index = roleLevels.indexOf(user.role);
      if (index < roleLevels.length - 1) {
        user.role = roleLevels[index + 1];
        await user.save();
      }
  
      res.json({ success: true, newRole: user.role });
    } catch (err) {
      console.error('❌ Error promoting user:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/admin/users/:id/demote', requireAdmin, async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user || user.role === 'admin' || user.role === 'owner') {
        return res.status(403).json({ message: 'Cannot demote this role' });
      }
  
      const index = roleLevels.indexOf(user.role);
      if (index > 0) {
        user.role = roleLevels[index - 1];
        await user.save();
      }
  
      res.json({ success: true, newRole: user.role });
    } catch (err) {
      console.error('❌ Error demoting user:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });


router.post('/resend-verification', resendLimiter, async (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    // ❌ Remove old tokens
    await EmailVerification.deleteMany({ userId: user._id });

    // 🧪 Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    await EmailVerification.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
    });

    await sendPasswordResetEmail(user.email, resetLink); // ✅ Correct

    console.log(`📩 Resent verification to ${user.email}`);

    res.status(200).json({ message: 'Verification email resent' });

  } catch (err) {
    console.error('❌ Error resending verification:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admin/activity-summary', requireAdmin, async (req, res) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24); // last 24h

  try {
    const [newUsers, verifiedUsers, tagSubmissions, approvedTags, deniedTags] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: since } }),
      User.countDocuments({ verified: true, verifiedAt: { $gte: since } }),
      TagSubmission.countDocuments({ createdAt: { $gte: since } }),
      NewTag.countDocuments({ reviewedAt: { $gte: since }, status: 'approved' }),
      TagSubmission.countDocuments({ reviewedAt: { $gte: since }, status: 'denied' })
    ]);

    res.json({
      newUsers,
      verifiedUsers,
      tagSubmissions,
      approvedTags,
      deniedTags
    });

  } catch (err) {
    console.error('❌ Error fetching activity summary:', err);
    res.status(500).json({ message: 'Failed to fetch activity data' });
  }
});

router.get('/admin/activity-details', requireAdmin, async (req, res) => {
  const { type } = req.query;
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24); // 24h

  try {
    switch (type) {
      case 'new-users': {
        const users = await User.find({ createdAt: { $gte: since } }, 'username createdAt');
        return res.json(users.map(u => `${u.username} – registered at ${u.createdAt.toLocaleString()}`));
      }

      case 'verified-users': {
        const users = await User.find({ verified: true, verifiedAt: { $gte: since } }, 'username verifiedAt');
        return res.json(users.map(u => `${u.username} – verified at ${u.verifiedAt.toLocaleString()}`));
      }

      case 'tag-submissions': {
        const tags = await TagSubmission.find({ createdAt: { $gte: since } }, 'tag cardId createdAt');
        return res.json(tags.map(t => `Tag "${t.tag}" submitted on card ${t.cardId} at ${t.createdAt.toLocaleString()}`));
      }

      case 'tag-approvals': {
        const tags = await NewTag.find({ reviewedAt: { $gte: since }, status: 'approved' }, 'tag cardId reviewedAt');
        return res.json(tags.map(t => `Tag "${t.tag}" approved for ${t.cardId} at ${t.reviewedAt.toLocaleString()}`));
      }

      case 'tag-denials': {
        const tags = await TagSubmission.find({ reviewedAt: { $gte: since }, status: 'denied' }, 'tag cardId reviewedAt');
        return res.json(tags.map(t => `Tag "${t.tag}" denied on card ${t.cardId} at ${t.reviewedAt.toLocaleString()}`));
      }

      default:
        return res.status(400).json({ message: 'Invalid type' });
    }
  } catch (err) {
    console.error('❌ Error fetching activity details:', err);
    res.status(500).json({ message: 'Failed to fetch activity detail list' });
  }
});


router.get('/admin/all-tags', requireAdmin, async (req, res) => {
  try {
  const tags = await NewTag.find({})
    .populate('submittedBy', 'username')
    .populate('reviewedBy', 'username')
    .sort({ createdAt: -1 });


    res.json(tags);
  } catch (err) {
    console.error('❌ Failed to fetch all tags:', err);
    res.status(500).json({ message: 'Error fetching tag data' });
  }
});

router.get('/admin/tag/:id', requireAdmin, async (req, res) => {
  try {
    const tag = await NewTag.findById(req.params.id)
      .populate('submittedBy', 'username')
      .populate('reviewedBy', 'username');

    if (!tag) return res.status(404).json({ message: 'Tag not found' });

    res.json(tag);
  } catch (err) {
    console.error('❌ Failed to fetch tag:', err);
    res.status(500).json({ message: 'Error fetching tag' });
  }
});

router.patch('/admin/tag/:id', requireAdmin, async (req, res) => {
  try {
    const { tag, status } = req.body;

    const updated = await NewTag.findByIdAndUpdate(
      req.params.id,
      {
        tag,
        status,
        reviewedBy: req.session.userId,
        reviewedAt: new Date()
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Tag not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to update tag:', err);
    res.status(500).json({ message: 'Error updating tag' });
  }
});

router.delete('/admin/tag/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await NewTag.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Tag not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to delete tag:', err);
    res.status(500).json({ message: 'Error deleting tag' });
  }
});


router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email.' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    await PasswordReset.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60) // 1 hour
    });

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    console.log(`📩 Reset link: ${resetLink}`);

    await sendPasswordResetEmail(user.email, resetLink); // ✅ correct


    res.status(200).json({ message: 'Reset link sent to your email.' });
  } catch (err) {
    console.error('❌ Error in /forgot-password:', err);
    res.status(500).json({ message: 'Server error sending reset email.' });
  }
});

router.post('/api/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Missing token or password.' });
  }

  try {
    const reset = await PasswordReset.findOne({ token });

    if (!reset) {
      return res.status(404).json({ message: 'Invalid or expired token.' });
    }

    if (reset.expiresAt < new Date()) {
      return res.status(410).json({ message: 'Reset link has expired.' });
    }

    const user = await User.findById(reset.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.setPassword(password);
    await user.save();

    await PasswordReset.deleteOne({ _id: reset._id });

    res.status(200).json({ message: '✅ Password updated successfully!' });
  } catch (err) {
    console.error('❌ Error in /api/reset-password:', err);
    res.status(500).json({ message: 'Server error while resetting password.' });
  }
});


// DO NOT PLACE ANYTHING BELOW THIS LINE
export default router;
