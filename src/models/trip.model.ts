import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IDriver {
  name: string;
  phone: string;
  licenseNumber: string;
}

export interface ITripStats {
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
}

export interface ITrip extends Document {
  bus: mongoose.Types.ObjectId;
  route: mongoose.Types.ObjectId;
  operator: mongoose.Types.ObjectId;
  departureTime: Date;
  arrivalTime: Date;
  pricePerSeat: number;
  seatPricing: Map<string, number>; // Map of seatNumber -> price for this trip
  availableSeats: number;
  bookedSeats: string[];
  seatStatus: Map<string, 'available' | 'booked' | 'locked'>;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cancellationReason?: string;
  driver?: IDriver;
  stats: ITripStats;
}

export interface ITripModel extends Model<ITrip>, PaginateModel<ITrip> {}

const tripSchema = new mongoose.Schema<ITrip>(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
      index: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
      index: true,
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: true,
      index: true,
    },
    departureTime: {
      type: Date,
      required: true,
    },
    arrivalTime: {
      type: Date,
      required: true,
    },
    pricePerSeat: {
      type: Number,
      required: true,
      min: 0,
    },
    // Seat-specific pricing - overrides pricePerSeat for specific seats
    seatPricing: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },
    bookedSeats: {
      type: [String],
      default: [],
    },
    // Seat status map for quick lookup
    seatStatus: {
      type: Map,
      of: String,
      default: new Map(),
      validate: {
        validator: function (map: Map<string, string>) {
          for (const value of map.values()) {
            if (!['available', 'booked', 'locked'].includes(value)) {
              return false;
            }
          }
          return true;
        },
        message: 'Seat status must be available, booked, or locked',
      },
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    driver: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      licenseNumber: {
        type: String,
        trim: true,
      },
    },
    // Quick stats for analytics
    stats: {
      totalBookings: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      occupancyRate: { type: Number, default: 0 },
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
tripSchema.index({ departureTime: 1, status: 1 });
tripSchema.index({ route: 1, departureTime: 1 });

// CRITICAL compound indexes for search
tripSchema.index({ route: 1, departureTime: 1, status: 1 });
tripSchema.index({ operator: 1, departureTime: 1 });
tripSchema.index({ bus: 1, departureTime: 1 });

// Availability check optimization
tripSchema.index({ route: 1, departureTime: 1, availableSeats: 1, status: 1 });

tripSchema.plugin(mongoosePaginate);

const Trip = mongoose.model<ITrip, ITripModel>('Trip', tripSchema);

export default Trip;
