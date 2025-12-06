import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IPasswordReset extends Document {
  user: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
}

export interface IPasswordResetModel extends Model<IPasswordReset>, PaginateModel<IPasswordReset> {}

const passwordResetSchema = new mongoose.Schema<IPasswordReset>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    used: {
      type: Boolean,
      default: false,
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

// TTL Index - Auto delete after expiration
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetSchema.plugin(mongoosePaginate);

const PasswordReset = mongoose.model<IPasswordReset, IPasswordResetModel>('PasswordReset', passwordResetSchema);

export default PasswordReset;
