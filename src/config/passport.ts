import { Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import crypto from 'crypto';
import { Request } from 'express';
import config from './config';
import { tokenTypes } from './tokens';
import User from '../models/user.model';

// Extract JWT from both Authorization header and cookies
const jwtFromRequestExtractor = (req: Request) => {
  let token = null;

  // Try to get from Authorization header first
  if (req && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  // If not in header, try to get from httpOnly cookie
  if (!token && req && req.cookies) {
    token = req.cookies.accessToken;
  }

  return token;
};

const jwtStrategy = new JwtStrategy(
  {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: jwtFromRequestExtractor,
  },
  async (payload: any, done: any) => {
    try {
      if (payload.type !== tokenTypes.ACCESS) {
        throw new Error('Invalid token type');
      }
      const user = await User.findById(payload.sub);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
);

// Local Login Strategy
const localLoginStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: false,
  },
  async (email: string, password: string, done: (error: any, user?: Express.User | false, options?: any) => void) => {
    try {
      // Find user with password field
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return done(null, false, { message: 'Incorrect email or password' });
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return done(null, false, {
          message:
            'Account locked due to multiple failed login attempts. Please try again later or reset your password.',
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return done(null, false, { message: 'Account is suspended or deleted' });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return done(null, false, {
          message: 'Please verify your email before logging in. Check your inbox or request a new verification email.',
          emailNotVerified: true,
          email: user.email,
        });
      }

      // Check for OAuth-only accounts (no valid password set)
      if (user.oauthProviders && user.oauthProviders.length > 0) {
        // Check if password is a random hex (OAuth user)
        if (user.password.length === 64 && /^[a-f0-9]{64}$/.test(user.password)) {
          return done(null, false, {
            message: `This account uses ${user.oauthProviders[0].provider} sign-in. Please use the "Sign in with ${user.oauthProviders[0].provider}" button.`,
          });
        }
      }

      // Verify password
      const isPasswordMatch = await user.isPasswordMatch(password);

      if (!isPasswordMatch) {
        // Increment failed login attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await user.save();
        return done(null, false, { message: 'Incorrect email or password' });
      }

      // Successful login - reset failed attempts
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      user.lastLoginAt = new Date();
      await user.save();

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
);

// Local Register Strategy
const localRegisterStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  },
  async (req, email: string, password: string, done: any) => {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // If email exists but NOT verified, allow re-registration (will resend email in controller)
        if (!existingUser.isEmailVerified && existingUser.status === 'active') {
          return done(null, existingUser, {
            message: 'Email already registered but not verified. A new verification email will be sent.',
            isResend: true,
          });
        }

        // Email exists and already verified
        return done(null, false, { message: 'Email already taken. Please login instead.' });
      }

      // Create new user
      const user = await User.create({
        email,
        name: req.body.name,
        password,
        role: 'user',
        isEmailVerified: false,
        status: 'active',
        failedLoginAttempts: 0,
      });

      return done(null, user);
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors)
          .map((err: any) => err.message)
          .join(', ');
        return done(null, false, { message: messages });
      }
      return done(error, false);
    }
  }
);

// Only create Google strategy if credentials are configured
const googleStrategy =
  config.google.clientId &&
  config.google.clientSecret &&
  config.google.callbackUrl &&
  config.google.clientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE'
    ? new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
          // scope: ['profile', 'email'],
          // passReqToCallback: false,
        },
        async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
          try {
            console.log('Google OAuth - Profile received:', {
              id: profile.id,
              displayName: profile.displayName,
              emails: profile.emails,
            });

            const email = profile.emails?.[0]?.value;
            if (!email) {
              console.error('Google OAuth - No email in profile');
              return done(new Error('No email found in Google profile'), undefined);
            }

            let user = await User.findOne({ email });

            if (!user) {
              console.log('Google OAuth - Creating new user for:', email);
              // Create new user if doesn't exist
              user = await User.create({
                email,
                name: profile.displayName,
                role: 'user',
                isEmailVerified: true, // Google emails are verified
                password: crypto.randomBytes(32).toString('hex'), // Random secure password for OAuth users
                oauthProviders: [
                  {
                    provider: 'google',
                    providerId: profile.id,
                    providerData: {
                      displayName: profile.displayName,
                      photos: profile.photos,
                    },
                    connectedAt: new Date(),
                  },
                ],
              });
              console.log('Google OAuth - New user created:', user._id);
            } else {
              console.log('Google OAuth - Existing user found:', user._id);

              // Update OAuth provider info if not already present
              const hasGoogleProvider = user.oauthProviders?.some(
                (provider) => provider.provider === 'google' && provider.providerId === profile.id
              );

              if (!hasGoogleProvider) {
                user.oauthProviders = user.oauthProviders || [];
                user.oauthProviders.push({
                  provider: 'google',
                  providerId: profile.id,
                  providerData: {
                    displayName: profile.displayName,
                    photos: profile.photos,
                  },
                  connectedAt: new Date(),
                });
                await user.save();
              }
            }

            done(null, user);
          } catch (error) {
            console.error('Google OAuth - Error in googleVerify:', error);
            done(error as Error, undefined);
          }
        }
      )
    : null;

// Export strategies
export { localLoginStrategy, localRegisterStrategy, googleStrategy, jwtStrategy };
