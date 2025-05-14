// models/Tags.js
import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  cardId: {
    type: String,
    required: true,
    index: true,
  },
  tag: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['approved'],
    default: 'approved',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
    default: Date.now,
  }
});

const Tag = mongoose.model('Tag', tagSchema);
export default Tag;