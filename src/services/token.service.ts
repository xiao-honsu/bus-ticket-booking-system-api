import jwt from 'jsonwebtoken';
import { addDays, addMinutes } from 'date-fns';
import config from '../config/config';
import { tokenTypes } from '../config/tokens';
import Token from '../models/token.model';
import User from '../models/user.model';
import mongoose from 'mongoose';

/**
 * Generate token
 * @param {mongoose.Types.ObjectId} userId
 * @param {string} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (
  userId: mongoose.Types.ObjectId,
  expires: Date,
  type: string,
  secret: string = config.jwt.secret
): string => {
  const payload = {
    sub: userId.toString(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expires.getTime() / 1000),
    type,
  };
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
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<IToken>}
 */
const verifyToken = async (token: string, type: string) => {
  const payload = jwt.verify(token, config.jwt.secret) as any;
  const tokenDoc = await Token.findOne({ token, type, user: payload.sub, blacklisted: false });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (userId: mongoose.Types.ObjectId) => {
  const accessTokenExpires = addMinutes(new Date(), config.jwt.accessExpirationMinutes);
  const accessToken = generateToken(userId, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = addDays(new Date(), config.jwt.refreshExpirationDays);
  const refreshToken = generateToken(userId, refreshTokenExpires, tokenTypes.REFRESH);
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
