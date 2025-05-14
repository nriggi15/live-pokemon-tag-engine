import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
});

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
export default PasswordReset;