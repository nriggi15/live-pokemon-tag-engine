import mongoose from 'mongoose';

const tagSubmissionSchema = new mongoose.Schema({
  cardId: { type: String, required: true },
  tag: { type: String, required: true, trim: true, lowercase: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const TagSubmission = mongoose.model('TagSubmission', tagSubmissionSchema);
export default TagSubmission;