import mongoose, { Document, Model, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IChatContext {
  language: string;
  currentBookingId?: mongoose.Types.ObjectId;
  searchParams?: any;
  userIntent?: string;
  metadata?: any;
}

export interface IChatMessage {
  sender: 'user' | 'bot' | 'agent';
  messageText: string;
  metadata?: {
    intent?: string;
    entities?: any;
    confidence?: number;
    actionTaken?: string;
  };
  helpfulVote?: boolean;
  timestamp: Date;
}

export interface IChatSession extends Document {
  user?: mongoose.Types.ObjectId;
  sessionId: string;
  status: 'active' | 'closed';
  context?: IChatContext;
  messages: IChatMessage[];
  startedAt?: Date;
  endedAt?: Date;
}

export interface IChatSessionModel extends Model<IChatSession>, PaginateModel<IChatSession> {}

const chatSessionSchema = new mongoose.Schema<IChatSession>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true, // unique automatically creates an index
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
      index: true,
    },
    // Context for AI
    context: {
      language: {
        type: String,
        default: 'vi',
      },
      currentBookingId: mongoose.Schema.Types.ObjectId,
      searchParams: mongoose.Schema.Types.Mixed,
      userIntent: String,
      metadata: mongoose.Schema.Types.Mixed,
    },
    // EMBEDDED Messages - One session has its messages
    messages: {
      type: [
        {
          sender: {
            type: String,
            enum: ['user', 'bot', 'agent'],
            required: true,
          },
          messageText: {
            type: String,
            required: true,
          },
          metadata: {
            intent: String,
            entities: mongoose.Schema.Types.Mixed,
            confidence: Number,
            actionTaken: String,
          },
          helpfulVote: {
            type: Boolean,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      validate: {
        validator: function (messages: IChatMessage[]) {
          // Limit to 100 messages per session to prevent document overflow
          return messages.length <= 100;
        },
        message: 'Maximum 100 messages per session allowed',
      },
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
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
// Note: sessionId index is already created by unique constraint
chatSessionSchema.index({ user: 1, status: 1 });

// TTL index - Keep only 90 days
chatSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

chatSessionSchema.plugin(mongoosePaginate);

const ChatSession = mongoose.model<IChatSession, IChatSessionModel>('ChatSession', chatSessionSchema);

export default ChatSession;
