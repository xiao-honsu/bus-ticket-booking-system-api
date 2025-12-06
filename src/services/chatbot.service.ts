import mongoose from 'mongoose';
import httpStatus from 'http-status';
import ChatSession, { IChatSession, IChatMessage } from '../models/chatsession.model';
import Trip from '../models/trip.model';
import Booking from '../models/booking.model';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

/**
 * Generate unique session ID
 */
const generateSessionId = (): string => {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a new chat session
 * @param {mongoose.Types.ObjectId} userId - Optional user ID if authenticated
 * @returns {Promise<IChatSession>}
 */
const createSession = async (userId?: mongoose.Types.ObjectId): Promise<IChatSession> => {
  const sessionId = generateSessionId();

  const session = await ChatSession.create({
    user: userId,
    sessionId,
    status: 'active',
    context: {
      language: 'en',
      metadata: {},
    },
    messages: [
      {
        sender: 'bot',
        messageText:
          "👋 Hello! I'm your bus booking assistant. I can help you with:\n\n" +
          '🔍 **Search for trips** - Find buses to your destination\n' +
          '🎫 **Check bookings** - View your booking history\n' +
          '💺 **Seat availability** - Check available seats for trips\n' +
          '❓ **General help** - Ask me anything about booking\n\n' +
          'What would you like to do today?',
        metadata: {
          intent: 'welcome',
          confidence: 1.0,
        },
        timestamp: new Date(),
      },
    ],
    startedAt: new Date(),
  });

  logger.info(`Chat session created: ${sessionId} for user: ${userId || 'guest'}`);
  return session;
};

/**
 * Get chat session by ID
 * @param {mongoose.Types.ObjectId} sessionId
 * @returns {Promise<IChatSession>}
 */
const getSessionById = async (sessionId: mongoose.Types.ObjectId): Promise<IChatSession> => {
  const session = await ChatSession.findById(sessionId).populate('user', 'name email');
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat session not found');
  }
  return session;
};

/**
 * Get chat session by session ID string
 * @param {string} sessionIdString
 * @returns {Promise<IChatSession>}
 */
const getSessionBySessionId = async (sessionIdString: string): Promise<IChatSession> => {
  const session = await ChatSession.findOne({ sessionId: sessionIdString }).populate('user', 'name email');
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat session not found');
  }
  return session;
};

/**
 * Detect user intent from message
 */
const detectIntent = (message: string): { intent: string; confidence: number; entities?: any } => {
  const lowerMessage = message.toLowerCase();

  // Search/Trip intent
  if (
    lowerMessage.includes('search') ||
    lowerMessage.includes('trip') ||
    lowerMessage.includes('bus') ||
    lowerMessage.includes('find') ||
    lowerMessage.includes('from') ||
    lowerMessage.includes('to')
  ) {
    // Extract cities if mentioned
    const entities: any = {};

    // Simple pattern matching for "from X to Y"
    const fromToMatch = lowerMessage.match(/from\s+([a-zA-Z\s]+)\s+to\s+([a-zA-Z\s]+)/i);
    if (fromToMatch) {
      entities.origin = fromToMatch[1].trim();
      entities.destination = fromToMatch[2].trim();
    }

    // Date extraction (simple pattern)
    const dateMatch = lowerMessage.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      entities.date = dateMatch[0];
    }

    return { intent: 'search_trips', confidence: 0.85, entities };
  }

  // Booking inquiry
  if (
    lowerMessage.includes('booking') ||
    lowerMessage.includes('my booking') ||
    lowerMessage.includes('reservation') ||
    lowerMessage.includes('ticket')
  ) {
    return { intent: 'check_bookings', confidence: 0.9 };
  }

  // Seat availability
  if (
    lowerMessage.includes('seat') ||
    lowerMessage.includes('available') ||
    lowerMessage.includes('vacancy') ||
    lowerMessage.includes('full')
  ) {
    return { intent: 'check_seats', confidence: 0.85 };
  }

  // Help/FAQ
  if (
    lowerMessage.includes('help') ||
    lowerMessage.includes('how') ||
    lowerMessage.includes('what') ||
    lowerMessage.includes('can you')
  ) {
    return { intent: 'help', confidence: 0.8 };
  }

  // Price inquiry
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('fare')) {
    return { intent: 'price_inquiry', confidence: 0.85 };
  }

  // Cancel booking
  if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) {
    return { intent: 'cancel_booking', confidence: 0.9 };
  }

  // Greeting
  if (
    lowerMessage.includes('hello') ||
    lowerMessage.includes('hi') ||
    lowerMessage.includes('hey') ||
    lowerMessage === 'greetings'
  ) {
    return { intent: 'greeting', confidence: 0.95 };
  }

  // Thank you
  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return { intent: 'thanks', confidence: 0.95 };
  }

  // Default - unknown intent
  return { intent: 'unknown', confidence: 0.3 };
};

