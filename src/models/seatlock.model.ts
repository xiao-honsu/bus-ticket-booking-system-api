import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ISeatLock extends Document {
  trip: mongoose.Types.ObjectId;
  seatNumbers: string[];
  user?: mongoose.Types.ObjectId;
  sessionId: string;
  expiresAt: Date;
}

export interface ISeatLockModel extends Model<ISeatLock>, PaginateModel<ISeatLock> {}

const seatLockSchema = new mongoose.Schema<ISeatLock>(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    seatNumbers: [
      {
        type: String,
        required: true,
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sessionId: {
      type: String,
      required: true,
      // Note: Index is created in compound index below
    },
    expiresAt: {
      type: Date,
      required: true,
      // Note: TTL index is created separately below, not here
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

// Compound unique index to prevent double locking
// Only active locks (not expired) should be enforced
seatLockSchema.index(
  { trip: 1, seatNumbers: 1 },
  {
    unique: true,
    partialFilterExpression: { expiresAt: { $gt: new Date() } },
  }
);

// TTL index for automatic cleanup of expired locks
seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

seatLockSchema.plugin(mongoosePaginate);

const SeatLock = mongoose.model<ISeatLock, ISeatLockModel>('SeatLock', seatLockSchema);

export default SeatLock;
