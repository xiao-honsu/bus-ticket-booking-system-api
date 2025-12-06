import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IRatings {
  overall: number;
  cleanliness?: number;
  punctuality?: number;
  staff?: number;
  comfort?: number;
  value?: number;
}

export interface IOperatorResponse {
  operator: mongoose.Types.ObjectId;
  responseText: string;
  respondedAt: Date;
}

export interface IUserSnapshot {
  fullName: string;
  profilePicture?: string;
}

export interface IReviewTripSnapshot {
  routeName: string;
  departureDate: Date;
  operatorName: string;
}

export interface IReview extends Document {
  trip: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  ratings: IRatings;
  reviewText?: string;
  photos: string[];
  verifiedBooking: boolean;
  status: 'published' | 'hidden' | 'deleted';
  helpfulCount: number;
  operatorResponse?: IOperatorResponse;
  userSnapshot: IUserSnapshot;
  tripSnapshot: IReviewTripSnapshot;
}

export interface IReviewModel extends Model<IReview>, PaginateModel<IReview> {}

const reviewSchema = new mongoose.Schema<IReview>(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Ratings breakdown
    ratings: {
      overall: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      cleanliness: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
      staff: { type: Number, min: 1, max: 5 },
      comfort: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
    },
    reviewText: {
      type: String,
      trim: true,
    },
    photos: {
      type: [String],
      default: [],
    },
    verifiedBooking: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['published', 'hidden', 'deleted'],
      default: 'published',
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    // EMBEDDED Operator Response
    operatorResponse: {
      operator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Operator',
      },
      responseText: String,
      respondedAt: Date,
    },
    // Denormalized for display
    userSnapshot: {
      fullName: String,
      profilePicture: String,
    },
    tripSnapshot: {
      routeName: String,
      departureDate: Date,
      operatorName: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
reviewSchema.index({ trip: 1, status: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ 'ratings.overall': -1, helpfulCount: -1 });

// Prevent duplicate reviews
reviewSchema.index({ booking: 1, user: 1 }, { unique: true });

reviewSchema.plugin(mongoosePaginate);

const Review = mongoose.model<IReview, IReviewModel>('Review', reviewSchema);

export default Review;
