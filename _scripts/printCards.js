// scripts/printCards.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Card from '../models/Cards.js'; // adjust path if needed

// 🔁 Connect to your MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB');

  const cards = await Card.find({}).lean();

  console.log(`📦 Found ${cards.length} cards`);
  cards.forEach(card => {
    console.log(`🧾 ${card.name} [${card.cardId}]`);
    if (card.attacks) {
      card.attacks.forEach((a, i) => {
        console.log(`  - Attack ${i + 1}: ${a.name} | DMG: ${a.damage || '❌ MISSING'}`);
      });
    } else {
      console.log('  ❌ No attacks');
    }
  });

  mongoose.disconnect();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});
