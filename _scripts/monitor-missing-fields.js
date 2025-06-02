// scripts/monitor-missing-fields.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Card from '../models/Cards.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

let previousCount = null;
let previousTime = null;

async function checkRemaining() {
  const currentTime = Date.now();
  const count = await Card.countDocuments({
    supertype: 'Pokémon',
    $or: [
      { 'attacks': { $exists: true, $ne: [] }, 'attacks.cost': { $exists: false } },
      { 'attacks': { $exists: true, $ne: [] }, 'attacks.cost': { $size: 0 } },
      { 'types.0': { $exists: false } },
      { 'rules.0': { $exists: false } }
    ]
  });

  let etaMessage = '⌛ Estimating...';
  if (previousCount !== null && previousTime !== null && count < previousCount) {
    const deltaCount = previousCount - count;
    const deltaTime = (currentTime - previousTime) / 1000; // seconds

    const rate = deltaCount / deltaTime; // cards per second
    const etaSeconds = Math.round(count / rate);

    const minutes = Math.floor(etaSeconds / 60);
    const seconds = etaSeconds % 60;

    etaMessage = `⏳ ETA: ${minutes}m ${seconds}s at ${rate.toFixed(2)} cards/sec`;
  }

  previousCount = count;
  previousTime = currentTime;

  console.clear();
  console.log(`🕵️‍♂️  ${new Date().toLocaleTimeString()} — ${count} Pokémon cards still missing fields`);
  console.log(etaMessage);
}

setInterval(checkRemaining, 5000);
await checkRemaining(); // Initial call
