require('dotenv').config();
const mongoose = require('mongoose');
const LegacyTag = require('./models/LegacyTags');
const NewTag = require('./models/NewTag'); // 👈 NEW COLLECTION

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_USER_ID = '681959219ac39129e45bfc9f'; // your admin _id

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const legacyDocs = await LegacyTag.find({});
    console.log(`📦 Found ${legacyDocs.length} legacy tag documents`);

    let createdCount = 0;
    let skiCount = 0;

    for (const doc of legacyDocs) {
      const { cardId, tags = [], createdAt } = doc;

      if (!Array.isArray(tags)) {
        console.warn(`⚠️ Skipping non-array tags for cardId: ${cardId}`);
        skippedCount++;
        continue;
      }

      for (const tag of tags) {
        const newTag = new NewTag({
          cardId,
          tag,
          submittedBy: ADMIN_USER_ID,
          status: 'approved',
          reviewedBy: ADMIN_USER_ID,
          reviewedAt: new Date(),
          createdAt: createdAt || new Date()
        });

        await newTag.save();
        createdCount++;
      }
    }

    console.log(`✅ Migration complete.`);
    console.log(`🆕 Created ${createdCount} new documents in 'newtags'.`);
    console.log(`⏭️ Skipped ${skippedCount} invalid legacy documents.`);

    process.exit(0);
  } catch (err) {
    console.erro('❌ Migration failed:', err);
    process.exit(1);
  }
})();