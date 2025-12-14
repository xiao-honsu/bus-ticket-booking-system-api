import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IPassenger {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  seatNumber: string;
  seatPrice: number;
  documentId?: string;
  phoneNumber?: string;
}

export interface IRefund {
  amount: number;
  refundAmount?: number;
  refundPercentage?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reason?: string;
  refundReference?: string;
  gatewayResponse?: any;
  processedAt?: Date;
  requestedAt?: Date;
}

export interface IPayment {
  paymentReference?: string;
  method?: 'momo' | 'zalopay' | 'payos' | 'card' | 'bank_transfer';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  gatewayResponse?: any;
  paidAt?: Date;
  refund?: IRefund;
}

export interface IModification {
  modifiedBy?: mongoose.Types.ObjectId;
  modificationType: 'passenger_update' | 'seat_change' | 'cancellation';
  changes: any;
  additionalFee?: number;
  timestamp: Date;
}

export interface ITripSnapshot {
  routeName: string;
  departureTime: Date;
  arrivalTime: Date;
  operatorName: string;
  busPlateNumber: string;
}

export interface ICancellationPolicy {
  refundPercentage: number;
  deadlineHours: number;
  terms?: string;
}

export interface IBooking extends Document {
  referenceNumber: string;
  user?: mongoose.Types.ObjectId;
  trip: mongoose.Types.ObjectId;
  guestEmail?: string;
  guestPhone?: string;
  passengers: IPassenger[];
  totalPassengers: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  expiresAt?: Date;
  confirmedAt?: Date;
  contactPhone: string;
  contactEmail: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancellationPolicy?: ICancellationPolicy;
  payment: IPayment;
  modifications: IModification[];
  tripSnapshot: ITripSnapshot;
  // Email notification tracking
  reminderSent24h?: boolean;
  reminderSent2h?: boolean;
  confirmationEmailSent?: boolean;
  cancellationEmailSent?: boolean;
}

export interface IBookingModel extends Model<IBooking>, PaginateModel<IBooking> {}

const passengerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
    },
    gender: {
      type: String,
      required: true,
      enum: ['male', 'female', 'other'],
    },
    seatNumber: {
      type: String,
      required: true,
      trim: true,
    },
    seatPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    documentId: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema<IBooking>(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    guestEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    guestPhone: {
      type: String,
      trim: true,
    },
    passengers: {
      type: [passengerSchema],
      required: true,
      validate: {
        validator: function (v: IPassenger[]) {
          return v && v.length > 0;
        },
        message: 'At least one passenger is required',
      },
    },
    totalPassengers: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    // EMBEDDED Cancellation Policy
    cancellationPolicy: {
      refundPercentage: Number,
      deadlineHours: Number,
      terms: String,
    },
    // EMBEDDED Payment Info - One-to-One
    payment: {
      paymentReference: {
        type: String,
      },
      method: {
        type: String,
        enum: ['momo', 'zalopay', 'payos', 'card', 'bank_transfer'],
      },
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'VND',
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
      },
      transactionId: String,
      gatewayResponse: mongoose.Schema.Types.Mixed,
      paidAt: Date,
      // EMBEDDED Refund if exists
      refund: {
        refundAmount: Number,
        refundPercentage: Number,
        status: {
          type: String,
          enum: ['pending', 'processing', 'completed', 'failed'],
        },
        reason: String,
        refundReference: String,
        gatewayResponse: mongoose.Schema.Types.Mixed,
        processedAt: Date,
      },
    },
    // EMBEDDED Modification History
    modifications: [
      {
        modifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        modificationType: {
          type: String,
          enum: ['passenger_update', 'seat_change', 'cancellation'],
        },
        changes: mongoose.Schema.Types.Mixed,
        additionalFee: Number,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Denormalized trip info for quick access
    tripSnapshot: {
      routeName: String,
      departureTime: Date,
      arrivalTime: Date,
      operatorName: String,
      busPlateNumber: String,
    },
    // Email notification tracking
    reminderSent24h: {
      type: Boolean,
      default: false,
    },
    reminderSent2h: {
      type: Boolean,
      default: false,
    },
    confirmationEmailSent: {
      type: Boolean,
      default: false,
    },
    cancellationEmailSent: {
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

// Indexes for efficient queries
bookingSchema.index({ user: 1, status: 1, createdAt: -1 });
bookingSchema.index({ guestEmail: 1, createdAt: -1 });
bookingSchema.index({ trip: 1, status: 1 });
bookingSchema.index({ 'payment.paymentReference': 1 }, { unique: true, sparse: true });
bookingSchema.index({ 'payment.status': 1, createdAt: -1 });

// Reminder notification queries
bookingSchema.index({ status: 1, reminderSent24h: 1, 'trip.departureTime': 1 });
bookingSchema.index({ status: 1, reminderSent2h: 1, 'trip.departureTime': 1 });

// Admin dashboard queries
bookingSchema.index({ status: 1, createdAt: -1 });

// TTL index for expired pending bookings
bookingSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'pending' },
  }
);

// Custom validator to ensure either user or guestEmail is provided
bookingSchema.path('user').validate(function (value) {
  return value || this.guestEmail;
}, 'Either user or guestEmail is required');

bookingSchema.path('guestEmail').validate(function (value) {
  return value || this.user;
}, 'Either user or guestEmail is required');

bookingSchema.plugin(mongoosePaginate);

const Booking = mongoose.model<IBooking, IBookingModel>('Booking', bookingSchema);

export default Booking;
