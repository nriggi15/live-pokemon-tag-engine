import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  cardId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  set: { type: String, required: true },
  number: { type: String },
  rarity: { type: String },
  artist: { type: String },
  images: {
    small: { type: String },
    large: { type: String },
  },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }]
});

const Card = mongoose.model('Card', cardSchema);
export default Card;
