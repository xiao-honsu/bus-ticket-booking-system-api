import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';

// Load .env from project root (where package.json is located)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_SECURE: Joi.boolean().default(false).description('true for 465 (SSL), false for 587 (TLS)'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    PAYMENT_GATEWAY_URL: Joi.string().description('payment gateway URL'),
    PAYMENT_SECRET_KEY: Joi.string().description('payment secret key'),
    PAYOS_CLIENT_ID: Joi.string().description('PayOS client ID'),
    PAYOS_API_KEY: Joi.string().description('PayOS API key'),
    PAYOS_CHECKSUM_KEY: Joi.string().description('PayOS checksum key'),
    FRONTEND_URL: Joi.string().default('http://localhost:3000').description('Frontend URL for payment redirects'),
    CLIENT_URL: Joi.string().default('http://localhost:3000').description('Client URL for email links'),
    SUPPORT_PHONE: Joi.string().default('+1-234-567-8900').description('Support phone number'),
    SUPPORT_EMAIL: Joi.string().default('support@example.com').description('Support email address'),
    GOOGLE_CLIENT_ID: Joi.string().description('Google OAuth client ID'),
    GOOGLE_CLIENT_SECRET: Joi.string().description('Google OAuth client secret'),
    GOOGLE_CALLBACK_URL: Joi.string().description('Google OAuth callback URL'),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'verbose', 'debug').default('info'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  env: envVars.NODE_ENV as 'production' | 'development' | 'test',
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      // useCreateIndex: true,
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      secure: envVars.SMTP_SECURE, // true for 465 (SSL), false for 587 (TLS)
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  payment: {
    gatewayUrl: envVars.PAYMENT_GATEWAY_URL,
    secretKey: envVars.PAYMENT_SECRET_KEY,
  },
  payos: {
    clientId: envVars.PAYOS_CLIENT_ID,
    apiKey: envVars.PAYOS_API_KEY,
    checksumKey: envVars.PAYOS_CHECKSUM_KEY,
  },
  frontendUrl: envVars.FRONTEND_URL,
  clientUrl: envVars.CLIENT_URL,
  supportPhone: envVars.SUPPORT_PHONE,
  supportEmail: envVars.SUPPORT_EMAIL,
  google: {
    clientId: envVars.GOOGLE_CLIENT_ID,
    clientSecret: envVars.GOOGLE_CLIENT_SECRET,
    callbackUrl: envVars.GOOGLE_CALLBACK_URL,
  },
  logging: {
    level: envVars.LOG_LEVEL,
  },
};
