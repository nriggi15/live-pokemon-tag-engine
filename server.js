import dotenv from 'dotenv';
import 'dotenv/config';
dotenv.config(); // Always first
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
import SearchLog from './models/SearchLog.js';
import EmailVerification from './models/EmailVerification.js';
import User from './models/User.js';
import { tagSubmissionLimiter } from './middleware/rateLimiter.js';
import TagSubmission from './models/TagSubmission.js';
import favoritesRouter from './routes/favorites.js';
import githubWebhookHandler from './middleware/githubWebhook.js';
import pulseRoutes from './routes/pulse.js';
import expressLayouts from 'express-ejs-layouts';
///////////BELOW GO DOWN DOWN DOWN
///////////BELOW GO DOWN DOWN DOWN
///////////BELOW GO DOWN DOWN DOWN
///////////BELOW GO DOWN DOWN DOWN
///////////BELOW GO DOWN DOWN DOWN
const port = process.env.PORT || 3000;
///////////COOKIE SESSION BEGINS HERE! ALL REQUIRELOGIN GOES BELOW
///////////BELOW GO DOWN DOWN DOWN
///////////BELOW GO DOWN DOWN DOWN
///////////BELOW GO DOWN DOWN DOWN
///////////BELOW GO DOWN DOWN DOWN
///////////BELOW GO DOWN DOWN DOWN
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const sessionMiddleware = session({ ///////////
  secret: process.env.SESSION_SECRET,////////////COOKIE SESSION BEGINS HERE! ALL REQUIRELOGIN GOES BELOW
  resave: false,                ///////////////////
  saveUninitialized: false,     /////////////////
  cookie: {
    httpOnly: true,
    secure: false, // default is false — will override dynamically
    sameSite: 'lax',
    path: '/'
  }
});
//
// app.use BELOW GO DOWN DOWN DOWN
//
//
//
app.use((req, res, next) => {
  sessionMiddleware(req, res, () => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      req.session.cookie.secure = true;
    }
    next();
  });
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve public assets (only public things)
app.use(express.static(path.join(__dirname, 'public')));

// Prevent caching of protected pages
app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.session.userId;
  res.locals.role = req.session.role || 'guest';
  res.locals.isDarkMode = req.session.darkMode || false;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ✅ Import Models
import Card from './models/Cards.js';
import Tag from './models/Tags.js';
import NewTag from './models/NewTag.js';
import userProfilesRoute from './routes/userProfiles.js';
import Collection from './models/Collection.js';
import collectionsRouter from './routes/collections.js';
import indexRoutes from './routes/index.js';
import tagsRoutes from './routes/tags.js';
import leaderboardsRouter from './routes/leaderboards.js';
import sessionVars from './middleware/sessionVars.js';
import encyclopediaRoutes from './routes/encyclopedia.js';

app.use(sessionVars);
app.use(expressLayouts);
app.set('layout', 'layouts/main'); // uses views/layouts/main.ejs
app.use('/api/leaderboards', leaderboardsRouter);
app.use('/api', tagsRoutes);
app.use('/', indexRoutes);
app.use('/api', collectionsRouter);
app.use('/api', favoritesRouter);
app.use('/pulse', pulseRoutes);
app.get('/terms-debug', (req, res) => {
  res.send('✅ Terms route is working');
});

// ✅ Protected Middleware
import { requireAdmin } from './middleware/auth.js';
// const requireModerator = require('./middleware/requireModerator');

import checkBan from './middleware/checkBan.js';

app.use(checkBan); // apply before protected routes


// ✅ API Routes
import usersRouter from './routes/users.js';
app.use('/api', usersRouter);
import tagsRouter from './routes/tags.js';
app.use('/api', tagsRouter);
app.use('/', userProfilesRoute);
app.use('/encyclopedia', encyclopediaRoutes);


// ✅ Auth-Protected Route (now truly secure)
app.get('/admin-panel', requireAdmin, (req, res) => {
  res.render('admin-panel', { 
    layout: 'layouts/main',
    username: req.session.username || '',
    isLoggedIn: req.session.userId,
    page: 'admin',
    isDarkMode: req.session?.darkMode || false,
    role: req.session.role,page: 'search',
  });
});
import adminRoutes from './routes/admin.js';
app.use('/api', adminRoutes);


