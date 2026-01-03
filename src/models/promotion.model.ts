import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IPromotion extends Document {
  code: string; // Unique promotion code (e.g., "SUMMER2025", "NEWYEAR50")
  title: string; // Display title
  description: string; // Description of promotion
  discountType: 'fixed' | 'percentage'; // Fixed amount or percentage
  discountValue: number; // Amount or percentage value
  maxDiscount?: number; // Max discount for percentage type (optional)
  minOrderValue?: number; // Minimum order value to apply (optional)
  startDate: Date; // When promotion starts
  endDate: Date; // When promotion ends
  usageLimit: number; // Total number of times this promo can be used
  usedCount: number; // How many times it has actually been used in bookings
  isActive: boolean; // Can be toggled by admin
  imageUrl?: string; // Optional promotional image
  terms?: string; // Terms and conditions
  createdBy?: mongoose.Types.ObjectId; // Admin who created it
  // Virtual fields
  isValid?: boolean;
  isExpired?: boolean;
  remainingUsage?: number;
}

export interface IPromotionModel extends Model<IPromotion>, PaginateModel<IPromotion> {}

const promotionSchema = new mongoose.Schema<IPromotion>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ['fixed', 'percentage'],
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
      default: 100,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    imageUrl: {
      type: String,
    },
    terms: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
promotionSchema.index({ code: 1 });
promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
promotionSchema.index({ endDate: 1 });

// Virtual to check if promotion is currently valid
promotionSchema.virtual('isValid').get(function () {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now && this.usedCount < this.usageLimit;
});

// Virtual to check if promotion has expired
promotionSchema.virtual('isExpired').get(function () {
  return new Date() > this.endDate;
});

// Virtual to calculate remaining usage
promotionSchema.virtual('remainingUsage').get(function () {
  return Math.max(0, this.usageLimit - this.usedCount);
});

promotionSchema.plugin(mongoosePaginate);

promotionSchema.set('toJSON', { virtuals: true });
promotionSchema.set('toObject', { virtuals: true });

const Promotion = mongoose.model<IPromotion, IPromotionModel>('Promotion', promotionSchema);

export default Promotion;