/**
 * Generate response based on intent
 */
const generateResponse = async (intent: string, entities: any, userId?: mongoose.Types.ObjectId): Promise<string> => {
  switch (intent) {
    case 'search_trips':
      if (entities?.origin && entities?.destination) {
        // Try to find actual trips
        // Search in route names (simplified)
        const trips = await Trip.find().populate('route').limit(3).lean();

        if (trips.length > 0) {
          let response = `🚌 I found some trips:\n\n`;
          trips.slice(0, 3).forEach((trip: any, index) => {
            response += `${index + 1}. ${trip.route?.origin || 'N/A'} → ${trip.route?.destination || 'N/A'}\n`;
            response += `   💰 Price: $${trip.price || 'N/A'}\n`;
            response += `   🕐 Departure: ${trip.departureTime ? new Date(trip.departureTime).toLocaleString() : 'N/A'}\n`;
            response += `   💺 Available seats: ${trip.availableSeats || 0}\n\n`;
          });
          response += '\nWould you like to book any of these trips?';
          return response;
        }
      }

      return (
        '🔍 To search for trips, I need:\n' +
        '• Departure city (e.g., "Hanoi")\n' +
        '• Destination city (e.g., "Ho Chi Minh")\n' +
        '• Travel date (optional)\n\n' +
        'Example: "Search trips from Hanoi to Ho Chi Minh on 2025-12-01"'
      );

    case 'check_bookings':
      if (userId) {
        const bookings = await Booking.find({ user: userId }).populate('trip').sort('-createdAt').limit(5).lean();

        if (bookings.length > 0) {
          let response = `🎫 Your recent bookings:\n\n`;
          bookings.forEach((booking: any, index) => {
            response += `${index + 1}. Booking #${booking._id}\n`;
            response += `   Status: ${booking.status}\n`;
            response += `   Passengers: ${booking.passengers?.length || 0}\n`;
            response += `   Total: $${booking.totalPrice}\n\n`;
          });
          return response;
        } else {
          return "📭 You don't have any bookings yet. Would you like to search for trips?";
        }
      } else {
        return '🔐 Please log in to view your bookings. Guest users can check bookings using their booking confirmation email.';
      }

    case 'check_seats':
      return (
        '💺 To check seat availability:\n' +
        '1. First search for a trip\n' +
        "2. I'll show you available seats for each trip\n\n" +
        'Try: "Search trips from [city] to [city]"'
      );

    case 'help':
      return (
        '❓ **How I can help you:**\n\n' +
        '1️⃣ **Search trips**: Tell me your departure and destination\n' +
        '   Example: "Find buses from Hanoi to Hue"\n\n' +
        '2️⃣ **Check bookings**: Ask about your reservations\n' +
        '   Example: "Show my bookings"\n\n' +
        '3️⃣ **Seat availability**: Ask about available seats\n' +
        '   Example: "Are there seats available?"\n\n' +
        '4️⃣ **Pricing**: Inquire about ticket prices\n' +
        '   Example: "How much is a ticket?"\n\n' +
        'Just ask me anything!'
      );

    case 'price_inquiry':
      return (
        '💰 Ticket prices vary by:\n' +
        '• Route distance\n' +
        '• Bus type (standard, VIP, sleeper)\n' +
        '• Time of travel\n\n' +
        'Search for a specific trip to see exact pricing!'
      );

    case 'cancel_booking':
      return (
        '❌ **To cancel a booking:**\n' +
        '1. Go to "My Bookings" in your dashboard\n' +
        '2. Select the booking you want to cancel\n' +
        '3. Click "Cancel Booking"\n\n' +
        '⚠️ Cancellation policy applies. Refund depends on how far in advance you cancel.'
      );

    case 'greeting':
      return (
        '👋 Hello! Welcome back!\n\n' +
        'How can I assist you today? I can help you:\n' +
        '• Search for trips\n' +
        '• Check your bookings\n' +
        '• Answer questions about our service'
      );

    case 'thanks':
      return (
        "😊 You're welcome! Is there anything else I can help you with?\n\n" +
        'Feel free to ask me about:\n' +
        '• Finding trips\n' +
        '• Booking information\n' +
        '• Seat availability'
      );

    case 'unknown':
    default:
      return (
        "🤔 I'm not sure I understood that correctly.\n\n" +
        'I can help you with:\n' +
        '• Searching for bus trips\n' +
        '• Checking your bookings\n' +
        '• Answering questions about our service\n\n' +
        'Try asking: "Find trips from [city] to [city]" or type "help" for more options.'
      );
  }
};

