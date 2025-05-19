import express from 'express';
const router = express.Router();
import fetch from 'node-fetch';
import Tag from '../models/NewTag.js';
import Collection from '../models/Collection.js'; // ✅ Adjust to match your model path
import TagSubmission from '../models/TagSubmission.js'; // adjust if needed
import nodemailer from 'nodemailer';
import { bugReportLimiter } from '../middleware/rateLimiter.js';
import { requireLogin } from '../middleware/auth.js';

router.get('/', (req, res) => {
  res.render('index', {
    isLoggedIn: !!req.session.userId,
    role: req.session.role || 'guest',
    username: req.session.username || '',
    email: req.session.email || '',
    isDarkMode: req.session?.darkMode || false,
    page: 'index',
    layout: 'layout',
    title: 'Home',
  });
});


// Dashboard / Account section
router.get('/explore', (req, res) => {
  const isLoggedIn = !!req.session.userId;
  const role = req.session.role || 'guest';

  res.render('explore', {
    page: 'explore',
    isLoggedIn,
    role
  });
});

router.get('/search', (req, res) => {
  res.render('search', {
    isLoggedIn: req.session.isLoggedIn || false,
    role: req.session.role || 'guest'
  });
});


router.get('/leaderboards', (req, res) => {
  res.render('leaderboards', { 
    isLoggedIn: req.session.userId,
    role: req.session.role
  });
});


router.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    page: 'dashboard',  // ✅ Add this
    isLoggedIn: !!req.session.userId,
    role: req.session.role || 'guest'
  });
});



// Tag browsing page
router.get('/tags', (req, res) => {
  res.render('tags', { title: 'Browse Tags' });
});

// Bottom Navigation Bar Test Page
router.get('/bottom-nav-test', (req, res) => {
    res.render('bottom-nav-test', {
        title: 'Bottom Nav Test',
        page: 'bottom-test',
        isLoggedIn: !!req.session.userId,
        role: req.session.role || null
    });
});

//tagging-center isLoggedIn for bottom nav
router.get('/tagging-center', (req, res) => {
  const isLoggedIn = !!req.session.userId;
  const role = req.session.role || null;

  res.render('tagging-center', {
    page: 'tagging-center',
    isLoggedIn,
    role
  });
});

