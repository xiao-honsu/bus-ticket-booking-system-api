import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ISearchFilters {
  busType?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  departureTimeRange?: {
    start: string;
    end: string;
  };
  amenities?: string[];
}

export interface ISearchHistory extends Document {
  user: mongoose.Types.ObjectId;
  originCity: string;
  destinationCity: string;
  travelDate?: Date;
  passengers: number;
  filters?: ISearchFilters;
  resultsCount?: number;
  sessionId?: string;
}

export interface ISearchHistoryModel extends Model<ISearchHistory>, PaginateModel<ISearchHistory> {}

const searchHistorySchema = new mongoose.Schema<ISearchHistory>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    originCity: {
      type: String,
      required: true,
      trim: true,
    },
    destinationCity: {
      type: String,
      required: true,
      trim: true,
    },
    travelDate: {
      type: Date,
    },
    passengers: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Optional filters used
    filters: {
      busType: [String],
      priceRange: {
        min: Number,
        max: Number,
      },
      departureTimeRange: {
        start: String,
        end: String,
      },
      amenities: [String],
    },
    resultsCount: {
      type: Number,
    },
    sessionId: {
      type: String,
      trim: true,
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
searchHistorySchema.index({ user: 1, createdAt: -1 });
searchHistorySchema.index({ originCity: 1, destinationCity: 1, user: 1 });

// TTL index - Keep only 90 days
searchHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

searchHistorySchema.plugin(mongoosePaginate);

const SearchHistory = mongoose.model<ISearchHistory, ISearchHistoryModel>('SearchHistory', searchHistorySchema);

export default SearchHistory;
