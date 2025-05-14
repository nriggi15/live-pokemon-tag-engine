const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  cardId: {
    type: String,
    required: true,
    index: true, // helps with fast lookups
  },
  tags: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Tag', tagSchema);