/**
 * Process user message
 * @param {mongoose.Types.ObjectId} sessionId
 * @param {string} message
 * @param {mongoose.Types.ObjectId} userId - Optional user ID if authenticated
 * @returns {Promise<IChatSession>}
 */
const processMessage = async (
  sessionId: mongoose.Types.ObjectId,
  message: string,
  userId?: mongoose.Types.ObjectId
): Promise<IChatSession> => {
  const session = await ChatSession.findById(sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat session not found');
  }

  if (session.status === 'closed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chat session is closed');
  }

  // Detect intent
  const { intent, confidence, entities } = detectIntent(message);

  // Add user message
  const userMessage: IChatMessage = {
    sender: 'user',
    messageText: message,
    metadata: {
      intent,
      confidence,
      entities,
    },
    timestamp: new Date(),
  };
  session.messages.push(userMessage);

  // Generate bot response
  const responseText = await generateResponse(intent, entities, userId);

  // Add bot response
  const botMessage: IChatMessage = {
    sender: 'bot',
    messageText: responseText,
    metadata: {
      intent: `response_${intent}`,
      confidence: 1.0,
      actionTaken: intent,
    },
    timestamp: new Date(),
  };
  session.messages.push(botMessage);

  // Update context
  if (session.context) {
    session.context.userIntent = intent;
    if (entities) {
      session.context.searchParams = entities;
    }
  }

  await session.save();

  logger.info(`Message processed in session ${session.sessionId}: intent=${intent}, confidence=${confidence}`);

  return session;
};

/**
 * Close chat session
 * @param {mongoose.Types.ObjectId} sessionId
 * @returns {Promise<IChatSession>}
 */
const closeSession = async (sessionId: mongoose.Types.ObjectId): Promise<IChatSession> => {
  const session = await ChatSession.findById(sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat session not found');
  }

  session.status = 'closed';
  session.endedAt = new Date();

  // Add closing message
  session.messages.push({
    sender: 'bot',
    messageText: '👋 Thank you for chatting with us! Have a great trip! Feel free to start a new conversation anytime.',
    metadata: {
      intent: 'farewell',
      confidence: 1.0,
    },
    timestamp: new Date(),
  });

  await session.save();
  logger.info(`Chat session closed: ${session.sessionId}`);

  return session;
};

/**
 * Get user's chat sessions
 * @param {mongoose.Types.ObjectId} userId
 * @param {object} options
 * @returns {Promise<IChatSession[]>}
 */
const getUserSessions = async (userId: mongoose.Types.ObjectId, options: any = {}): Promise<IChatSession[]> => {
  const limit = options.limit || 10;
  const page = options.page || 1;
  const skip = (page - 1) * limit;

  const sessions = await ChatSession.find({ user: userId })
    .sort('-startedAt')
    .limit(limit)
    .skip(skip)
    .select('-messages'); // Don't include messages for list view

  return sessions;
};

export default {
  createSession,
  getSessionById,
  getSessionBySessionId,
  processMessage,
  closeSession,
  getUserSessions,
};
