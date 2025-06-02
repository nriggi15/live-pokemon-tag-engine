// scripts/checkCardsHealth.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Card from '../models/Cards.js';

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('🔍 Checking Pokémon cards for missing fields...\n');

  const allCards = await Card.find({}).lean();
  const broken = [];

  for (const card of allCards) {
    // Only check stricter fields for Pokémon cards
    if (card.supertype === 'Pokémon') {
      const missing = [];

      if (!card.types?.[0]) missing.push('types[0]');
      if (card.attacks?.some(a => a.damage === undefined)) missing.push('attack.damage');

      if (missing.length > 0) {
        broken.push({
          name: card.name,
          id: card.cardId,
          issues: missing
        });
      }
    }
  }

  if (broken.length === 0) {
    console.log('✅ All Pokémon cards are complete.');
  } else {
    console.log(`⚠️ Found ${broken.length} incomplete Pokémon cards:\n`);
    broken.forEach(card => {
      console.log(`🧾 ${card.name} [${card.id}]`);
      card.issues.forEach(issue => console.log(`  - ❌ Missing ${issue}`));
      console.log();
    });
  }

  mongoose.disconnect();
}).catch(err => {
  console.error('❌ DB connection error:', err);
});