// ✅ Public Routes (not protected)
app.get('/register', (req, res) => {
  res.render('register', {
    page: 'register',
    username: req.session.username || '',
    layout: 'layouts/main',
  });
});

app.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('login', {
    page: 'login',
    layout: 'layouts/main',
    username: req.session.username || '',
    role: req.session?.role || 'guest',
    isLoggedIn: !!req.session?.userId,
    isDarkMode: req.session?.darkMode || false,
  });
});

app.get('/login-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login-test.html'));
});

app.get('/terms', (req, res) => {
  res.render('terms', {
    layout: 'layouts/main',
    page: 'terms',
    isLoggedIn: !!req.session.userId,
    username: req.session.username || '',
    role: req.session.role || 'guest',
    isDarkMode: req.session?.darkMode || false
  })
});

function redirectIfLoggedIn(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}


// ✅ MongoDB Connection
//console.log('MONGODB_URI:', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Raw Custom Routes (tag-based)
const bannedWords = ['cock', 'ass', 'cunt', 'slavery', 'NSFS', 'nazi', 'fuck', 'shit', 'bitch', 'slur'];

function validateTagName(tagName) {
  const cleaned = tagName.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
  if (!cleaned) return { valid: false, reason: 'empty' };
  if (cleaned.length > 30) return { valid: false, reason: 'too_long' };
  if (bannedWords.some(word => cleaned.includes(word))) return { valid: false, reason: 'profanity' };
  return { valid: true, cleaned };
}

