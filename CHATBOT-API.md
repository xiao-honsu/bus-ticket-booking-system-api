# Chatbot API Documentation

## Overview

The Chatbot feature provides an intent-based conversational interface for users to interact with the bus booking system. It can help with trip searches, booking inquiries, seat availability checks, and general customer support.

---

## Features

✅ **Intent Detection** - Automatically detects user intent from natural language  
✅ **Multi-Intent Support** - Handles 10+ different user intents  
✅ **Session Management** - Maintains conversation context  
✅ **Guest & Authenticated** - Works for both logged-in and guest users  
✅ **Real-Time Trip Search** - Connects to actual trip database  
✅ **Booking History** - Shows user's booking information  
✅ **Context Awareness** - Remembers conversation history

---

## API Endpoints

### 1. Create Chat Session

**POST** `/v1/chatbot/sessions`

Creates a new chat session. Works for both authenticated and guest users.

**Headers:**

```
Authorization: Bearer <token> (optional)
```

**Request Body:**

```json
{}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Chat session created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "sessionId": "chat-1732608000000-abc123xyz",
    "user": "507f1f77bcf86cd799439001", // null for guest users
    "status": "active",
    "context": {
      "language": "en",
      "metadata": {}
    },
    "messages": [
      {
        "sender": "bot",
        "messageText": "👋 Hello! I'm your bus booking assistant...",
        "metadata": {
          "intent": "welcome",
          "confidence": 1.0
        },
        "timestamp": "2025-11-26T10:00:00.000Z"
      }
    ],
    "startedAt": "2025-11-26T10:00:00.000Z"
  }
}
```

**Notes:**

- Returns a welcome message automatically
- `sessionId` is unique per session
- Store the session `id` for subsequent requests

---

### 2. Send Message

**POST** `/v1/chatbot/sessions/:sessionId/messages`

Sends a user message and receives bot response.

**Headers:**

```
Authorization: Bearer <token> (optional)
```

**Parameters:**

- `sessionId` (path) - Chat session ID (MongoDB ObjectId)

**Request Body:**

```json
{
  "message": "Find trips from Hanoi to Ho Chi Minh"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Message processed successfully",
  "data": {
    "sessionId": "chat-1732608000000-abc123xyz",
    "messages": [
      {
        "sender": "user",
        "messageText": "Find trips from Hanoi to Ho Chi Minh",
        "metadata": {
          "intent": "search_trips",
          "confidence": 0.85,
          "entities": {
            "origin": "Hanoi",
            "destination": "Ho Chi Minh"
          }
        },
        "timestamp": "2025-11-26T10:01:00.000Z"
      },
      {
        "sender": "bot",
        "messageText": "🚌 I found some trips:\n\n1. Hanoi → Ho Chi Minh\n   💰 Price: $45\n   🕐 Departure: ...",
        "metadata": {
          "intent": "response_search_trips",
          "confidence": 1.0,
          "actionTaken": "search_trips"
        },
        "timestamp": "2025-11-26T10:01:01.000Z"
      }
    ],
    "context": {
      "language": "en",
      "userIntent": "search_trips",
      "searchParams": {
        "origin": "Hanoi",
        "destination": "Ho Chi Minh"
      }
    }
  }
}
```

**Supported Intents:**

- `search_trips` - Find bus trips
- `check_bookings` - View booking history
- `check_seats` - Check seat availability
- `price_inquiry` - Ask about pricing
- `cancel_booking` - Cancellation info
- `help` - General help
- `greeting` - Say hello
- `thanks` - Express gratitude
- `unknown` - Fallback for unrecognized input

---

### 3. Get Chat Session

**GET** `/v1/chatbot/sessions/:sessionId`

Retrieves complete chat session with all messages.

**Parameters:**

- `sessionId` (path) - Chat session ID

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "sessionId": "chat-1732608000000-abc123xyz",
    "user": {
      "id": "507f1f77bcf86cd799439001",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "status": "active",
    "context": {
      "language": "en",
      "userIntent": "search_trips",
      "searchParams": {
        "origin": "Hanoi",
        "destination": "Ho Chi Minh"
      }
    },
    "messages": [
      /* Full message history */
    ],
    "startedAt": "2025-11-26T10:00:00.000Z"
  }
}
```

---

### 4. Close Chat Session

**POST** `/v1/chatbot/sessions/:sessionId/close`

Closes an active chat session.

**Parameters:**

- `sessionId` (path) - Chat session ID

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Chat session closed",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "status": "closed",
    "endedAt": "2025-11-26T10:30:00.000Z"
  }
}
```

