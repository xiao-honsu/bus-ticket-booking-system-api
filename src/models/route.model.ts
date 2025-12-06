import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ILocation {
  city: string;
  state: string;
  landmark?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  stopOrder?: number; // For ordering stops in route
  minutesFromStart?: number; // ETA calculation
  stopType?: 'pickup' | 'dropoff' | 'both'; // Stop functionality
}

export interface IRouteStats {
  totalTrips: number;
  totalBookings: number;
  averagePrice: number;
  lastCalculated?: Date;
}

export interface IRoute extends Document {
  routeName: string;
  origin: ILocation;
  destination: ILocation;
  distance: number;
  estimatedDuration: number;
  stops?: ILocation[];
  isActive: boolean;
  stats: IRouteStats;
}

export interface IRouteModel extends Model<IRoute>, PaginateModel<IRoute> {}

const locationSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    coordinates: {
      type: [Number],
    },
    stopOrder: {
      type: Number,
      min: 0,
    },
    minutesFromStart: {
      type: Number,
      min: 0,
    },
    stopType: {
      type: String,
      enum: ['pickup', 'dropoff', 'both'],
      default: 'both',
    },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema<IRoute>(
  {
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    origin: {
      type: locationSchema,
      required: true,
    },
    destination: {
      type: locationSchema,
      required: true,
    },
    distance: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDuration: {
      type: Number,
      required: true,
      min: 0,
    },
    stops: {
      type: [locationSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Stats for popular routes
    stats: {
      totalTrips: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 },
      averagePrice: { type: Number, default: 0 },
      lastCalculated: Date,
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

// Compound indexes for search
routeSchema.index({ 'origin.city': 1, 'destination.city': 1, isActive: 1 });
routeSchema.index({ 'stops.coordinates': '2dsphere' }); // Geospatial index
routeSchema.index({ 'stats.totalBookings': -1 }); // Popular routes

routeSchema.plugin(mongoosePaginate);

const Route = mongoose.model<IRoute, IRouteModel>('Route', routeSchema);

export default Route;
