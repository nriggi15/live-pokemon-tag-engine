import mongoose from 'mongoose';
const { Schema } = mongoose;

const favoriteSearchSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  term: { type: String, required: true },
  type: { type: String, enum: ['tag', 'text'], required: true },
  createdAt: { type: Date, default: Date.now }
});

favoriteSearchSchema.index({ userId: 1, term: 1, type: 1 }, { unique: true });

export default mongoose.model('FavoriteSearch', favoriteSearchSchema);
