import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import config from './config';
import { tokenTypes } from './tokens';
import User from '../models/user.model';

const jwtOptions: StrategyOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload: any, done: any) => {
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
};

export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

const googleVerify = async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
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
        password: 'GOOGLE_AUTH', // Placeholder, won't be used
      });
      console.log('Google OAuth - New user created:', user._id);
    } else {
      console.log('Google OAuth - Existing user found:', user._id);
    }

    done(null, user);
  } catch (error) {
    console.error('Google OAuth - Error in googleVerify:', error);
    done(error as Error, undefined);
  }
};

// Only create Google strategy if credentials are configured
export const googleStrategy =
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
        googleVerify
      )
    : null;
