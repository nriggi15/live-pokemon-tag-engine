// scripts/fixBrokenCards.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Card from '../models/Cards.js';
import fetch from 'node-fetch';

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB');

  const brokenCards = await Card.find({
    $or: [
      { 'attacks.0.damage': { $exists: false } },
      { 'images.large': { $exists: false } },
      { 'types.0': { $exists: false } },
      { 'set.id': { $exists: false } },
      { 'supertype': { $exists: false } }
    ]
  });

  console.log(`🧹 Found ${brokenCards.length} broken cards`);

  for (const card of brokenCards) {
    console.log(`🔄 Refetching: ${card.name} [${card.cardId}]`);

    try {
      const apiRes = await fetch(`https://api.pokemontcg.io/v2/cards/${card.cardId}`, {
        headers: {
          'X-Api-Key': process.env.POKEMON_API_KEY
        }
      });

      const data = await apiRes.json();
      const apiCard = data.data;

      if (!apiCard) {
        console.warn(`⚠️ API returned no data for ${card.cardId}`);
        continue;
      }

      const update = {
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
          text: a.text || '',
          damage: a.damage || ''
        })) || [],
        rules: apiCard.rules || [],
        weaknesses: apiCard.weaknesses || [],
        resistances: apiCard.resistances || [],
        rarity: apiCard.rarity || '',
        artist: apiCard.artist || '',
        lastUpdated: new Date()
      };

      await Card.updateOne({ cardId: card.cardId }, update);
      console.log(`✅ Updated ${card.cardId}`);

    } catch (err) {
      console.error(`❌ Failed to update ${card.cardId}:`, err.message);
    }
  }

  mongoose.disconnect();
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err);
});
