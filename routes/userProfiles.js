import express from 'express';
import path from 'path';
const router = express.Router();
import NewTag from '../models/NewTag.js';
import requireVerified from '../middleware/requireVerified.js';
import UserProfile from '../models/UserProfile.js';

router.get('/user/:username', (req, res) => {
  res.render('user-profile', {
    username: req.params.username,
    page: 'profile' // ✅ Add this
  });
});


router.get('/api/user-profile/:param', async (req, res) => {
  const { param } = req.params;

  try {
    // If param looks like a Mongo ObjectId, use userId; else use username
    const query = /^[0-9a-fA-F]{24}$/.test(param)
      ? { userId: param }
      : { username: param };

    const profile = await UserProfile.findOne(query).lean();
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    res.json(profile);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

router.patch('/api/user-profile/:id', requireVerified, async (req, res) => {

    const sessionUserId = req.session?.userId;
    const paramId = req.params.id;
  
    if (!sessionUserId) {
      return res.status(401).json({ error: 'You must be logged in to edit your profile.' });
    }
  
    if (sessionUserId !== paramId) {
      return res.status(403).json({ error: 'You are not authorized to edit this profile.' });
    }
  
    const { bio, avatarUrl } = req.body;

  
    try {
      console.log('🛠 PATCH incoming bio/avatar:', { bio, avatarUrl });

      const updated = await UserProfile.findOneAndUpdate(
        { userId: sessionUserId },
        { bio, avatarUrl },
        { new: true }
      );
  
      if (!updated) {
        return res.status(404).json({ error: 'Profile not found.' });
      }
  
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating bio:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

// GET /api/user-profile/:param/recent-tags
router.get('/api/user-profile/:param/recent-tags', async (req, res) => {
  const { param } = req.params;

  try {
    const query = /^[0-9a-fA-F]{24}$/.test(param)
      ? { submittedBy: param }
      : { }; // fallback only for usernames if needed

    if (!query.submittedBy) {
      const user = await User.findOne({ username: param });
      if (!user) return res.status(404).json({ message: 'User not found' });
      query.submittedBy = user._id;
    }

    const tags = await NewTag.find({ ...query, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json(tags);
  } catch (err) {
    console.error('Error fetching recent tags:', err);
    res.status(500).json({ message: 'Error loading recent tags' });
  }
});

export default router;