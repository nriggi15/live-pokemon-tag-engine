import express from 'express';
const router = express.Router();

import { requireLogin } from '../middleware/auth.js';
import Activity from '../models/Activity.js';
import Card from '../models/Cards.js'; // ✅ don't forget this import

// 🌐 GET /pulse – PokéPulse main feed
router.get('/', requireLogin, async (req, res) => {
  console.log('🧠 /pulse route session:', req.session);
  try {
    const activity = await Activity.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'username')
      .lean();

    // 🔍 Pull unique cardIds from activity
    const cardIds = activity.map(a => a.cardId).filter(Boolean);
    const cards = await Card.find({ cardId: { $in: cardIds } }).lean();

    // 🧠 Build cardId → cardName map
    const cardMap = {};
    for (const card of cards) {
      cardMap[card.cardId] = card.name;
    }

    // 🧩 Inject cardName into each activity item
    for (const a of activity) {
      a.cardName = cardMap[a.cardId] || a.cardId;
    }

    res.render('pulse', {
      layout: 'layouts/main',
      page: 'pulse',
      title: 'PokéPulse',
      activity,
      isLoggedIn: !!req.session.userId,
      role: req.session.role || 'guest',
      currentUser: req.session.userId || null,
      username: req.session.username || '',
    });
  } catch (err) {
    console.error('Error loading PokéPulse:', err);
    res.status(500).send('Failed to load activity feed.');
  }
});

export default router;
