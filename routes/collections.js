import express from 'express';
const router = express.Router();
import Collection from '../models/Collection.js';
import User from '../models/User.js';
import { requireLogin } from '../middleware/auth.js';

// 🚧 Create new collection
router.post('/collections', requireLogin, async (req, res) => {
  const { name } = req.body;
  const userId = req.session.userId;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Collection name is required.' });
  }

  try {
    const existing = await Collection.findOne({ userId, name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: 'You already have a collection with that name.' });
    }

    const newCollection = await Collection.create({
      userId,
      name: name.trim(),
      visibility: 'public',
      cards: []
    });

    res.status(201).json(newCollection);
  } catch (err) {
    console.error('❌ Error creating collection:', err);
    res.status(500).json({ message: 'Server error while creating collection.' });
  }
});

// ✅ Get all collections for current user
router.get('/collections/me', requireLogin, async (req, res) => {
  try {
    const collections = await Collection.find({ userId: req.session.userId });
    res.json(collections);
  } catch (err) {
    console.error('❌ Error fetching user collections:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get a public collection by ID
router.get('/collections/:id', async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection || collection.visibility === 'private') {
      return res.status(404).json({ message: 'Collection not found.' });
    }
    res.json(collection);
  } catch (err) {
    console.error('❌ Error loading collection:', err);
    res.status(500).json({ message: 'Error fetching collection' });
  }
});

// ✅ Edit collection name or visibility
router.patch('/collections/:id', requireLogin, async (req, res) => {
  const { name, visibility } = req.body;
  const collection = await Collection.findById(req.params.id);

  if (!collection || !collection.userId.equals(req.session.userId)) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (name) collection.name = name.trim();
  if (visibility) collection.visibility = visibility;
  collection.updatedAt = new Date();

  try {
    await collection.save();
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to update collection:', err);
    res.status(500).json({ message: 'Failed to update collection' });
  }
});

// ✅ Delete a collection (confirm on frontend)
router.delete('/collections/:id', requireLogin, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection || !collection.userId.equals(req.session.userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await collection.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to delete collection:', err);
    res.status(500).json({ message: 'Error deleting collection' });
  }
});

// ✅ Add card to collection
router.post('/collections/:id/add', requireLogin, async (req, res) => {
  const { cardId } = req.body;
  if (!cardId) return res.status(400).json({ message: 'Missing cardId' });

  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection || !collection.userId.equals(req.session.userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (collection.cards.includes(cardId)) {
      return res.status(409).json({ message: 'Card already in collection' });
    }

    collection.cards.push(cardId);
    collection.updatedAt = new Date();
    await collection.save();

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to add card:', err);
    res.status(500).json({ message: 'Error adding card' });
  }
});

// ✅ Remove card from collection
router.delete('/collections/:id/remove/:cardId', requireLogin, async (req, res) => {
  const { id, cardId } = req.params;

  try {
    const collection = await Collection.findById(id);
    if (!collection || !collection.userId.equals(req.session.userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    collection.cards = collection.cards.filter(id => id !== cardId);
    collection.updatedAt = new Date();
    await collection.save();

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to remove card:', err);
    res.status(500).json({ message: 'Error removing card' });
  }
});

router.get('/user-profile/:userId/collections/public', async (req, res) => {
  try {
    const collections = await Collection.find({
      userId: req.params.userId,
      visibility: 'public'
    });

    res.json(collections);
  } catch (err) {
    console.error('❌ Failed to load public collections for profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/collections/:id/reorder', requireLogin, async (req, res) => {
  const { newOrder } = req.body;

  if (!Array.isArray(newOrder)) {
    return res.status(400).json({ message: 'Invalid order format' });
  }

  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection || !collection.userId.equals(req.session.userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Only keep valid IDs already in collection
    const validIds = collection.cards.filter(id => newOrder.includes(id));
    const cleanedOrder = newOrder.filter(id => validIds.includes(id));

    collection.cards = cleanedOrder;
    collection.updatedAt = new Date();
    await collection.save();

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to reorder collection:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/explore/featured', async (req, res) => {
  try {
    const random = await Collection.aggregate([
      { $match: { visibility: 'public', cards: { $not: { $size: 0 } } } },
      { $sample: { size: 5 } }
    ]);

    res.json(random);
  } catch (err) {
    console.error('❌ Failed to load featured collections:', err);
    res.status(500).json({ message: 'Error loading featured collections' });
  }
});

//GET Random public collection of the day, name, username, 3-card preview
router.get('/explore/surprise-collection', async (req, res) => {
  try {
    const [collection] = await Collection.aggregate([
      { $match: { visibility: 'public', cards: { $not: { $size: 0 } } } },
      { $sample: { size: 1 } }
    ]);

    if (!collection) return res.status(404).json({ message: 'No public collections found' });

    const user = await User.findById(collection.userId).select('username');

    res.json({
      _id: collection._id,
      name: collection.name,
      cards: collection.cards.slice(0, 3),
      username: user?.username || 'Unknown'
    });
  } catch (err) {
    console.error('❌ Failed to load surprise collection:', err);
    res.status(500).json({ message: 'Error loading surprise collection' });
  }
});

//GET 5 most recently created public collections (with at least 1 card), showing name, owner, 3-card preview
router.get('/explore/newest-collections', async (req, res) => {
  try {
    const collections = await Collection.find({
      visibility: 'public',
      cards: { $not: { $size: 0 } }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const results = await Promise.all(collections.map(async col => {
      const user = await User.findById(col.userId).select('username');
      return {
        _id: col._id,
        name: col.name,
        cards: col.cards.slice(0, 3),
        username: user?.username || 'Unknown'
      };
    }));

    res.json(results);
  } catch (err) {
    console.error('❌ Failed to load newest collections:', err);
    res.status(500).json({ message: 'Error loading newest collections' });
  }
});




export default router;
