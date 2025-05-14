import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  bio: {
    type: String,
    default: '',
    trim: true
  },
  avatarUrl: {
    type: String,
    default: 'https://cdn-icons-png.flaticon.com/512/188/188987.png'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);
export default UserProfile;
