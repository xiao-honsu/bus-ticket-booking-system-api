import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ISeat {
  seatNumber: string;
  row: number;
  column: number;
  seatType: 'standard' | 'vip' | 'window' | 'aisle';
  position?: {
    x: number;
    y: number;
  };
}

export interface ISeatMap {
  name?: string;
  rows: number;
  columns: number;
  layout?: any;
  seats: ISeat[];
}

export interface IBus extends Document {
  busNumber: string;
  busType: 'standard' | 'limousine' | 'sleeper';
  totalSeats: number;
  amenities: string[];
  operator: mongoose.Types.ObjectId;
  status: 'active' | 'maintenance' | 'inactive';
  licensePlate: string;
  busModel?: string;
  yearOfManufacture?: number;
  images: string[];
  seatMap: ISeatMap;
}

export interface IBusModel extends Model<IBus>, PaginateModel<IBus> {}

const busSchema = new mongoose.Schema<IBus>(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    busType: {
      type: String,
      required: true,
      enum: ['standard', 'limousine', 'sleeper'],
      index: true,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
    },
    amenities: {
      type: [String],
      default: [],
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'inactive'],
      default: 'active',
      index: true,
    },
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    busModel: {
      type: String,
      trim: true,
    },
    yearOfManufacture: {
      type: Number,
    },
    images: {
      type: [String],
      default: [],
    },
    // EMBEDDED Seat Map - One bus has its seat configuration
    seatMap: {
      name: String,
      rows: Number,
      columns: Number,
      layout: mongoose.Schema.Types.Mixed,
      seats: [
        {
          seatNumber: {
            type: String,
            required: true,
          },
          row: Number,
          column: Number,
          seatType: {
            type: String,
            enum: ['standard', 'vip', 'window', 'aisle'],
            default: 'standard',
          },
          position: {
            x: Number,
            y: Number,
          },
        },
      ],
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

// Compound indexes
busSchema.index({ operator: 1, status: 1 });
busSchema.index({ busType: 1, status: 1 });

busSchema.plugin(mongoosePaginate);

const Bus = mongoose.model<IBus, IBusModel>('Bus', busSchema);

export default Bus;
