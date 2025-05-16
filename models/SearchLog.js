import mongoose from 'mongoose';

const searchLogSchema = new mongoose.Schema({
  term: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ip: { type: String, default: null }
});

const SearchLog = mongoose.model('SearchLog', searchLogSchema);

export default SearchLog;
