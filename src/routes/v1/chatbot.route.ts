import express, { Router } from 'express';
import validate from '../../middlewares/validate';
import chatbotValidation from '../../validations/chatbot.validation';
import chatbotController from '../../controllers/chatbot.controller';
import chatbotAIController from '../../controllers/chatbot-ai.controller';

const router: Router = express.Router();

// ============================================
// NEW AI-POWERED CHAT ENDPOINT (Vercel AI SDK)
// ============================================

/**
 * POST /api/v1/chatbot/chat
 * Stream chat response using Gemini + Vercel AI SDK
 * Body: { messages: [{ role: 'user' | 'assistant', content: string }] }
 */
router.route('/chat').post(chatbotAIController.chat);

/**
 * GET /api/v1/chatbot/health
 * Health check for chatbot service
 */
router.route('/health').get(chatbotAIController.healthCheck);

// ============================================
// LEGACY SESSION-BASED ENDPOINTS (kept for compatibility)
// ============================================

router.route('/sessions').post(validate(chatbotValidation.createSession), chatbotController.createSession);

router.route('/sessions/:sessionId').get(validate(chatbotValidation.getSession), chatbotController.getSession);

router
  .route('/sessions/:sessionId/messages')
  .post(validate(chatbotValidation.sendMessage), chatbotController.sendMessage);

router
  .route('/sessions/:sessionId/close')
  .post(validate(chatbotValidation.closeSession), chatbotController.closeSession);

// Authenticated users can view their session history
router.route('/my-sessions').get(validate(chatbotValidation.getUserSessions), chatbotController.getUserSessions);

export default router;
