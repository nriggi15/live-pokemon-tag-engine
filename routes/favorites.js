import express from 'express';
const router = express.Router();


import FavoriteSearch from '../models/FavoriteSearch.js';
import { requireLogin } from '../middleware/auth.js';
import User from '../models/User.js';

router.get('/favorites', requireLogin, async (req, res) => {
  try {
    const favorites = await FavoriteSearch.find({ userId: req.session.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(favorites);
  } catch (err) {
    console.error('❌ Failed to fetch favorites:', err);
    res.status(500).json({ message: 'Error loading favorites' });
  }
});

router.post('/favorites', requireLogin, async (req, res) => {
  const { term, type } = req.body;

  if (!term || !['tag', 'text'].includes(type)) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const favorite = await FavoriteSearch.findOneAndUpdate(
      { userId: req.session.userId, term, type },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json(favorite);
  } catch (err) {
    console.error('❌ Failed to add favorite:', err);
    res.status(500).json({ message: 'Error adding favorite' });
  }
});

router.delete('/favorites', requireLogin, async (req, res) => {
  const { term, type } = req.body;

  try {
    await FavoriteSearch.deleteOne({ userId: req.session.userId, term, type });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to delete favorite:', err);
    res.status(500).json({ message: 'Error deleting favorite' });
  }
});

//GET Users favorite searches
router.get('/favorites/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const favorites = await FavoriteSearch.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json(favorites);
  } catch (err) {
    console.error('❌ Failed to fetch user favorites:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



export default router;

