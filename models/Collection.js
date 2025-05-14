import mongoose from 'mongoose';
const { Schema } = mongoose;

const collectionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  cards: [{ type: String }], // Store cardId only
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 🔐 Enforce one collection name per user
collectionSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model('Collection', collectionSchema);