**Notes:**

- Adds farewell message automatically
- Session can no longer receive new messages
- Chat history is preserved

---

### 5. Get User's Chat Sessions

**GET** `/v1/chatbot/my-sessions`

Get list of user's chat sessions (authenticated users only).

**Headers:**

```
Authorization: Bearer <token> (required)
```

**Query Parameters:**

- `limit` (optional) - Number of sessions per page (default: 10, max: 50)
- `page` (optional) - Page number (default: 1)

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "sessionId": "chat-1732608000000-abc123xyz",
      "status": "closed",
      "startedAt": "2025-11-26T10:00:00.000Z",
      "endedAt": "2025-11-26T10:30:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "sessionId": "chat-1732608100000-def456uvw",
      "status": "active",
      "startedAt": "2025-11-26T11:00:00.000Z"
    }
  ]
}
```

**Notes:**

- Messages are excluded for performance (use Get Session endpoint for full details)
- Sorted by most recent first

---

## Intent Detection Examples

### Search Trips Intent

**User Messages:**

- "Find trips from Hanoi to Ho Chi Minh"
- "Search buses from Da Nang to Hue"
- "Show me trips to Saigon"
- "I want to go from Hanoi to Hue on 2025-12-01"

**Bot Response:**
Shows up to 3 matching trips with:

- Route information
- Price
- Departure time
- Available seats

---

### Check Bookings Intent

**User Messages:**

- "Show my bookings"
- "View my reservations"
- "Do I have any tickets?"
- "My booking history"

**Bot Response (Authenticated):**
Lists user's recent bookings with:

- Booking ID
- Status
- Number of passengers
- Total price

**Bot Response (Guest):**
Prompts user to log in

---

### Check Seats Intent

**User Messages:**

- "Are seats available?"
- "Check seat availability"
- "How many seats left?"
- "Is the bus full?"

**Bot Response:**
Guides user to search for a specific trip first

---

### Help Intent

**User Messages:**

- "Help"
- "What can you do?"
- "How do I book?"
- "Can you help me?"

**Bot Response:**
Shows comprehensive help menu with:

- Available features
- Example queries
- Usage instructions

---

### Price Inquiry Intent

**User Messages:**

- "How much does it cost?"
- "What's the price?"
- "Ticket fare?"
- "How expensive is it?"

**Bot Response:**
Explains pricing factors and suggests searching specific trips

---

### Greeting Intent

**User Messages:**

- "Hello"
- "Hi"
- "Hey"
- "Good morning"

**Bot Response:**
Friendly greeting with service overview

---

### Thanks Intent

**User Messages:**

- "Thank you"
- "Thanks"
- "Appreciate it"

**Bot Response:**
Polite acknowledgment and offer for further assistance

---

## Integration Guide

### Frontend Implementation (React/Next.js Example)

```typescript
// 1. Create a chat session
const createChatSession = async () => {
  const response = await fetch('/api/v1/chatbot/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Include auth token if user is logged in
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  const data = await response.json();
  const sessionId = data.data.id;

  // Store sessionId in component state
  setSessionId(sessionId);
  setMessages(data.data.messages);
};

// 2. Send a message
const sendMessage = async (messageText: string) => {
  const response = await fetch(`/api/v1/chatbot/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: messageText }),
  });

  const data = await response.json();

  // Append new messages (user + bot response)
  setMessages((prev) => [...prev, ...data.data.messages]);
};

// 3. Close session when user leaves chat
const closeSession = async () => {
  await fetch(`/api/v1/chatbot/sessions/${sessionId}/close`, {
    method: 'POST',
  });
};
```

### UI Component Structure

```jsx
<ChatInterface>
  <ChatHeader>
    <Title>Bus Booking Assistant</Title>
    <CloseButton onClick={closeSession} />
  </ChatHeader>

  <MessageList>
    {messages.map((msg, index) => (
      <Message key={index} sender={msg.sender} text={msg.messageText} timestamp={msg.timestamp} />
    ))}
  </MessageList>

  <InputBox>
    <TextInput
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onEnter={sendMessage}
      placeholder="Type your message..."
    />
    <SendButton onClick={() => sendMessage(input)} />
  </InputBox>
</ChatInterface>
```

---

## Entity Extraction

The chatbot performs basic entity extraction:

### Location Entities (Origin/Destination)

Pattern: `from [CITY] to [CITY]`

**Example:**

```
User: "Find trips from Hanoi to Ho Chi Minh"
Extracted: {
  origin: "Hanoi",
  destination: "Ho Chi Minh"
}
```

### Date Entities

Patterns:

- `YYYY-MM-DD` (e.g., "2025-12-01")
- `DD/MM/YYYY` (e.g., "01/12/2025")

**Example:**

```
User: "Search trips on 2025-12-01"
Extracted: {
  date: "2025-12-01"
}
```

---

## Context Management

Each chat session maintains context:

```typescript
interface IChatContext {
  language: string; // User's language preference
  currentBookingId?: ObjectId; // Active booking being discussed
  searchParams?: any; // Last search parameters
  userIntent?: string; // Last detected intent
  metadata?: any; // Additional context data
}
```

**Usage:**

- Remembers user's last search
- Maintains conversation flow
- Provides personalized responses

---

## Best Practices

### For Frontend Developers

1. **Session Management**
   - Create session when chat opens
   - Store sessionId in component state
   - Close session when user leaves chat

2. **Message Display**
   - Show typing indicator while waiting for response
   - Format bot messages with proper line breaks
   - Display timestamps for better UX

3. **Error Handling**
   - Handle network errors gracefully
   - Show retry option if request fails
   - Validate user input before sending

4. **User Experience**
   - Auto-scroll to latest message
   - Show "bot is typing" animation
   - Provide quick action buttons for common queries

### For Backend Developers

1. **Performance**
   - Limit messages per session (100 max)
   - Use pagination for session lists
   - Index frequently queried fields

2. **Scalability**
   - Consider caching trip search results
   - Implement rate limiting for chat endpoints
   - Monitor session creation rate

3. **Monitoring**
   - Log intent detection accuracy
   - Track unrecognized intents
   - Monitor session duration

---

## Advanced Features (Future Enhancements)

### Potential Improvements

1. **LLM Integration**
   - Replace rule-based intent detection with GPT/Claude
   - More natural conversation flow
   - Better entity extraction

2. **Multi-Language Support**
   - Detect user language automatically
   - Provide responses in Vietnamese, English, etc.
   - Translate trip information

3. **Booking via Chat**
   - Complete booking process in chat
   - Payment integration
   - Seat selection interface

4. **Smart Suggestions**
   - Recommend popular routes
   - Suggest alternative dates
   - Show nearby pickup points

5. **Voice Support**
   - Speech-to-text input
   - Text-to-speech responses
   - Voice commands

---

## Error Codes

| Status Code | Error Message                            | Description                            |
| ----------- | ---------------------------------------- | -------------------------------------- |
| 404         | Chat session not found                   | Invalid session ID                     |
| 400         | Chat session is closed                   | Attempting to message closed session   |
| 400         | Maximum 100 messages per session allowed | Session message limit reached          |
| 401         | Unauthorized                             | Auth token required for `/my-sessions` |

---

## Performance Metrics

### Response Times (Target)

- Session creation: < 500ms
- Message processing: < 1s
- Intent detection: < 100ms
- Session retrieval: < 300ms

### Database Queries

- Session creation: 1 write
- Send message: 1 read + 1 write + 0-2 reads (for trip/booking data)
- Get session: 1 read
- Close session: 1 read + 1 write

---

## Testing

### Manual Testing Checklist

- [ ] Create session as guest user
- [ ] Create session as authenticated user
- [ ] Send search query and verify intent detection
- [ ] Check booking history (authenticated)
- [ ] Test all 10+ intents
- [ ] Close session successfully
- [ ] Retrieve session history
- [ ] Verify entity extraction works
- [ ] Test with malformed input
- [ ] Verify 100-message limit

### Example Test Queries

```
// Trip search
"Find buses from Hanoi to Ho Chi Minh"
"Search trips from Da Nang to Hue on 2025-12-01"

// Bookings
"Show my bookings"
"Do I have any reservations?"

// Seats
"Are there available seats?"
"Is the bus full?"

// Help
"Help"
"What can you do?"

// Greeting
"Hello"
"Hi there"

// Edge cases
"" (empty message - should be rejected)
"asdfghjkl" (gibberish - should respond with unknown intent)
```

---

## Security Considerations

1. **Input Validation**
   - Message length limited to 1000 characters
   - XSS protection (sanitize HTML)
   - SQL injection prevention (using Mongoose)

2. **Rate Limiting**
   - Recommended: 30 messages per minute per session
   - Prevent spam and abuse

3. **Authentication**
   - Optional for basic chat
   - Required for booking history
   - Required for session listing

4. **Data Privacy**
   - Don't log sensitive information
   - Anonymize guest user data
   - GDPR compliance for chat history

---

**Last Updated:** 2025-11-26  
**Version:** 1.0.0  
**Status:** Production Ready ✅
