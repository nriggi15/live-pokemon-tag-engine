import express from 'express';
const router = express.Router();
import fetch from 'node-fetch';
import Tag from '../models/NewTag.js';
import Collection from '../models/Collection.js'; // ✅ Adjust to match your model path
import TagSubmission from '../models/TagSubmission.js'; // adjust if needed


router.get('/', (req, res) => {
  res.render('index', {
    isLoggedIn: !!req.session.userId,
    role: req.session.role || 'guest',
    page: 'index'
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
  const { q, cardType, format, type } = req.query;
  let filters = [];

  if (q) filters.push(`name:${q}*`);
  if (cardType) filters.push(`supertype:"${cardType}"`);
  if (format) filters.push(`legalities.${format.toLowerCase()}:legal`);
  if (type) filters.push(`types:"${type}"`);

  const queryString = filters.join(' AND ');
  const apiUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(queryString)}&pageSize=30`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY // or hardcode your key if needed
      }
    });

    const data = await response.json();
    console.log('🔍 Querying:', queryString);

    res.json({ cards: data.data || [] });
  } catch (err) {
    console.error('❌ Error querying PokémonTCG API:', err);
    res.status(500).json({ error: 'Failed to fetch cards from API' });
  }
});

//Card-ID page
router.get('/card/:id', async (req, res) => {
  const cardId = req.params.id;
  const { message, type } = req.query; // ✅ THIS MUST BE HERE  
  try {
    const apiRes = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_API_KEY
      }
    });

    const cardData = await apiRes.json();
    const card = cardData.data;
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
    res.render('card', {
      card,
      tags,
      similarCards,
      setCards,
      collectionsWithCard,
      isLoggedIn: !!req.session.userId,
      role: req.session.role || 'guest',
      message: message ? { text: message, type } : null // ✅ EXACTLY THIS LINE
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





export default router;

