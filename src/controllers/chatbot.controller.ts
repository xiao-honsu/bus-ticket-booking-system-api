import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import chatbotService from '../services/chatbot.service';
import pick from '../utils/pick';

/**
 * Create a new chat session
 */
const createSession = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)?._id;
  const session = await chatbotService.createSession(userId);

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Chat session created successfully',
    data: session,
  });
});

/**
 * Get chat session by ID
 */
const getSession = catchAsync(async (req: Request, res: Response) => {
  const session = await chatbotService.getSessionById(new mongoose.Types.ObjectId(req.params.sessionId));

  res.status(httpStatus.OK).json({
    success: true,
    data: session,
  });
});

/**
 * Send message to chat session
 */
const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { message } = req.body;
  const userId = (req.user as any)?._id;
  const sessionId = new mongoose.Types.ObjectId(req.params.sessionId);

  const session = await chatbotService.processMessage(sessionId, message, userId);

  // Return only the last two messages (user + bot response)
  const recentMessages = session.messages.slice(-2);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Message processed successfully',
    data: {
      sessionId: session.sessionId,
      messages: recentMessages,
      context: session.context,
    },
  });
});

/**
 * Close chat session
 */
const closeSession = catchAsync(async (req: Request, res: Response) => {
  const session = await chatbotService.closeSession(new mongoose.Types.ObjectId(req.params.sessionId));

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Chat session closed',
    data: session,
  });
});

/**
 * Get user's chat sessions
 */
const getUserSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const queryOptions = pick(req.query, ['limit', 'page']);

  const options: any = {
    limit: queryOptions.limit ? parseInt(queryOptions.limit as string) : 10,
    page: queryOptions.page ? parseInt(queryOptions.page as string) : 1,
  };

  const sessions = await chatbotService.getUserSessions(userId, options);

  res.status(httpStatus.OK).json({
    success: true,
    data: sessions,
  });
});

export default {
  createSession,
  getSession,
  sendMessage,
  closeSession,
  getUserSessions,
};
