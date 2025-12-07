import httpStatus from 'http-status';
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import catchAsync from '../utils/catchAsync';
import { authService, userService, tokenService, emailService } from '../services';
import config from '../config/config';
import ApiError from '@/utils/ApiError';
import { IUser } from '@/models/user.model';

const logout = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  // Only clear refreshToken cookie (accessToken is in memory on client)
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
  });

  res.json({
    code: httpStatus.OK,
    message: 'Logout successful',
    data: {},
  });
});

const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  // Get refresh token from httpOnly cookie (preferred) or body (fallback)
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token not found');
  }

  const tokens = await authService.refreshAuth(refreshToken);

  // Only update refreshToken in httpOnly cookie
  // accessToken is returned in response body for client-side memory storage
  res.cookie('refreshToken', tokens.refresh.token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.json({
    code: httpStatus.OK,
    message: 'Tokens refreshed successfully',
    data: { tokens },
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.json({
    code: httpStatus.OK,
    message: 'Password reset email sent. Please check your inbox.',
    data: {},
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const rawToken = req.query.token as string;
  console.log('=== EMAIL VERIFICATION DEBUG ===');
  console.log('1. Raw token from query:', rawToken);
  console.log('2. Token length:', rawToken?.length);
  console.log('3. Contains dots:', rawToken?.includes('.'));
  console.log('4. Contains underscores:', rawToken?.includes('_'));

  // Decode URL-encoded token (handles +, /, = and other special chars)
  const decodedToken = decodeURIComponent(rawToken);
  console.log('5. After decodeURIComponent:', decodedToken);

  // Split and validate JWT structure
  const parts = decodedToken.split('.');
  console.log('7. JWT parts count:', parts.length);
  if (parts.length === 3) {
    console.log('8. Header length:', parts[0]?.length);
    console.log('9. Payload length:', parts[1]?.length);
    console.log('10. Signature length:', parts[2]?.length);
  }

  console.log('================================');

  await authService.resetPassword(decodedToken, req.body.password);
  res.json({
    code: httpStatus.OK,
    message: 'Password reset successful. You can now login with your new password.',
    data: {},
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const rawToken = req.query.token as string;
  console.log('=== EMAIL VERIFICATION DEBUG ===');
  console.log('1. Raw token from query:', rawToken);
  console.log('2. Token length:', rawToken?.length);
  console.log('3. Contains dots:', rawToken?.includes('.'));
  console.log('4. Contains underscores:', rawToken?.includes('_'));

  // Decode URL-encoded token (handles +, /, = and other special chars)
  const decodedToken = decodeURIComponent(rawToken);
  console.log('5. After decodeURIComponent:', decodedToken);

  // Split and validate JWT structure
  const parts = decodedToken.split('.');
  console.log('7. JWT parts count:', parts.length);
  if (parts.length === 3) {
    console.log('8. Header length:', parts[0]?.length);
    console.log('9. Payload length:', parts[1]?.length);
    console.log('10. Signature length:', parts[2]?.length);
  }

  console.log('================================');

  await authService.verifyEmail(decodedToken);
  res.json({
    code: httpStatus.OK,
    message: 'Email verified successfully. You can now login.',
    data: {},
  });
});

const getCurrentUser = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUser;
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  res.json({
    code: httpStatus.OK,
    message: 'User retrieved successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
      },
    },
  });
});

const googleCallback = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUser;
  if (!user) {
    return res.redirect(`${config.frontendUrl}/auth/login?error=oauth_no_user`);
  }
  const tokens = await tokenService.generateAuthTokens(user._id);

  // Redirect to frontend with tokens in URL (will be extracted and stored in cookies)
  const redirectUrl = `${config.frontendUrl}/auth/callback?token=${tokens.access.token}&refreshToken=${tokens.refresh.token}`;
  res.redirect(redirectUrl);
});