// Advanced card search with partial name or tag matching
router.get('/adv-search', async (req, res) => {
  const { q, cardType, format, type, rarity, set, artist, sort } = req.query;

  let filters = [];

  // Always add name filter (wildcard if no query)
  filters.push(`name:${q ? `${q}*` : '*'}`);

  if (cardType) filters.push(`supertype:"${cardType}"`);
  if (format) filters.push(`legalities.${format.toLowerCase()}:legal`);
  if (type) filters.push(`types:"${type}"`);
  if (rarity) filters.push(`rarity:"${rarity}"`);
  if (set) filters.push(`set.name:"${set}"`);
  if (artist) filters.push(`artist:"${artist}"`);

  const queryString = filters.join(' AND ');

  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 50;

  let apiUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(queryString)}&pageSize=${pageSize}&page=${page}`;

  // ✅ Add deterministic ordering to avoid duplicate pages
  if (sort === 'name') {
    apiUrl += `&orderBy=name`;
  } else if (sort === 'hp') {
    apiUrl += `&orderBy=-hp`;
  } else if (sort === 'released') {
    apiUrl += `&orderBy=-set.releaseDate`;
  } else if (!sort) {
    apiUrl += `&orderBy=id`; // ✅ Guarantees consistent pagination
  } else if (sort !== 'price') {
    return res.status(400).json({ error: 'Unsupported sort option.' });
  }

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    const data = await response.json();

    console.log('🔍 Querying:', queryString);
    console.log(`🌐 API request: page=${page}, pageSize=${pageSize}`);
    console.log(`📦 API returned ${data.data?.length || 0} cards`);

    res.json({ cards: data.data || [] });
  } catch (err) {
    console.error('❌ Error querying PokémonTCG API:', err);
    res.status(500).json({ error: 'Failed to fetch cards from API' });
  }
});



//Card-ID page
router.get('/card/:id', async (req, res) => {
  const cardId = req.params.id;
  const { q, cardType, format, type, rarity, set, artist, sort } = req.query;

  try {
    const apiRes = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    const cardData = await apiRes.json();
    const card = cardData.data;


    let marketPrice = null;

    if (card?.tcgplayer?.prices) {
      for (const variant in card.tcgplayer.prices) {
        const price = card.tcgplayer.prices[variant]?.market;
        if (typeof price === 'number') {
          marketPrice = price;
          break; // use first valid price
        }
      }
    }



    if (!card) return res.status(404).render('404');

    let tags = [];
    try {
      tags = await Tag.find({ cardId }).sort({ tag: 1 });
    } catch (err) {
      console.warn(`⚠️ No tags found for card ${cardId} or collection error.`);
    }

    // Similar Cards
    const similarRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(card.name)}"&pageSize=10`, {
      headers: { 'X-Api-Key': process.env.POKEMON_API_KEY }
    });
    const similarData = await similarRes.json();
    const similarCards = (similarData.data || []).filter(c => c.id !== card.id);

    // Set Cards
    const setRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${card.set.id}&pageSize=20`, {
      headers: { 'X-Api-Key': process.env.POKEMON_API_KEY }
    });
    const setData = await setRes.json();
    const setCards = (setData.data || []).filter(c => c.id !== card.id);

    const collectionsWithCard = await Collection.find({ cards: cardId, visibility: 'public' })
    .limit(5)
    .lean(); // use .lean() for faster read-only results



    // ✅ Render with all variables
    const message = req.query.message;
    const type = req.query.type;

    // eBay Search URLs
    const isLocalhost = req.hostname.includes('localhost') || req.hostname.includes('127.0.0.1');
    const baseQuery = `${card.name} ${card.set.name}`;
    const ebayAffiliate = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${card.name} ${card.set.name}`)}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=5339111116&customid=${card.id}&toolid=10001&mkevt=1`;



    const ebayFinal = isLocalhost ? searchUrl : ebayAffiliate;


    res.render('card', {
      card,
      tags,
      similarCards,
      setCards,
      collectionsWithCard,
      isLoggedIn: !!req.session.userId,
      role: req.session.role || 'guest',
      marketPrice,
      message: message ? { text: message, type } : null,
      ebayAffiliate,
      isLocalhost,
      ebayFinal
    });





  } catch (err) {
    console.error('❌ Failed to load card page:', err);
    res.status(500).render('error', { message: 'Failed to load card.' });
  }
});

//Submit tag on /card
const bannedWords = ['badword1', 'nastyword2']; // expand as needed

router.post('/submit-tag', async (req, res) => {
  const { cardId, tag } = req.body;

  if (!req.session.userId) {
    return res.redirect(`/card/${cardId}?message=${encodeURIComponent('❌ Login required')}&type=error`);
  }

  if (!cardId || !tag) {
    return res.redirect(`/card/${cardId}?message=${encodeURIComponent('❌ Missing tag or card ID')}&type=error`);
  }

  let cleanedTag = tag.trim().toLowerCase().replace(/[^a-z0-9\s]/gi, '').slice(0, 20);
  if (!cleanedTag) {
    return res.redirect(`/card/${cardId}?message=${encodeURIComponent('❌ Invalid tag')}&type=error`);
  }

  if (bannedWords.some(word => cleanedTag.includes(word))) {
    return res.redirect(`/card/${cardId}?message=${encodeURIComponent('🚫 Inappropriate tag')}&type=error`);
  }

  const exists = await TagSubmission.findOne({ cardId, tag: cleanedTag });
  if (exists) {
    return res.redirect(`/card/${cardId}?message=${encodeURIComponent('⚠️ Tag already submitted')}&type=error`);
  }

  try {
    await TagSubmission.create({
      cardId,
      tag: cleanedTag,
      submittedBy: req.session.userId,
      status: 'pending',
      createdAt: new Date()
    });

    res.redirect(`/card/${cardId}?message=${encodeURIComponent('✅ Tag submitted!')}&type=success`);
  } catch (err) {
    console.error('❌ Failed to submit tag:', err);
    res.redirect(`/card/${cardId}?message=${encodeURIComponent('❌ Server error')}&type=error`);
  }
});

router.get('/api/untagged-cards', async (req, res) => {
  try {
    // Get all tagged card IDs from the database
    const taggedIds = await TagSubmission.distinct('cardId');

    // Fetch a big batch of cards from PokémonTCG API (e.g., 500 cards)
    const apiRes = await fetch(`https://api.pokemontcg.io/v2/cards?pageSize=500`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    const apiData = await apiRes.json();
    const allCards = apiData.data || [];

    const seen = new Set();
    const untagged = allCards.filter(card => {
      const isNew = !taggedIds.includes(card.id) && !seen.has(card.id);
      if (isNew) seen.add(card.id);
      return isNew;
    });

    const random25 = untagged.sort(() => 0.5 - Math.random()).slice(0, 25);


    res.json({ cards: random25 });
  } catch (err) {
    console.error('❌ Failed to fetch untagged cards:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/report-bug', async (req, res) => {
    const { message, logs, browserInfo, url } = req.body;
    const userId = req.session?.userId;

    let username = 'Anonymous';
    let email = '(not provided)';

    if (userId) {
      try {
        const user = await User.findById(userId).lean();
        if (user) {
          username = user.username || username;
          email = user.email || email;
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch user info for bug report:', err);
      }
    }

  const timestamp = new Date().toLocaleString();



  const emailBody = `
🐞 BUG REPORT

User ID: ${userId || 'Anonymous'}
User: ${username || 'Anonymous'}
Email: ${email || '(not provided)'}
Page: ${url}
Browser: ${browserInfo}
Timestamp: ${timestamp}


Message:
${message || '(No message provided)'}

Recent Console Logs:
${logs.join('\n')}
  `;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true, // ⬅️ MUST be true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });


  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: '🐞 New Bug Report',
    text: emailBody
  };

  try {
    await transporter.sendMail(mailOptions);
    res.sendStatus(200);
  } catch (err) {
    console.error('Bug report email failed:', err);
    res.status(500).json({ error: 'Failed to send bug report.' });
  }
});



export default router;

