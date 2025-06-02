// scripts/check-refresh-queue.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Card from '../models/Cards.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const brokenCards = await Card.find({
  supertype: 'Pokémon',
  $or: [
    {
      attacks: {
        $elemMatch: {
          $or: [
            { cost: { $exists: false } },
            { cost: { $size: 0 } }
          ]
        }
      }
    },
    { types: { $exists: true, $size: 0 } },
    { rules: { $exists: true, $size: 0 } }
  ]
}).select('cardId name').lean();

console.log(`🧮 Still missing fields in ${brokenCards.length} Pokémon cards`);

if (brokenCards.length) {
  console.log('🧾 Sample:');
  brokenCards.slice(0, 10).forEach(c => {
    console.log(`- ${c.name} [${c.cardId}]`);
  });
}

process.exit();
