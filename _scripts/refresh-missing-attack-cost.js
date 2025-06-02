// scripts/refresh-missing-attack-cost.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Card from '../models/Cards.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const BATCH_SIZE = 5;
const CONCURRENCY_LIMIT = 3;

// Helper function to delay execution
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshCard(card) {
  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards/${card.cardId}`, {
      headers: { 'X-Api-Key': process.env.POKEMONTCG_API_KEY }
    });

    if (res.status === 429) {
      console.warn(`⏳ Rate limited (429) on ${card.cardId}, retrying in 15s...`);
      await sleep(15000);
      return refreshCard(card); // retry after delay
    }

    if (res.status === 404) {
      console.warn(`⛔ Not found on API: ${card.cardId}`);
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const apiCard = json.data;

    card.attacks = apiCard.attacks || [];

    await card.save();
    console.log(`✅ Updated ${card.cardId}`);
  } catch (err) {
    console.warn(`❌ Failed ${card.cardId}: ${err.message}`);
  }
}

// Only fetch real Pokémon cards with attack fields that are missing cost data
const brokenCards = await Card.find({
  supertype: 'Pokémon',
  attacks: { $exists: true, $ne: [] },
  $or: [
    { 'attacks.cost': { $exists: false } },
    { 'attacks.cost': { $size: 0 } }
  ]
});

console.log(`🔍 Found ${brokenCards.length} cards missing attack.cost`);

let index = 0;
while (index < brokenCards.length) {
  const batch = brokenCards.slice(index, index + BATCH_SIZE);

  for (let i = 0; i < batch.length; i += CONCURRENCY_LIMIT) {
    const miniBatch = batch.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(miniBatch.map(refreshCard));
  }

  index += BATCH_SIZE;
}

console.log('🎉 All broken attack.cost entries updated.');
process.exit();
