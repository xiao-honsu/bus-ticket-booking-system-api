import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface INotificationMetadata {
  bookingId?: mongoose.Types.ObjectId;
  tripId?: mongoose.Types.ObjectId;
  action?: string;
  actionUrl?: string;
  data?: any;
}

export interface IChannelStatus {
  email?: {
    sent: boolean;
    delivered: boolean;
    opened: boolean;
    messageId?: string;
  };
  sms?: {
    sent: boolean;
    delivered: boolean;
    messageId?: string;
  };
  push?: {
    sent: boolean;
    delivered: boolean;
    clicked: boolean;
    messageId?: string;
  };
}

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type:
    | 'booking_confirmation'
    | 'trip_reminder'
    | 'trip_update'
    | 'cancellation'
    | 'payment_success'
    | 'payment_failed'
    | 'refund_processed';
  channels: ('email' | 'sms' | 'push')[];
  subject?: string;
  content: string;
  metadata?: INotificationMetadata;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  channelStatus?: IChannelStatus;
}

export interface INotificationModel extends Model<INotification>, PaginateModel<INotification> {}

const notificationSchema = new mongoose.Schema<INotification>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'booking_confirmation',
        'trip_reminder',
        'trip_update',
        'cancellation',
        'payment_success',
        'payment_failed',
        'refund_processed',
      ],
      required: true,
      index: true,
    },
    channels: [
      {
        type: String,
        enum: ['email', 'sms', 'push'],
      },
    ],
    subject: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    // Rich metadata for rendering
    metadata: {
      bookingId: mongoose.Schema.Types.ObjectId,
      tripId: mongoose.Schema.Types.ObjectId,
      action: String,
      actionUrl: String,
      data: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'delivered', 'read'],
      default: 'pending',
      index: true,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    // Channel-specific tracking
    channelStatus: {
      email: {
        sent: Boolean,
        delivered: Boolean,
        opened: Boolean,
        messageId: String,
      },
      sms: {
        sent: Boolean,
        delivered: Boolean,
        messageId: String,
      },
      push: {
        sent: Boolean,
        delivered: Boolean,
        clicked: Boolean,
        messageId: String,
      },
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
notificationSchema.index({ user: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ status: 1, createdAt: 1 });

// Unread count optimization
notificationSchema.index({ user: 1, status: 1, type: 1 });

// TTL index - Keep only 6 months
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

notificationSchema.plugin(mongoosePaginate);

const Notification = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);

export default Notification;
