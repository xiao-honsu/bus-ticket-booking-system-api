import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoosePaginate from 'mongoose-paginate-v2';
import { roles } from '../config/roles';

export interface IOAuthProvider {
  provider: 'google' | 'facebook';
  providerId: string;
  providerData?: any;
  connectedAt: Date;
}

export interface INotificationPreferences {
  email: {
    enabled: boolean;
    bookingConfirmations: boolean;
    tripReminders: boolean;
    tripUpdates: boolean;
    promotional: boolean;
  };
  sms: {
    enabled: boolean;
    bookingConfirmations: boolean;
    tripReminders: boolean;
    tripUpdates: boolean;
  };
  push: {
    enabled: boolean;
    bookingConfirmations: boolean;
    tripReminders: boolean;
    tripUpdates: boolean;
  };
}

export interface IUserStats {
  totalBookings: number;
  completedTrips: number;
  cancelledBookings: number;
  totalSpent: number;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  isEmailVerified: boolean;
  profilePictureUrl?: string;
  status: 'active' | 'suspended' | 'deleted';
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  oauthProviders: IOAuthProvider[];
  notificationPreferences: INotificationPreferences;
  stats: IUserStats;
  isPasswordMatch(password: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUser>, PaginateModel<IUser> {
  isEmailTaken(email: string, excludeUserId?: mongoose.Types.ObjectId): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value: string) {
        if (!value.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value: string) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      select: false, // Hide password by default
    },
    role: {
      type: String,
      enum: roles,
      default: 'user',
    },
    phone: {
      type: String,
      trim: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    profilePictureUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
    // OAuth Providers - EMBEDDED (One-to-Few)
    oauthProviders: [
      {
        provider: {
          type: String,
          enum: ['google', 'facebook'],
          required: true,
        },
        providerId: {
          type: String,
          required: true,
        },
        providerData: {
          type: mongoose.Schema.Types.Mixed,
        },
        connectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Notification Preferences - EMBEDDED
    notificationPreferences: {
      email: {
        enabled: { type: Boolean, default: true },
        bookingConfirmations: { type: Boolean, default: true },
        tripReminders: { type: Boolean, default: true },
        tripUpdates: { type: Boolean, default: true },
        promotional: { type: Boolean, default: false },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        bookingConfirmations: { type: Boolean, default: false },
        tripReminders: { type: Boolean, default: false },
        tripUpdates: { type: Boolean, default: false },
      },
      push: {
        enabled: { type: Boolean, default: true },
        bookingConfirmations: { type: Boolean, default: true },
        tripReminders: { type: Boolean, default: true },
        tripUpdates: { type: Boolean, default: true },
      },
    },
    // User Stats - DENORMALIZED
    stats: {
      totalBookings: { type: Number, default: 0 },
      completedTrips: { type: Number, default: 0 },
      cancelledBookings: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Add mongoose-paginate-v2 plugin
userSchema.plugin(mongoosePaginate);

// Additional indexes for OAuth and status
userSchema.index({ email: 1, status: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'oauthProviders.provider': 1, 'oauthProviders.providerId': 1 });

// Login query optimization
userSchema.index({ email: 1, status: 1, isEmailVerified: 1 });

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (
  email: string,
  excludeUserId?: mongoose.Types.ObjectId
): Promise<boolean> {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password: string): Promise<boolean> {
  const user = this as IUser;
  return bcrypt.compare(password, user.password);
};

userSchema.pre('save', async function () {
  const user = this as IUser;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
});

const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;
