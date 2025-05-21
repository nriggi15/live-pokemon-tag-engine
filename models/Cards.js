// models/Cards.js
import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  cardId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  set: { type: String, required: true },
  number: { type: String },
  rarity: { type: String },
  artist: { type: String },
  images: {
    small: { type: String, default: null },
    large: { type: String, default: null }
  }
});

const Card = mongoose.model('Card', cardSchema);
export default Card;
