import express from 'express';
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import validate from '../../middlewares/validate';
import authValidation from '../../validations/auth.validation';
import authController from '../../controllers/auth.controller';
import { authLimiter } from '../../middlewares/rateLimiter';
import config from '../../config/config';

const router = express.Router();

router.post('/register', authLimiter, validate(authValidation.register), authController.register);
router.post('/login', authLimiter, validate(authValidation.login), authController.login);
router.post('/logout', validate(authValidation.logout), authController.logout);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);
router.post('/verify-email', validate(authValidation.verifyEmail), authController.verifyEmail);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    accessType: 'offline',
    prompt: 'consent',
  })
);

router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
  // FIX: Decode authorization code if it's URL-encoded
  // Google trả về code bị encode (%2F thay vì /), cần decode trước khi gửi lên Google
  if (req.query.code && typeof req.query.code === 'string') {
    console.log('Raw code:', req.query.code);
    req.query.code = decodeURIComponent(req.query.code);
    console.log('Decoded code:', req.query.code);
  }

  passport.authenticate(
    'google',
    {
      session: false,
      failureRedirect: `${config.frontendUrl}/auth/login?error=oauth_failed`,
    },
    async (err: any, user: any, info: any) => {
      if (err) {
        console.error('Google OAuth error:', err);
        return res.redirect(
          `${config.frontendUrl}/auth/login?error=oauth_error&message=${encodeURIComponent(err.message || 'Authentication failed')}`
        );
      }

      if (!user) {
        console.error('Google OAuth - no user returned:', info);
        return res.redirect(`${config.frontendUrl}/auth/login?error=oauth_no_user`);
      }

      // User authenticated successfully, call controller
      req.user = user;
      return authController.googleCallback(req, res, next);
    }
  )(req, res, next);
});

export default router;
