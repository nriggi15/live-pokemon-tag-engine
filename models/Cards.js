// models/Cards.js
import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  cardId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  set: {
    id: { type: String },
    name: { type: String },
    printedTotal: { type: Number }
  },
  number: { type: String },
  images: {
    small: { type: String, default: null },
    large: { type: String, default: null }
  },
  supertype: { type: String },
  subtypes: [{ type: String }],
  level: { type: String },
  hp: { type: String },
  types: [{ type: String }],
  evolvesFrom: { type: String },
  attacks: [
    {
      name: { type: String },
      text: { type: String }
    }
  ],
  rules: [{ type: String }],
  weaknesses: [
    {
      type: { type: String },
      value: { type: String }
    }
  ],
  resistances: [
    {
      type: { type: String },
      value: { type: String }
    }
  ],
  rarity: { type: String },
  artist: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

const Card = mongoose.model('Card', cardSchema);
export default Card;
