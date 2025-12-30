/**
 * Migration script to update existing promotions with new fields
 * Run this script once to migrate existing data
 *
 * Usage: npm run ts-node src/migratePromotions.ts
 */

import mongoose from 'mongoose';
import Promotion from './models/promotion.model';
import UserPromotion from './models/userpromotion.model';
import config from './config/config';
import logger from './config/logger';

const migratePromotions = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    // Update all promotions
    const promotions = await Promotion.find({});
    logger.info(`Found ${promotions.length} promotions to migrate`);

    for (const promotion of promotions) {
      // Set collectedCount from usedCount if not already set
      if (promotion.collectedCount === undefined || promotion.collectedCount === null) {
        promotion.collectedCount = promotion.usedCount || 0;
      }

      // Count actual used promotions
      if (promotion.actualUsedCount === undefined || promotion.actualUsedCount === null) {
        const usedCount = await UserPromotion.countDocuments({
          promotionId: promotion._id,
          isUsed: true,
        });
        promotion.actualUsedCount = usedCount;
      }

      await promotion.save();
      logger.info(
        `Updated promotion ${promotion.code}: collectedCount=${promotion.collectedCount}, actualUsedCount=${promotion.actualUsedCount}`
      );
    }

    logger.info('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migratePromotions();
