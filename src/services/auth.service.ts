import httpStatus from 'http-status';
import tokenService from './token.service';
import userService from './user.service';
import Token from '../models/token.model';
import ApiError from '../utils/ApiError';
import { tokenTypes } from '../config/tokens';
import { IUser } from '../models/user.model';
import mongoose from 'mongoose';
import logger from '../config/logger';

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<IUser>}
 */
const loginUserWithEmailAndPassword = async (email: string, password: string): Promise<IUser> => {
  const user = await userService.getUserByEmail(email, true); // Include password for authentication
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
const logout = async (refreshToken: string): Promise<void> => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.deleteOne();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken: string) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(new mongoose.Types.ObjectId(refreshTokenDoc.user));
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.deleteOne();
    return tokenService.generateAuthTokens(user._id);
  } catch (error: any) {
    throw new ApiError(httpStatus.UNAUTHORIZED, error.message || 'Please authenticate again');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const resetPassword = async (resetPasswordToken: string, newPassword: string): Promise<void> => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(new mongoose.Types.ObjectId(resetPasswordTokenDoc.user));
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    await userService.updateUserById(user._id, { password: newPassword });
    await Token.deleteMany({ user: user._id });
  } catch (error: any) {
    // Provide specific error messages based on the error type
    if (error.message.includes('Invalid token') || error.message.includes('jwt malformed')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid reset token. Please request a new password reset.');
    }
    if (error.message.includes('expired')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Reset token has expired. Please request a new password reset.');
    }
    if (error.message.includes('not found in database') || error.message.includes('revoked')) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Reset token not found or already used. Please request a new password reset.'
      );
    }
    if (error.message.includes('User not found')) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User account not found');
    }

    // If it's already an ApiError, rethrow it
    if (error instanceof ApiError) {
      throw error;
    }

    // Generic fallback
    throw new ApiError(httpStatus.UNAUTHORIZED, error.message || 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise<void>}
 */
const verifyEmail = async (verifyEmailToken: string): Promise<void> => {
  try {
    logger.info('Verifying token type: %s', tokenTypes.VERIFY_EMAIL);

    // Verify and get token from database
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    logger.info('Token verified, user ID: %s', verifyEmailTokenDoc.user);

    // Get user
    const user = await userService.getUserById(new mongoose.Types.ObjectId(verifyEmailTokenDoc.user));

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (user.isEmailVerified) {
      // Already verified, just return success (idempotent)
      logger.info('Email already verified for user: %s', user.email);
      return;
    }

    // Delete all verification tokens for this user
    await Token.deleteMany({ user: user._id, type: tokenTypes.VERIFY_EMAIL });

    // Mark email as verified
    await userService.updateUserById(user._id, { isEmailVerified: true });

    logger.info('Email verified successfully for user: %s', user.email);
  } catch (error: any) {
    logger.error('Email verification error: %s', error.message);

    // Provide more specific error messages
    if (error.message.includes('Invalid token') || error.message.includes('jwt malformed')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid verification token. Please request a new one.');
    }
    if (error.message.includes('expired')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Verification token has expired. Please request a new one.');
    }
    if (error.message.includes('not found')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Verification token not found or already used.');
    }

    throw new ApiError(httpStatus.UNAUTHORIZED, error.message || 'Email verification failed');
  }
};

export default {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
};
