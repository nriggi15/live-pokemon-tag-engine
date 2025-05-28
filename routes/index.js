import express from 'express';
const router = express.Router();
import fetch from 'node-fetch';
import Tag from '../models/NewTag.js';
import Card from '../models/Cards.js'; // ✅ Make sure path is correct
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
    currentPage: 'index',
    layout: 'layout',
    title: 'Home',
    layout: 'layouts/main',
  });
});


// Dashboard / Account section
router.get('/explore', (req, res) => {
  const isLoggedIn = !!req.session.userId;
  const role = req.session.role || 'guest';
  const isDarkMode = req.session.darkMode || false;

  res.render('explore', {
    layout: 'layouts/main',
    page: 'explore',
    isLoggedIn,
    role,
    isDarkMode
  });
});

router.get('/search', (req, res) => {
  res.render('search', {
    isLoggedIn: !!req.session.userId,
    username: req.session.username || '',
    page: 'search',
    role: req.session.role || 'guest',
    isDarkMode: req.session?.darkMode || false,
    layout: 'layouts/main',
  });
});


router.get('/leaderboards', (req, res) => {
  res.render('leaderboards', { 
    isLoggedIn: req.session.userId,
    username: req.session.username || '',
    layout: 'layouts/main',
    role: req.session.role,page: 'search',
    page: 'leaderboards',
    isDarkMode: req.session?.darkMode || false,
  });
});

// About Page
router.get('/about', (req, res) => {
  res.render('about', {
    isLoggedIn: req.session && req.session.userId,
    username: req.session.username || '',
    layout: 'layouts/main',
    role: req.session?.role || null,
    page: 'about',
    isDarkMode: req.session?.darkMode || false,
  });
});



// Tag browsing page
router.get('/tags', (req, res) => {
  res.render('tags', { 
    title: 'Browse Tags',
    username: req.session.username || '',
    isDarkMode: req.session?.darkMode || false,
    layout: 'layouts/main',
  });
});

// Bottom Navigation Bar Test Page
router.get('/bottom-nav-test', (req, res) => {
    res.render('bottom-nav-test', {
        title: 'Bottom Nav Test',
        layout: 'layouts/main',
        username: req.session.username || '',
        page: 'bottom-test',
        isLoggedIn: !!req.session.userId,
        role: req.session.role || null,
    });
});

