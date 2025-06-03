// routes/encyclopedia.js
import express from 'express';
const router = express.Router();

import NewTag from '../models/NewTag.js';
import Card from '../models/Cards.js'; // Adjust path if needed

// GET /encyclopedia/:tag
router.get('/:tag', async (req, res) => {
  const rawTag = req.params.tag.toLowerCase();
  const tagName = req.params.tag;
  try {
    console.log('🔍 Requested tag:', rawTag);
    const tagDocs = await NewTag.find({ tag: rawTag, status: 'approved' });

    if (tagDocs.length < 2) {
      console.log('⚠️ Not enough tag uses:', tagDocs.length);
      return res.status(404).render('encyclopedia-not-found', { tag: rawTag });
    }

    const cardIds = tagDocs.map(doc => doc.cardId);
    console.log('📦 cardIds to look up:', cardIds);

    const existingCards = await Card.find({ cardId: { $in: cardIds } }).lean();
    const existingCardIds = new Set(existingCards.map(c => c.cardId));

    const missingIds = cardIds.filter(id => !existingCardIds.has(id));

    let fetchedCards = [];

    if (missingIds.length > 0) {
    console.log('🌐 Fetching missing cards from API:', missingIds);

    // Fetch in batches of 10
    const batchSize = 10;
    for (let i = 0; i < missingIds.length; i += batchSize) {
        const batch = missingIds.slice(i, i + batchSize);
        const query = batch.map(id => `id:${id}`).join(' OR ');
        const apiUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}`;

        try {
        const res = await fetch(apiUrl, {
            headers: { 'X-Api-Key': process.env.POKEMON_API_KEY } // if required
        });
        const data = await res.json();
        if (Array.isArray(data.data)) {
            fetchedCards.push(...data.data);
        }
        } catch (err) {
        console.error('❌ Failed to fetch missing cards:', err);
        }
    }
    }

    const cards = [...existingCards, ...fetchedCards];
    const uniqueCards = new Set(cards.map(c => c.id)).size;
    console.log('🪵 Final render payload:', {
      cardsLength: cards?.length,
      uniqueCardCount: new Set(cards.map(c => c.cardId)).size
    });


    res.render('encyclopedia-tag', {
      layout: 'layouts/main',
      tagName,
      cards,
      count: cards.length,
      uniqueCardCount: new Set(cards.map(c => c.cardId)).size,
      username: req.session.username || '',
      isLoggedIn: !!req.session.userId,
      isDarkMode: req.session?.darkMode || false,
    });




  } catch (err) {
    console.error('❌ Error loading tag encyclopedia:', err);
    res.status(500).send('Server error');
  }
});


export default router;
