require('dotenv').config();
const mongoose = require('mongoose');

const Tag = require('./models/Tags');
const TagSubmission = require('./models/TagSubmission');

const MONGODB_URI = process.env.MONGODB_URI || 'YOUR_BACKUP_URI_HERE';
const REVIEWER_ID = '681959219ac39129e45bfc9f'; // Admin _id
const CREATOR_NAME = 'TheCreator';

async function runMigration() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  console.log('✅ Connected to MongoDB');

  const tags = await Tag.find({});
  console.log(`📦 Found ${tags.length} tagged cards`);

  let total = 0;
  for (const doc of tags) {
    const { cardId, tags: tagArray } = doc;

    for (const tag of tagArray) {
      const existing = await TagSubmission.findOne({ cardId, tag });
      if (!existing) {
        await TagSubmission.create({
          cardId,
          tag,
          submittedBy: REVIEWER_ID,
          status: 'approved',
          reviewedBy: REVIEWER_ID,
          reviewedAt: new Date()
        });
        total++;
      }
    }
  }

  console.log(`✅ Migration complete. ${total} tag submissions added.`);
  mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('❌ Migration error:', err);
  mongoose.disconnect();
});