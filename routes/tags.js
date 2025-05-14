import express from 'express';
const router = express.Router();

import TagSubmission from '../models/TagSubmission.js';
import NewTag from '../models/NewTag.js';
import Tag from '../models/NewTag.js';
import User from '../models/User.js';

import { requireLogin, requireModeratorOrAdmin } from '../middleware/auth.js';
import requireVerified from '../middleware/requireVerified.js';




// POST /api/tag-submissions/:cardId
router.post('/tag-submissions/:cardId', requireLogin, requireVerified, async (req, res) => {
  const { cardId } = req.params;
  let { tagName } = req.body;

  const userId = req.session?.userId;

  // Input validation
  if (!tagName || !cardId || !userId) {
    return res.status(400).json({ message: 'Missing tag, cardId, or user session.' });
  }

  // Normalize tag input
  tagName = tagName.trim().toLowerCase();

  try {
    // Check in TagSubmission collection first
    const existingSubmission = await TagSubmission.findOne({
      cardId,
      tag: tagName,
      status: 'pending'
    });

    // Check in NewTag collection next
    const existingApproved = await NewTag.findOne({
      cardId,
      tag: tagName,
      status: 'approved'
    });

    if (existingSubmission || existingApproved) {
      return res.status(409).json({ message: 'Tag already submitted or approved.' });
    }

    // No duplicates found; safe to submit
    const submission = new TagSubmission({
      cardId,
      tag: tagName,
      submittedBy: userId,
      status: 'pending'
    });

    await submission.save();
    res.status(201).json({ success: true, message: 'Tag submitted for review.' });

  } catch (err) {
    console.error('❌ Error saving tag submission:', err);
    res.status(500).json({ message: 'Failed to submit tag.' });
  }
});


//
//
//
// Tag Submission to Mod Hub

