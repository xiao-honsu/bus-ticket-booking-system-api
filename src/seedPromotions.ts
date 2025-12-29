import mongoose from 'mongoose';
import config from './config/config';
import Promotion from './models/promotion.model';
import logger from './config/logger';

const seedPromotions = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('MongoDB connected for seeding promotions');

    // Clear existing promotions (optional - comment out if you want to keep existing data)
    // await Promotion.deleteMany({});
    // logger.info('Cleared existing promotions');

    const promotions = [
      {
        code: 'NEWYEAR2025',
        title: 'New Year 2025 Celebration',
        description: 'Celebrate the new year with 100,000₫ off on your bus tickets!',
        discountType: 'fixed',
        discountValue: 100000,
        minOrderValue: 200000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        usageLimit: 100,
        perUserLimit: 1,
        isActive: true,
        terms: 'Valid for bookings above 200,000₫. Cannot be combined with other offers.',
      },
      {
        code: 'TET2025',
        title: 'Tết Holiday Special',
        description: 'Get 15% off for your Tết travel plans',
        discountType: 'percentage',
        discountValue: 15,
        maxDiscount: 150000,
        minOrderValue: 300000,
        startDate: new Date('2025-01-20'),
        endDate: new Date('2025-02-15'),
        usageLimit: 200,
        perUserLimit: 2,
        isActive: true,
        terms: 'Maximum discount 150,000₫. Valid for bookings above 300,000₫.',
      },
      {
        code: 'STUDENT20',
        title: 'Student Discount',
        description: '20% off for students',
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 100000,
        minOrderValue: 100000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        usageLimit: 500,
        perUserLimit: 5,
        isActive: true,
        terms: 'Show student ID at check-in. Maximum discount 100,000₫.',
      },
      {
        code: 'WEEKEND50',
        title: 'Weekend Getaway',
        description: 'Save 50,000₫ on weekend trips',
        discountType: 'fixed',
        discountValue: 50000,
        minOrderValue: 150000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        usageLimit: 1000,
        perUserLimit: 10,
        isActive: true,
        terms: 'Valid for weekend departures only. Minimum order 150,000₫.',
      },
      {
        code: 'FIRSTRIDE',
        title: 'First Time Rider',
        description: 'Welcome bonus - 30% off your first booking',
        discountType: 'percentage',
        discountValue: 30,
        maxDiscount: 200000,
        minOrderValue: 100000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        usageLimit: 10000,
        perUserLimit: 1,
        isActive: true,
        terms: 'For first-time users only. Maximum discount 200,000₫.',
      },
    ];

    const createdPromotions = await Promotion.insertMany(promotions);
    logger.info(`Successfully seeded ${createdPromotions.length} promotions`);

    createdPromotions.forEach((promo) => {
      logger.info(`- ${promo.code}: ${promo.title}`);
    });

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding promotions:', error);
    process.exit(1);
  }
};

seedPromotions();
