import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IRating {
  overall: number;
  cleanliness: number;
  punctuality: number;
  staff: number;
  comfort: number;
  value: number;
  totalReviews: number;
}

export interface IOperatorStats {
  totalBuses: number;
  totalTrips: number;
  totalRevenue: number;
}

export interface IOperator extends Document {
  companyName: string;
  email: string;
  phoneNumber: string;
  licenseNumber: string;
  description?: string;
  logoUrl?: string;
  status: 'pending' | 'approved' | 'active' | 'suspended';
  rating: IRating;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  stats: IOperatorStats;
}

export interface IOperatorModel extends Model<IOperator>, PaginateModel<IOperator> {}

const operatorSchema = new mongoose.Schema<IOperator>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'suspended'],
      default: 'pending',
      index: true,
    },
    rating: {
      overall: { type: Number, default: 0, min: 0, max: 5 },
      cleanliness: { type: Number, default: 0, min: 0, max: 5 },
      punctuality: { type: Number, default: 0, min: 0, max: 5 },
      staff: { type: Number, default: 0, min: 0, max: 5 },
      comfort: { type: Number, default: 0, min: 0, max: 5 },
      value: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0 },
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    stats: {
      totalBuses: { type: Number, default: 0 },
      totalTrips: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
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

// Compound index for filtering by status and rating
operatorSchema.index({ status: 1, 'rating.overall': -1 });

operatorSchema.plugin(mongoosePaginate);

const Operator = mongoose.model<IOperator, IOperatorModel>('Operator', operatorSchema);

export default Operator;
