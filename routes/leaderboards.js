import express from 'express';
import SearchLog from '../models/SearchLog.js';

const router = express.Router();

router.get('/most-searched-tags', async (req, res) => {
  const filter = req.query.filter || 'alltime';

  // Determine date filter
  let dateMatch = {};
  const now = new Date();

  if (filter === 'daily') {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    dateMatch = { createdAt: { $gte: since } };
  } else if (filter === 'monthly') {
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateMatch = { createdAt: { $gte: since } };
  }

  try {
    const results = await SearchLog.aggregate([
      { $match: dateMatch },
      { $group: { _id: '$term', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json(results.map(r => ({
      name: r._id,
      value: r.count
    })));
  } catch (err) {
    console.error('❌ Failed to get most-searched-tags:', err);
    res.status(500).json({ error: 'Failed to get most-searched-tags' });
  }
});

import TagSubmission from '../models/TagSubmission.js';

const timeFilterMatch = (filter) => {
  if (filter === 'daily') return { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
  if (filter === 'monthly') return { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
  return {};
};

// Most Tags Submitted
router.get('/most-tags-submitted', async (req, res) => {
  const filter = req.query.filter || 'alltime';

  try {
    const results = await TagSubmission.aggregate([
      { $match: timeFilterMatch(filter) },
      { $group: { _id: '$submittedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $project: { username: '$user.username', value: '$count' } }
    ]);

    res.json(results);
  } catch (err) {
    console.error('❌ Failed to get most-tags-submitted:', err);
    res.status(500).json({ error: 'Failed to get most-tags-submitted' });
  }
});

// Most Tags Approved
router.get('/most-tags-approved', async (req, res) => {
  const filter = req.query.filter || 'alltime';

  try {
    const results = await TagSubmission.aggregate([
      { $match: { ...timeFilterMatch(filter), status: 'approved' } },
      { $group: { _id: '$submittedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $project: { username: '$user.username', value: '$count' } }
    ]);

    res.json(results);
  } catch (err) {
    console.error('❌ Failed to get most-tags-approved:', err);
    res.status(500).json({ error: 'Failed to get most-tags-approved' });
  }
});

// Most Tags Denied
router.get('/most-tags-denied', async (req, res) => {
  const filter = req.query.filter || 'alltime';

  try {
    const results = await TagSubmission.aggregate([
      { $match: { ...timeFilterMatch(filter), status: 'denied' } },
      { $group: { _id: '$submittedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $project: { username: '$user.username', value: '$count' } }
    ]);

    res.json(results);
  } catch (err) {
    console.error('❌ Failed to get most-tags-denied:', err);
    res.status(500).json({ error: 'Failed to get most-tags-denied' });
  }
});

// Top Approval Rates
router.get('/top-approval-rates', async (req, res) => {
  const filter = req.query.filter || 'alltime';

  try {
    const results = await TagSubmission.aggregate([
      { $match: timeFilterMatch(filter) },
      { $group: {
        _id: '$submittedBy',
        total: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        }
      }},
      { $match: { total: { $gte: 5 } } }, // Only show users with >= 5 submissions
      { $project: { approvalRate: { $multiply: [{ $divide: ['$approved', '$total'] }, 100] } } },
      { $sort: { approvalRate: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $project: { username: '$user.username', value: { $round: ['$approvalRate', 2] } } }
    ]);

    res.json(results);
  } catch (err) {
    console.error('❌ Failed to get top-approval-rates:', err);
    res.status(500).json({ error: 'Failed to get top-approval-rates' });
  }
});

import NewTag from '../models/NewTag.js';
import Card from '../models/Cards.js';

// Most Used Tags
router.get('/most-used-tags', async (req, res) => {
  const filter = req.query.filter || 'alltime';

  let dateMatch = {};
  if (filter === 'daily') {
    dateMatch = { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
  } else if (filter === 'monthly') {
    dateMatch = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
  }

  try {
    const results = await NewTag.aggregate([
      { $match: { status: 'approved', ...dateMatch } },
      { $group: { _id: '$tag', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json(results.map(r => ({
      name: r._id,
      value: r.count
    })));
  } catch (err) {
    console.error('❌ Failed to get most-used-tags:', err);
    res.status(500).json({ error: 'Failed to get most-used-tags' });
  }
});

// Most Tagged Cards
router.get('/most-tagged-cards', async (req, res) => {
  const filter = req.query.filter || 'alltime';

  let dateMatch = {};
  if (filter === 'daily') {
    dateMatch = { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
  } else if (filter === 'monthly') {
    dateMatch = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
  }

  try {
    const results = await NewTag.aggregate([
      { $match: { status: 'approved', ...dateMatch } },
      { $group: { _id: '$cardId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const populated = await Card.find({ cardId: { $in: results.map(r => r._id) } }, { name: 1 });


    const mappedResults = results.map(r => {
      const card = populated.find(c => c._id.toString() === r._id.toString());
      return {
        name: card ? card.name : r._id,
        value: r.count
      };
    });

    res.json(mappedResults);
  } catch (err) {
    console.error('❌ Failed to get most-tagged-cards:', err);
    res.status(500).json({ error: 'Failed to get most-tagged-cards' });
  }
});



//
////
/////
/////
////
//
export default router;
