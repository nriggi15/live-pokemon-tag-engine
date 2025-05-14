import mongoose from 'mongoose';

const newTagSchema = new mongoose.Schema({
  cardId: {
    type: String,
    required: true,
    index: true,
  },
  tag: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['approved'],
    default: 'approved',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const NewTag = mongoose.model('NewTag', newTagSchema, 'newtags');
export default NewTag;
