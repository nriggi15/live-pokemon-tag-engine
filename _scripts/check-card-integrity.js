// _scripts/check-card-integrity.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Card from '../models/Cards.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const cards = await Card.find({ supertype: 'Pokémon' }).lean();

let broken = 0;
for (const card of cards) {
  const attacks = card.attacks || [];
  const hasBrokenAttack = attacks.some(
    a => !a.name || !('text' in a) || !('damage' in a) || !Array.isArray(a.cost)
  );

  const missingType = !Array.isArray(card.types) || !card.types[0];

  if (hasBrokenAttack || missingType) {
    console.log(`🧾 ${card.name} [${card.cardId}]`);
    if (hasBrokenAttack) console.log('  - ❌ Broken or incomplete attack');
    if (missingType) console.log('  - ❌ Missing types[0]');
    broken++;
  }
}

console.log(`\n✅ Checked ${cards.length} Pokémon cards`);
console.log(`❌ ${broken} cards still have issues`);
process.exit();
