import jwt from 'jsonwebtoken';
import { addDays, addMinutes } from 'date-fns';
import config from '../config/config';
import { tokenTypes } from '../config/tokens';
import Token from '../models/token.model';
import User from '../models/user.model';
import logger from '../config/logger';
import mongoose from 'mongoose';

/**
 * Generate token
 * @param {mongoose.Types.ObjectId} userId
 * @param {string} expires
 * @param {string} type
 * @param {string} role - User role (admin, operator, user)
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (
  userId: mongoose.Types.ObjectId,
  expires: Date,
  type: string,
  role?: string,
  secret: string = config.jwt.secret
): string => {
  const payload: any = {
    sub: userId.toString(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expires.getTime() / 1000),
    type,
  };

  // Add role to payload if provided (for access and refresh tokens)
  if (role) {
    payload.role = role;
  }

  return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {mongoose.Types.ObjectId} userId
 * @param {Date} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<IToken>}
 */
const saveToken = async (
  token: string,
  userId: mongoose.Types.ObjectId,
  expires: Date,
  type: string,
  blacklisted: boolean = false
) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires,
    type,
    blacklisted,
  });
  logger.info('Saved token: %o', tokenDoc);
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<IToken>}
 */
const verifyToken = async (token: string, type: string) => {
  try {
    // Verify JWT signature and expiration
    const payload = jwt.verify(token, config.jwt.secret) as any;

    // Find token in database
    const tokenDoc = await Token.findOne({ token, type, user: payload.sub, blacklisted: false });

    if (!tokenDoc) {
      // Check if token exists with different criteria
      const anyToken = await Token.findOne({ user: payload.sub, type });
      logger.info('Any token for user with type: %s', !!anyToken);

      if (anyToken) {
        logger.info('Found token in DB but mismatch:');
        logger.info('- DB token (first 50 chars): %s', anyToken.token.substring(0, 50));
        logger.info('- Request token (first 50 chars): %s', token.substring(0, 50));
        logger.info('- Tokens match: %s', anyToken.token === token);
      }

      throw new Error('Token not found in database or has been revoked');
    }

    return tokenDoc;
  } catch (error: any) {
    // Enhanced error messages for debugging
    if (error.name === 'JsonWebTokenError') {
      throw new Error(`Invalid token: ${error.message}`);
    }
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    throw error;
  }
};

/**
 * Generate auth tokens
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (userId: mongoose.Types.ObjectId) => {
  // Fetch user to get role
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const userRole = user.role;

  const accessTokenExpires = addMinutes(new Date(), config.jwt.accessExpirationMinutes);
  const accessToken = generateToken(userId, accessTokenExpires, tokenTypes.ACCESS, userRole);

  const refreshTokenExpires = addDays(new Date(), config.jwt.refreshExpirationDays);
  const refreshToken = generateToken(userId, refreshTokenExpires, tokenTypes.REFRESH, userRole);
  await saveToken(refreshToken, userId, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toISOString(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toISOString(),
    },
  };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('No users found with this email');
  }

  // Delete old reset password tokens before creating new one
  await Token.deleteMany({ user: user._id, type: tokenTypes.RESET_PASSWORD });

  const expires = addMinutes(new Date(), config.jwt.resetPasswordExpirationMinutes);
  const resetPasswordToken = generateToken(user._id, expires, tokenTypes.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user._id, expires, tokenTypes.RESET_PASSWORD);
  return resetPasswordToken;
};

/**
 * Generate verify email token
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (userId: mongoose.Types.ObjectId) => {
  // Delete old verify email tokens before creating new one
  await Token.deleteMany({ user: userId, type: tokenTypes.VERIFY_EMAIL });

  const expires = addMinutes(new Date(), config.jwt.verifyEmailExpirationMinutes);
  const verifyEmailToken = generateToken(userId, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, userId, expires, tokenTypes.VERIFY_EMAIL);
  return verifyEmailToken;
};

export default {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
};