// New Passport-based registration controller
const registerWithPassport = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('local-register', { session: false }, async (err: any, user: any, info: any) => {
    console.log('User registered successfully:', user);
    if (err) {
      return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Registration failed'));
    }
    if (!user) {
      return next(new ApiError(httpStatus.BAD_REQUEST, info?.message || 'Registration failed'));
    }

    try {
      // Check if this is a resend scenario (email exists but not verified)
      const isResend = info?.isResend === true;

      // Generate verification token
      const verifyEmailToken = await tokenService.generateVerifyEmailToken(user._id);

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verifyEmailToken);

      return res.status(isResend ? httpStatus.OK : httpStatus.CREATED).json({
        code: isResend ? httpStatus.OK : httpStatus.CREATED,
        message: isResend
          ? 'A new verification email has been sent. Please check your inbox.'
          : 'Registration successful. Please check your email to verify your account.',
        isResend,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          isResend,
        },
      });
    } catch {
      // User created but email failed - still return success but with warning
      return res.status(httpStatus.CREATED).json({
        code: httpStatus.CREATED,
        message: 'Registration successful but verification email could not be sent. Please contact support.',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
        },
      });
    }
  })(req, res, next);
};

// New Passport-based login controller
const loginWithPassport = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('local-login', { session: false }, async (err: any, user: any, info: any) => {
    if (err) {
      return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Login failed'));
    }
    if (!user) {
      // Special handling for unverified email
      if (info?.emailNotVerified) {
        return res.status(httpStatus.FORBIDDEN).json({
          message: info.message,
          code: httpStatus.FORBIDDEN,
          data: {
            emailNotVerified: true,
            email: info.email,
            hint: 'Use POST /api/v1/auth/resend-verification-email to get a new verification link.',
          },
        });
      }
      return next(new ApiError(httpStatus.UNAUTHORIZED, info?.message || 'Invalid credentials'));
    }

    try {
      // Generate tokens
      const tokens = await tokenService.generateAuthTokens(user._id);

      // Only set refreshToken in httpOnly cookie
      // accessToken is returned in response body (stored in memory on client)
      res.cookie('refreshToken', tokens.refresh.token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.json({
        code: httpStatus.OK,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          tokens,
        },
      });
    } catch (tokenError: any) {
      return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, tokenError.message || 'Token generation failed'));
    }
  })(req, res, next);
};

// Updated Google OAuth callback with httpOnly cookies
const googleCallbackWithCookies = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUser;
  if (!user) {
    return res.redirect(`${config.frontendUrl}/auth/login?error=oauth_no_user`);
  }
  const tokens = await tokenService.generateAuthTokens(user._id);

  // Only set refreshToken in httpOnly cookie
  res.cookie('refreshToken', tokens.refresh.token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Redirect with accessToken in URL (will be stored in memory)
  res.redirect(`${config.frontendUrl}/auth/callback?success=true&token=${tokens.access.token}`);
});

// Resend verification email
const resendVerificationEmail = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  // Find user by email
  const user = await userService.getUserByEmail(email);

  if (!user) {
    // Don't reveal if email exists or not (security best practice)
    return res.status(httpStatus.OK).json({
      code: httpStatus.OK,
      message: 'If an account with that email exists and is not verified, a verification email has been sent.',
      data: {},
    });
  }

  // Check if already verified
  if (user.isEmailVerified) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: 'Email is already verified. You can log in now.',
    });
  }

  // Check if account is active
  if (user.status !== 'active') {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: 'Account is suspended or deleted. Please contact support.',
    });
  }

  try {
    // Generate new verification token
    const verifyEmailToken = await tokenService.generateVerifyEmailToken(user._id);

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verifyEmailToken);

    return res.status(httpStatus.OK).json({
      code: httpStatus.OK,
      message: 'Verification email sent successfully. Please check your inbox.',
      data: {},
    });
  } catch {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to send verification email. Please try again later.',
    });
  }
});

const authController = {
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getCurrentUser,
  googleCallback,
  registerWithPassport,
  loginWithPassport,
  googleCallbackWithCookies,
  resendVerificationEmail,
};

export default authController;