app.post('/api/cards/:cardId/tags', async (req, res) => {
  const { cardId } = req.params;
  const { tagName } = req.body;

  const { valid, cleaned, reason } = validateTagName(tagName || '');
  if (!valid) return res.status(400).json({ message: `Invalid tag input (${reason})` });

  try {
    const card = await Card.findById(cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    let tag = await Tag.findOne({ name: cleaned });
    if (!tag) {
      tag = new Tag({ name: cleaned });
      await tag.save();
    }

    if (!card.tags.includes(tag._id)) {
      card.tags.push(tag._id);
      await card.save();
    }

    res.status(200).json(card);
  } catch (err) {
    console.error('Error adding tag:', err);
    res.status(500).json({ message: 'Error adding tag' });
  }
});


app.get('/search', async (req, res) => {
  const tagsParam = req.query.tags;
  if (!tagsParam) return res.status(400).json({ error: 'Missing tags parameter' });

  const tags = tagsParam.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  
    // Inside /search route:
    for (const tag of tags) {
      SearchLog.create({
        term: tag,
        createdAt: new Date(),
        userId: req.session.userId || null,
        ip: req.ip
      }).catch(err => console.error('❌ Failed to log search term:', err));
    }

  
  const mode = req.query.mode?.toUpperCase() === 'OR' ? 'OR' : 'AND';

  try {
    const pipeline = [
      { $match: { tag: { $in: tags }, status: 'approved' } },
      {
        $group: {
          _id: '$cardId',
          tagsOnCard: { $addToSet: '$tag' }
        }
      }
    ];

    if (mode === 'AND') {
      pipeline.push({ $match: { tagsOnCard: { $all: tags } } });
    }

    const tagDocs = await NewTag.aggregate(pipeline);
    const matchingCardIds = tagDocs.map(doc => doc._id);
    res.json(matchingCardIds);
  } catch (err) {
    console.error('Tag search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});


app.get('/all-tagged-cards', async (req, res) => {
  try {
    const uniqueCardIds = await NewTag.distinct('cardId', { status: 'approved' });
    res.json(uniqueCardIds);
  } catch (err) {
    console.error('Error fetching all tagged cards:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



app.post('/api/newtags/:cardId', tagSubmissionLimiter, async (req, res) => {
  const { cardId } = req.params;
  const { tagName } = req.body;

  const { valid, cleaned, reason } = validateTagName(tagName || '');
  if (!valid) {
    return res.status(400).json({ message: `Invalid tag input (${reason})` });
  }
  console.log('🔍 Checking for duplicate:', { cardId, tag: cleaned });

  try {
    // 🔍 Check TagSubmission (pending/approved only)
    const existsInSubmissions = await TagSubmission.findOne({
      cardId,
      tag: cleaned,
      status: { $in: ['pending', 'approved'] }
    });

    if (existsInSubmissions) {
      return res.status(409).json({ message: 'This tag has already been submitted or approved for this card.' });
    }

    // 🔍 Check NewTag (any status)
    const existsInNewTags = await NewTag.findOne({ cardId, tag: cleaned });

    if (existsInNewTags) {
      return res.status(409).json({ message: 'This tag already exists on this card.' });
    }

    console.log('✅ Passed all checks, saving new tag...');
    // ✅ Save to TagSubmission as pending
    const newSubmission = new TagSubmission({
      cardId,
      tag: cleaned,
      submittedBy: req.session.userId,
      status: 'pending',
      createdAt: new Date()
    });

    await newSubmission.save();

    res.status(200).json({ message: 'Tag submitted for review.' });
  } catch (err) {
    console.error('Error submitting tag:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});



//POST to MongoDB searchlogs on index customtagsearch
app.post('/api/log-search', async (req, res) => {
  const { term } = req.body;
  if (!term) return res.status(400).json({ message: 'Missing search term' });

  try {
    await SearchLog.create({
      term: term.toLowerCase(),
      createdAt: new Date(),
      userId: req.session.userId || null,
      ip: req.ip
    });

    res.status(200).json({ message: 'Logged' });
  } catch (err) {
    console.error('❌ Failed to log search:', err);
    res.status(500).json({ message: 'Failed to log search' });
  }
});



app.get('/api/tag-stats', async (req, res) => {
  try {
    const stats = await NewTag.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$tag', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json(stats.map(entry => ({
      tag: entry._id,
      count: entry.count
    })));
  } catch (error) {
    console.error('Error generating tag stats:', error);
    res.status(500).json({ error: 'Failed to generate tag stats' });
  }
});

  app.get('/verify', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Verification token missing.');
  }

  try {
    const record = await EmailVerification.findOne({ token });

    if (!record) {
      return res.status(400).send('Invalid or expired token.');
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).send('Verification token has expired.');
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Optional: Add a "verified" flag to your User schema if needed later
    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();

    await EmailVerification.deleteOne({ _id: record._id });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    res.send(`<h2>Email verified successfully!</h2><a href="${baseUrl}/login">Go to Login</a>`);


  } catch (err) {
    console.error('❌ Verification error:', err);
    res.status(500).send('Server error during verification.');
  }
});


// User Dashboard
import { requireLogin, requireModeratorOrAdmin } from './middleware/auth.js';
  app.get('/dashboard', requireLogin, async (req, res) => {
    if (!req.session.userId) {
    return res.status(403).render('403');
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(403).render('403');


    res.render('dashboard', {
      page: 'dashboard',
      userId: user._id.toString(),
      username: user.username,
      role: req.session.role || 'user',
      isDarkMode: req.session?.darkMode || false,
      isLoggedIn: true,
      layout: 'layouts/main',
    });
  } catch (err) {
      console.error('❌ Error loading dashboard after login:', err);
      console.warn('⚠️ Redirecting to /api/logout due to dashboard failure');
    console.error('Error loading dashboard:', err);
    return res.redirect('/api/logout');
  }
});



app.get('/collections/:id', async (req, res) => {
  const userId = req.session?.userId || null;

  res.render('collection-view', {
    page: 'collection',
    collectionId: req.params.id,
    sessionUserId: userId,
    username: req.session.username || '',
    isLoggedIn: !!req.session.userId,
    role: req.session.role || 'guest',
    isDarkMode: req.session?.darkMode || false,
    layout: 'layouts/main',
  });

});

//Leaderboards
app.get('/leaderboards', (req, res) => {
  res.render('leaderboards', {
    page: 'leaderboards',
    isLoggedIn: req.session.userId,
    username: req.session.username || '',
    role: req.session.role,
    isDarkMode: req.session?.darkMode || false,
    layout: 'layouts/main',
  });
});


// Moderator Hub
app.get('/moderator-hub', requireModeratorOrAdmin, (req, res) => {
  res.render('moderator-hub', { 
    page: 'moderator',
    isLoggedIn: req.session.userId,
    role: req.session.role,
    username: req.session.username || '',
    isDarkMode: req.session?.darkMode || false,
    layout: 'layouts/main',
  });
});



// ❌ Catch-all to prevent direct access to raw .html files
app.get(/^\/.*\.html$/, (req, res) => {
  res.status(403).send('Access to raw HTML files is forbidden.');
});

app.post('/middleware/github-webhook', githubWebhookHandler);

// ✅ Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
