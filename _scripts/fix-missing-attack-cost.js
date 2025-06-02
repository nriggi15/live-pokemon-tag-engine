// _scripts/fix-missing-attack-cost.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Card from '../models/Cards.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

// Find Pokémon cards where attacks exist but attack.cost is missing or empty
const brokenCards = await Card.find({
  supertype: 'Pokémon',
  'attacks': { $exists: true, $ne: [] },
  $or: [
    { 'attacks.cost': { $exists: false } },
    { 'attacks.cost': { $size: 0 } }
  ]
});

console.log(`🔍 Found ${brokenCards.length} Pokémon cards with broken or missing attack.cost`);

for (const card of brokenCards) {
  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards/${card.cardId}`, {
      headers: {
        'X-Api-Key': process.env.POKEMONTCG_API_KEY
      }
    });

    if (res.status === 429) {
      console.warn(`⚠️ Rate limit hit. Waiting 10s...`);
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const json = await res.json();
    const updated = json.data;

    card.attacks = updated.attacks || [];

    await card.save();
    console.log(`✅ Fixed ${card.cardId}`);
  } catch (err) {
    console.error(`❌ Failed to fix ${card.cardId}: ${err.message}`);
  }
}

console.log('🎉 Done!');
process.exit();
