import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import passport from 'passport';
import httpStatus from 'http-status';
import compression from 'compression';
import cookieParser from 'cookie-parser';
// import mongoSanitize from '@exortek/express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';
import config from './config/config';
import { swaggerSpec } from './config/swagger';
import { successHandler, errorHandler } from './config/morgan';
import { jwtStrategy, googleStrategy, localLoginStrategy, localRegisterStrategy } from './config/passport';
import { generalLimiter } from './middlewares/rateLimiter';
import { errorConverter, errorHandler as customErrorHandler } from './middlewares/error';
import ApiError from './utils/ApiError';
import routes from './routes/v1';

// add example comment to test commit hook
const app: Express = express();

// set security HTTP headers
app.use(helmet());

// enable cors
app.use(
  cors({
    origin: config.frontendUrl, // Allow frontend origin
    credentials: true, // Allow credentials (cookies, authorization headers)
  })
);

// parse cookies
app.use(cookieParser());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
// Note: We preserve JWT tokens in query strings by sanitizing them separately
// JWT tokens contain dots (header.payload.signature) which must not be replaced
// app.use((req, _res, next) => {
//   // Save original token if it exists
//   const originalToken = req.query.token;

//   // Apply mongo sanitization
//   mongoSanitize({ replaceWith: '_' })(req, _res, () => {
//     // Restore original token after sanitization
//     if (originalToken) {
//       req.query.token = originalToken;
//     }
//     next();
//   });
// });

// gzip compression
app.use(compression());

// jwt authentication
app.use(passport.initialize());
passport.use('local-login', localLoginStrategy);
passport.use('local-register', localRegisterStrategy);
passport.use('jwt', jwtStrategy);
if (googleStrategy) {
  passport.use('google', googleStrategy);
}

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/api/v1/auth', generalLimiter);
}

// morgan logging
app.use(successHandler);
app.use(errorHandler);

// health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// Swagger API documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Bus Ticket Booking API Docs',
  })
);

// Swagger JSON endpoint
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// v1 api routes
app.use('/api/v1', routes);

// send back a 404 error for any unknown api request
app.use((_req, _res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(customErrorHandler);

export default app;
