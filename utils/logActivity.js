import mongoose from 'mongoose';
import Activity from '../models/Activity.js';

const logActivity = async ({ type, user, cardId = null, tag = null, message = '' }) => {
  try {
    console.log('📥 logActivity called with:', { type, user, cardId, tag, message });
    
    const newActivity = new Activity({
      type,
      user: new mongoose.Types.ObjectId(user), // ✅ force as ObjectId
      cardId,
      tag,
      message
    });

    await newActivity.save();
    console.log('✅ Activity saved:', newActivity);
  } catch (err) {
    console.error('❌ Error logging activity:', err.message);
    console.error('🔍 Stack trace:', err.stack);
    }

};

export default logActivity;