//tagging-center isLoggedIn for bottom nav
router.get('/tagging-center', (req, res) => {
  const isLoggedIn = !!req.session.userId;
  const role = req.session.role || null;

  res.render('tagging-center', {
    page: 'tagging-center',
    layout: 'layouts/main',
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
  console.log('📥 Card route hit for:', req.params.id);
  const cardId = req.params.id;
  const { q, cardType, format, type, rarity, set, artist, sort } = req.query;

  try {


    // Get data from MongoDB, else load from API then save to DB
    let card = await Card.findOne({ cardId });

    const needsRefresh = !card || !card.images?.large || !card.set?.id || !card.types?.length;

    if (!card || needsRefresh) {
      const apiRes = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
        headers: {
          'X-Api-Key': process.env.POKEMON_API_KEY
        }
      });

      const cardData = await apiRes.json();
      const apiCard = cardData.data;

      if (!apiCard) {
        return res.status(404).render('404');
      }

      const updatedCard = {
        cardId: apiCard.id,
        name: apiCard.name,
        set: {
          id: apiCard.set?.id || '',
          name: apiCard.set?.name || '',
          printedTotal: apiCard.set?.printedTotal || null
        },
        number: apiCard.number || '',
        images: {
          small: apiCard.images?.small || '',
          large: apiCard.images?.large || ''
        },
        supertype: apiCard.supertype || '',
        subtypes: apiCard.subtypes || [],
        level: apiCard.level || '',
        hp: apiCard.hp || '',
        types: apiCard.types || [],
        evolvesFrom: apiCard.evolvesFrom || '',
        attacks: apiCard.attacks?.map(a => ({
          name: a.name,
          text: a.text || ''
        })) || [],
        rules: apiCard.rules || [],
        weaknesses: apiCard.weaknesses || [],
        resistances: apiCard.resistances || [],
        rarity: apiCard.rarity || '',
        artist: apiCard.artist || '',
        lastUpdated: new Date()
      };

      if (!card) {
        card = await Card.create(updatedCard);
      } else {
        await Card.updateOne({ cardId }, updatedCard);
        card = await Card.findOne({ cardId }); // re-load updated version
      }
    }




    // Get market price TCGPlayer
    // Fetch live market price from TCG API
    let marketPrice = null;

    try {
      const livePriceRes = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
        headers: {
          'X-Api-Key': process.env.POKEMON_API_KEY
        }
      });

      const liveData = await livePriceRes.json();
      const tcgplayer = liveData.data?.tcgplayer;

      if (tcgplayer?.prices) {
        for (const variant in tcgplayer.prices) {
          const price = tcgplayer.prices[variant]?.market;
          if (typeof price === 'number') {
            marketPrice = price;
            break;
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch live market price:', err);
    }




    if (!card) return res.status(404).render('404');

    let tags = [];
    try {
      tags = await Tag.find({ cardId }).sort({ tag: 1 });
    } catch (err) {
      console.warn(`⚠️ No tags found for card ${cardId} or collection error.`);
    }

    // Similar Cards
    let similarCards = [];
    if (card.types?.length) {
      let query = `types:"${card.types[0]}"`;
      if (card.subtypes?.length) {
        query += ` AND subtypes:"${card.subtypes[0]}"`;
      }

      const similarRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=12`, {
        headers: { 'X-Api-Key': process.env.POKEMON_API_KEY }
      });

      const similarData = await similarRes.json();
      similarCards = (similarData.data || []).filter(c => c.id !== card.id);
    }




    //Old Similar Cards *** WORKS WELL, just loads alot of results and lags the page, above is an attempt at OR logic to return similar cards, but not exact name match
/*     const similarRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(card.name)}"&pageSize=10`, {
      headers: { 'X-Api-Key': process.env.POKEMON_API_KEY }
    });
    const similarData = await similarRes.json();
    const similarCards = (similarData.data || []).filter(c => c.id !== card.id); */

    // Set Cards
    const currentNum = parseInt(card.number, 10);
    const nearbyIds = [];

    for (let n = currentNum - 10; n <= currentNum + 10; n++) {
      if (n !== currentNum && n > 0) {
        nearbyIds.push(`${card.set.id}-${n}`);
      }
    }

    let setCards = [];

    if (nearbyIds.length > 0) {
      const idQuery = nearbyIds.map(id => `id:${id}`).join(' OR ');
      const nearbyRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(idQuery)}`, {
        headers: { 'X-Api-Key': process.env.POKEMON_API_KEY }
      });

      const nearbyData = await nearbyRes.json();
      setCards = nearbyData.data || [];
    }



    let collectionsWithCard = await Collection.find({ cards: cardId, visibility: 'public' })
      .limit(5)
      .lean();

    // 🔄 Flatten card IDs from all previews
    const previewCardIds = new Set();
    collectionsWithCard.forEach(col => {
      col.previewIds = col.cards.slice(0, 3);
      col.previewIds.forEach(id => previewCardIds.add(id));
    });

    // 🔍 Batch lookup from local card DB
    const previewCards = await Card.find({ cardId: { $in: [...previewCardIds] } }).lean();

    // 🔗 Map cardId → card
    const previewCardMap = {};
    previewCards.forEach(c => {
      previewCardMap[c.cardId] = c;
    });

    // 🧩 Attach preview card objects to each collection
    collectionsWithCard = collectionsWithCard.map(col => ({
      ...col,
      previewCards: col.previewIds.map(id => previewCardMap[id]).filter(Boolean)
    }));




    // ✅ Render with all variables
    const message = req.query.message;
    const type = req.query.type;

    // eBay Search URLs
    const isLocalhost = req.hostname.includes('localhost') || req.hostname.includes('127.0.0.1');
    const baseQuery = `${card.name} ${card.set.name}`;
    const ebayAffiliate = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${card.name} ${card.set.name}`)}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=5339111116&customid=${card.id}&toolid=10001&mkevt=1`;



    const ebayFinal = ebayAffiliate;


console.log('🧪 from param:', req.query.from);

res.render('card', {
  layout: 'layouts/main', // ✅ explicitly include layout (if you use one)             
  title: `${card.name} | Pokémon Card`,  // optional but helpful
  page: 'card',                   // optional but good for nav
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
  ebayFinal,
  isDarkMode: req.session?.darkMode || false,
  from: req.query.from ? encodeURIComponent(req.query.from) : ''
});








  } catch (err) {
    console.error('❌ Failed to load card page:', err);
    res.status(500).render('error', { message: 'Failed to load card.' });
  }
});

//Submit tag on /card
const bannedWords = ['cock', 'ass', 'cunt', 'slavery', 'NSFS', 'nazi', 'fuck', 'shit', 'bitch', 'slur']; // expand as needed

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

router.get('/403', (req, res) => {
  res.status(403).render('403', {
    layout: 'layouts/main', // or your default layout
    title: 'Access Denied',
    message: 'You do not have permission to view this page.',
    isDarkMode: req.session?.darkMode || false
  });
});


export default router;

