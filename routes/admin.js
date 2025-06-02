import express from 'express';
const router = express.Router();
import Card from '../models/Cards.js';
import { requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';
import NewTag from '../models/NewTag.js'; // Or NewTag if this was intended to be NewTag.js


// 👤 Total registered users
router.get('/admin/stats/users', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    res.json({ totalUsers });
  } catch (err) {
    console.error('Error counting users:', err);
    res.status(500).json({ error: 'Failed to count users' });
  }
});

// 🏷️ Total unique tags and cards tagged
router.get('/admin/stats/tags', requireAdmin, async (req, res) => {
  try {
    const tags = await NewTag.find({});
    const totalUniqueTags = new Set(tags.map(t => t.tag)).size;
    const totalCardsWithTags = new Set(tags.map(t => t.cardId)).size;

    res.json({ totalUniqueTags, totalCardsWithTags });
  } catch (err) {
    console.error('Error counting tags:', err);
    res.status(500).json({ error: 'Failed to count tags' });
  }
});

// 🔝 Most used tags
router.get('/admin/stats/most-used-tags', requireAdmin, async (req, res) => {
  try {
    const result = await NewTag.aggregate([
      { $group: { _id: "$tag", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const formatted = result.map(tag => ({
      name: tag._id,
      count: tag.count
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in most-used-tags:', err);
    res.status(500).json({ error: 'Failed to fetch tag stats' });
  }
});

// 👥 User management: promote
router.post('/admin/users/:id/promote', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { role: 'moderator' });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// 👥 User management: demote
router.post('/admin/users/:id/demote', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { role: 'user' });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to demote user' });
  }
});

// 👥 User management: ban toggle
router.post('/admin/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.banned = !user.banned;
    await user.save();

    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle ban' });
  }
});

// 👥 User management: fetch all users
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'username email role banned verified createdAt');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// 📊 Cards still missing required fields
router.get('/admin/stats/cards-missing-fields', requireAdmin, async (req, res) => {
  try {
    const count = await Card.countDocuments({
      supertype: 'Pokémon',
      $or: [
        { 'attacks': { $exists: true, $ne: [] } },
        { 'attacks.damage': { $exists: false } },
        { 'attacks.cost': { $exists: false } },
        { 'types.0': { $exists: false } }
      ]
    });
    res.json({ remaining: count });
  } catch (err) {
    console.error('Error counting broken cards:', err);
    res.status(500).json({ error: 'Failed to count broken cards' });
  }
});

// ✅ Live Integrity Check (admin panel)
router.get('/admin/card-integrity', requireAdmin, async (req, res) => {
  try {
    const cards = await Card.find({ supertype: 'Pokémon' });
    let badCount = 0;

    for (const card of cards) {
      if (
        !card.types?.length ||
        (card.attacks?.length && card.attacks.some(a => !a.damage || !a.cost?.length))
      ) {
        badCount++;
      }
    }

    res.json({ ok: true, totalChecked: cards.length, issues: badCount });
  } catch (err) {
    console.error('Integrity check failed:', err);
    res.status(500).json({ ok: false });
  }
});

// 🔍 Monitor for how many Pokémon cards are missing required fields
router.get('/api/admin/stats/cards-missing-fields', requireAdmin, async (req, res) => {
  try {
    const brokenCount = await Card.countDocuments({
      'attacks': { $exists: true, $ne: [] },
      $or: [
        { 'attacks.cost': { $exists: false } },
        { 'attacks.cost': { $size: 0 } },
        { 'attacks.damage': { $exists: false } },
        { 'types.0': { $exists: false } }
      ]
    });

    res.json({ remaining: brokenCount, timestamp: new Date() });
  } catch (err) {
    console.error('❌ Failed to fetch card fix stats:', err);
    res.status(500).json({ error: 'Failed to fetch fix stats' });
  }
});



export default router;
