import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IReviewVote extends Document {
  review: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  isHelpful: boolean;
}

export interface IReviewVoteModel extends Model<IReviewVote>, PaginateModel<IReviewVote> {}

const reviewVoteSchema = new mongoose.Schema<IReviewVote>(
  {
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isHelpful: {
      type: Boolean,
      required: true,
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

// Prevent duplicate votes
reviewVoteSchema.index({ review: 1, user: 1 }, { unique: true });

reviewVoteSchema.plugin(mongoosePaginate);

const ReviewVote = mongoose.model<IReviewVote, IReviewVoteModel>('ReviewVote', reviewVoteSchema);

export default ReviewVote;