// GET /api/mod/tags/pending
router.get('/mod/tags/pending', requireModeratorOrAdmin, async (req, res) => {
  try {
    const submissions = await TagSubmission.find({ status: 'pending' }).populate('submittedBy', 'username');
    res.json(submissions);
  } catch (err) {
    console.error('Error fetching pending tags:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST //mod/newtags/:id/approve
router.post('/mod/newtags/:id/approve', requireModeratorOrAdmin, async (req, res) => {
  try {
    console.log('🛠️ Approve route hit for ID:', req.params.id);

    const submission = await TagSubmission.findById(req.params.id);
    if (!submission || submission.status !== 'pending') {
      return res.status(404).json({ message: 'Pending tag submission not found' });
    }

    // Create a new approved tag entry in NewTag collection
    const newTag = new NewTag({
      cardId: submission.cardId,
      tag: submission.tag,
      submittedBy: submission.submittedBy,
      reviewedBy: req.session.userId,
      reviewedAt: new Date(),
      createdAt: submission.createdAt,
      status: 'approved'
    });

    await newTag.save();

    // Update the submission to mark it as approved
    submission.status = 'approved';
    submission.reviewedBy = req.session.userId;
    submission.reviewedAt = new Date();
    await submission.save();

    res.json({ success: true, message: 'Tag approved and saved to NewTag collection.' });

  } catch (err) {
    console.error('❌ Error approving tag:', err);
    res.status(500).json({ message: 'Server error during tag approval' });
  }
});


// POST /mod/newtags/:id/deny
router.post('/mod/newtags/:id/deny', requireModeratorOrAdmin, async (req, res) => {
  try {
    const tag = await TagSubmission.findById(req.params.id);
    if (!tag || tag.status !== 'pending') {
      return res.status(404).json({ message: 'Pending tag not found' });
    }

    tag.status = 'denied';
    tag.reviewedAt = new Date();
    tag.reviewedBy = req.session.userId;
    await tag.save();

    res.json({ message: 'Tag denied and archived' });
  } catch (err) {
    console.error('❌ Error denying tag:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


//Fetch pending tags
router.get('/mod/newtags/pending', requireModeratorOrAdmin, async (req, res) => {
  try {
    const pendingTags = await NewTag.find({ status: 'pending' })
      .populate('submittedBy', 'username')  // <– populates just the username
      .sort({ createdAt: -1 });

      console.log('🔍 Found pending tags:', pendingTags);

    res.json(pendingTags);
  } catch (err) {
    console.error('❌ Error fetching pending tags:', err);
    res.status(500).json({ message: 'Failed to load pending tag submissions' });
  }
});


// GET /api/newtags/:cardId — fetch approved tags from 'newtags' collection

router.get('/newtags/:cardId', async (req, res) => {
  const { cardId } = req.params;
  try {
    const tagDocs = await NewTag.find({ cardId, status: 'approved' })
      .populate('submittedBy', 'username');

    res.json(tagDocs);
  } catch (err) {
    console.error('❌ Error fetching approved tags:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



router.get('/user-submissions', requireLogin, async (req, res) => {
  try {
    const submissions = await TagSubmission.find({ submittedBy: req.session.userId })
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    console.error('Error fetching user submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/tag-submissions/pending — used by admin workspace
router.get('/tag-submissions/pending', requireModeratorOrAdmin, async (req, res) => {
  try {
    const submissions = await TagSubmission.find({ status: 'pending' })
      .populate('submittedBy', 'username')
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (err) {
    console.error('❌ Error loading admin tag queue:', err);
    res.status(500).json({ message: 'Server error loading tag queue' });
  }
});


//GET trending tags for explore page
router.get('/explore/trending-tags', async (req, res) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7); // 7 days ago

  try {
    const trending = await NewTag.aggregate([
      { $match: { status: 'approved', createdAt: { $gte: since } } },
      { $group: { _id: '$tag', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json(trending.map(entry => ({
      tag: entry._id,
      count: entry.count
    })));
  } catch (err) {
    console.error('❌ Failed to load trending tags:', err);
    res.status(500).json({ message: 'Error loading trending tags' });
  }
});

//GET Most tagged cards
router.get('/explore/most-tagged-cards', async (req, res) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24); // 24 hours ago

  try {
    const results = await NewTag.aggregate([
      { $match: { status: 'approved', createdAt: { $gte: since } } },
      { $group: { _id: '$cardId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    res.json(results); // [{ _id: 'sv3-21', count: 4 }, ...]
  } catch (err) {
    console.error('❌ Failed to get most-tagged cards:', err);
    res.status(500).json({ message: 'Error loading most-tagged cards' });
  }
});

//GET top taggers, top 5 all time
router.get('/explore/top-taggers', async (req, res) => {
  try {
    const results = await NewTag.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$submittedBy',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Look up usernames
    const populated = await Promise.all(results.map(async entry => {
      const user = await User.findById(entry._id).select('username');
      return {
        username: user?.username || 'Unknown',
        count: entry.count
      };
    }));

    res.json(populated);
  } catch (err) {
    console.error('❌ Failed to load top taggers:', err);
    res.status(500).json({ message: 'Error loading taggers' });
  }
});


//GET Random approved tag
router.get('/explore/tag-spotlight', async (req, res) => {
  try {
    const tags = await NewTag.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$tag', count: { $sum: 1 } } },
      { $sample: { size: 1 } }
    ]);

    const spotlightTag = tags[0]?._id;
    if (!spotlightTag) return res.status(404).json({ message: 'No tags available' });

    // Find up to 5 unique cards with this tag
    const cards = await NewTag.find({ tag: spotlightTag, status: 'approved' })
      .limit(5)
      .select('cardId');

    res.json({
      tag: spotlightTag,
      cards: cards.map(doc => doc.cardId)
    });
  } catch (err) {
    console.error('❌ Failed to load tag spotlight:', err);
    res.status(500).json({ message: 'Error loading tag spotlight' });
  }
});


// GET 5 most recent approved tags, including: Tag name Card name (linked to popup) User (linked to profile)
router.get('/explore/live-tags', async (req, res) => {
  try {
    const recent = await NewTag.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('submittedBy', 'username')
      .lean();

    res.json(recent.map(entry => ({
      tag: entry.tag,
      cardId: entry.cardId,
      username: entry.submittedBy?.username || 'Unknown',
      submittedAt: entry.createdAt
    })));
  } catch (err) {
    console.error('❌ Failed to load live tags:', err);
    res.status(500).json({ message: 'Error loading live tags' });
  }
});






export default router;
