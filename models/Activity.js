import mongoose from 'mongoose';
const { Schema } = mongoose;

const activitySchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['tag', 'first_tag', 'join', 'login', 'collection', 'badge', 'system']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardId: {
    type: String,
    default: null
  },
  tag: {
    type: String,
    default: null
  },
  message: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
