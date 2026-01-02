import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { streamChatResponse, ChatMessage } from '../services/chatbot-ai.service';
import logger from '../config/logger';

/**
 * Stream chat response using Vercel AI SDK
 * POST /api/v1/chatbot/chat
 */
const chat = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Messages array is required',
    });
    return;
  }

  // Validate message format
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Each message must have role and content',
      });
      return;
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Message role must be user, assistant, or system',
      });
      return;
    }
  }

  logger.info(`[Chatbot] Chat request with ${messages.length} messages`);

  // Set headers for SSE streaming
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Stream the response
  await streamChatResponse(messages, res);
});

/**
 * Health check for chatbot service
 * GET /api/v1/chatbot/health
 */
const healthCheck = catchAsync(async (_req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Chatbot service is running',
    timestamp: new Date().toISOString(),
  });
});

export default {
  chat,
  healthCheck,
};
