import express from 'express';
import authRoute from './auth.route';
import userRoute from './user.route';
import busRoute from './bus.route';
import routeRoute from './route.route';
import tripRoute from './trip.route';
import bookingRoute from './booking.route';
import operatorRoute from './operator.route';
import reviewRoute from './review.route';
import paymentRoute from './payment.route';
import seatLockRoute from './seatlock.route';
import chatbotRoute from './chatbot.route';
import locationRoute from './location.route';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/buses',
    route: busRoute,
  },
  {
    path: '/routes',
    route: routeRoute,
  },
  {
    path: '/trips',
    route: tripRoute,
  },
  {
    path: '/bookings',
    route: bookingRoute,
  },
  {
    path: '/operators',
    route: operatorRoute,
  },
  {
    path: '/reviews',
    route: reviewRoute,
  },
  {
    path: '/payments',
    route: paymentRoute,
  },
  {
    path: '/seat-locks',
    route: seatLockRoute,
  },
  {
    path: '/chatbot',
    route: chatbotRoute,
  },
  {
    path: '/locations',
    route: locationRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
