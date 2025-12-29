const allRoles = {
  user: [
    'bookTicket',
    'manageOwnBookings',
    'getTrips',
    'getBuses',
    'getRoutes',
    'createReview',
    'manageOwnReviews',
    'getSearchHistory',
    'collectPromotions',
    'viewPromotions',
  ],
  admin: [
    'getUsers',
    'manageUsers',
    'getBuses',
    'manageBuses',
    'getRoutes',
    'manageRoutes',
    'getTrips',
    'manageTrips',
    'manageBookings',
    'manageOperators',
    'viewAnalytics',
    'manageReviews',
    'managePromotions',
  ],
};

export const roles = Object.keys(allRoles);
export const roleRights = new Map(Object.entries(allRoles));
