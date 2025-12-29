import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IUserPromotion extends Document {
  userId: mongoose.Types.ObjectId;
  promotionId: mongoose.Types.ObjectId;
  collectedAt: Date;
  usedAt?: Date;
  usedInBooking?: mongoose.Types.ObjectId; // Reference to booking if used
  isUsed: boolean;
  isExpired: boolean; // Computed based on promotion end date
}

export interface IUserPromotionModel extends Model<IUserPromotion>, PaginateModel<IUserPromotion> {}

const userPromotionSchema = new mongoose.Schema<IUserPromotion>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
      required: true,
      index: true,
    },
    collectedAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
    },
    usedInBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one user can't collect same promotion multiple times
// (unless perUserLimit > 1)
userPromotionSchema.index({ userId: 1, promotionId: 1 });
userPromotionSchema.index({ userId: 1, isUsed: 1, isExpired: 1 });

userPromotionSchema.plugin(mongoosePaginate);

const UserPromotion = mongoose.model<IUserPromotion, IUserPromotionModel>('UserPromotion', userPromotionSchema);

export default UserPromotion;
