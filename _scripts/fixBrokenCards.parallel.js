// scripts/fixBrokenCards.parallel.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Card from '../models/Cards.js';
import fetch from 'node-fetch';

const API_KEY = process.env.POKEMON_API_KEY;
const CONCURRENCY_LIMIT = 10;

async function fetchAndFixCard(card) {
  const { cardId } = card;
  console.log(`🔄 Refetching: ${card.name} [${cardId}]`);

  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    });

    const data = await res.json();
    const apiCard = data.data;

    if (!apiCard) {
      console.warn(`⚠️ API returned no data for ${cardId}`);
      return;
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

    await Card.updateOne({ cardId }, update);
    console.log(`✅ Updated ${cardId}`);
  } catch (err) {
    console.error(`❌ Failed to update ${cardId}:`, err.message);
  }
}

async function runBatchFix() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  console.log('✅ Connected to MongoDB');

  const brokenCards = await Card.find({
    $or: [
      { 'attacks.0.damage': { $exists: false } },
      { 'images.large': { $exists: false } },
      { 'types.0': { $exists: false } },
      { 'set.id': { $exists: false } },
      { 'supertype': { $exists: false } }
    ]
  }).lean();

  console.log(`🧹 Found ${brokenCards.length} broken cards`);

  let index = 0;
  while (index < brokenCards.length) {
    const batch = brokenCards.slice(index, index + CONCURRENCY_LIMIT);
    await Promise.allSettled(batch.map(card => fetchAndFixCard(card)));
    index += CONCURRENCY_LIMIT;
  }

  mongoose.disconnect();
}

runBatchFix();
