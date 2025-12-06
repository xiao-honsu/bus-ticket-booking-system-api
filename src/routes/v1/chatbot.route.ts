import express, { Router } from 'express';
import validate from '../../middlewares/validate';
import chatbotValidation from '../../validations/chatbot.validation';
import chatbotController from '../../controllers/chatbot.controller';

const router: Router = express.Router();

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
