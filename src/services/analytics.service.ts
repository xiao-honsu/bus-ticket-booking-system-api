import Booking from '../models/booking.model';

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalBookings: number;
    avgTicketPrice: number;
    conversionRate: number;
  };
  revenueByDay: Array<{
    date: string;
    revenue: number;
    bookings: number;
  }>;
  statusBreakdown: {
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
}

const getPeriodDates = (period: string) => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate: now };
};

const getAnalytics = async (period: string): Promise<AnalyticsData> => {
  const { startDate, endDate } = getPeriodDates(period);

  // Get all bookings in period
  const bookings: any[] = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  // Calculate summary
  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const totalBookings = bookings.length;
  const avgTicketPrice = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Simple conversion rate calculation (bookings / total trips searched * 100)
  // For now, use a formula based on completed vs total bookings
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const conversionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

  // Revenue by day
  const revenueByDay: { [key: string]: { revenue: number; bookings: number } } = {};
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  // Initialize all days with 0
  for (let i = 0; i < days; i++) {
    const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    revenueByDay[dateStr] = { revenue: 0, bookings: 0 };
  }

  // Fill in actual data
  bookings.forEach((booking) => {
    const dateStr = new Date(booking.createdAt).toISOString().split('T')[0];
    if (revenueByDay[dateStr]) {
      if (booking.status !== 'cancelled') {
        revenueByDay[dateStr].revenue += booking.totalAmount || 0;
      }
      revenueByDay[dateStr].bookings += 1;
    }
  });

  const revenueByDayArray = Object.entries(revenueByDay)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      bookings: data.bookings,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Status breakdown
  const statusBreakdown = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  };

  return {
    summary: {
      totalRevenue: Math.round(totalRevenue),
      totalBookings,
      avgTicketPrice: Math.round(avgTicketPrice),
      conversionRate: Math.round(conversionRate * 10) / 10,
    },
    revenueByDay: revenueByDayArray,
    statusBreakdown,
  };
};

const getRevenueStats = async (period: string) => {
  const { startDate, endDate } = getPeriodDates(period);

  const bookings: any[] = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $ne: 'cancelled' },
  }).lean();

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const avgRevenue = bookings.length > 0 ? totalRevenue / bookings.length : 0;

  // Group by payment method
  const byPaymentMethod: { [key: string]: number } = {};
  bookings.forEach((booking) => {
    const method = booking.paymentMethod || 'unknown';
    byPaymentMethod[method] = (byPaymentMethod[method] || 0) + (booking.totalAmount || 0);
  });

  return {
    totalRevenue: Math.round(totalRevenue),
    avgRevenue: Math.round(avgRevenue),
    byPaymentMethod,
    bookingCount: bookings.length,
  };
};

const getBookingStats = async (period: string) => {
  const { startDate, endDate } = getPeriodDates(period);

  const bookings: any[] = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  // Group by status
  const byStatus = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  };

  // Group by day of week
  const byDayOfWeek: { [key: string]: number } = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };

  bookings.forEach((booking) => {
    const date = new Date(booking.createdAt);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    byDayOfWeek[dayName] += 1;
  });

  return {
    total: bookings.length,
    byStatus,
    byDayOfWeek,
  };
};

const getPopularRoutes = async (limit: number) => {
  const bookings: any[] = await Booking.find({
    status: { $ne: 'cancelled' },
  })
    .populate('trip')
    .lean();

  // Group by route
  const routeCounts: {
    [key: string]: {
      count: number;
      revenue: number;
      origin: string;
      destination: string;
    };
  } = {};

  bookings.forEach((booking) => {
    if (booking.trip && typeof booking.trip === 'object') {
      const trip = booking.trip as any;
      const routeKey = `${trip.origin || 'Unknown'}-${trip.destination || 'Unknown'}`;

      if (!routeCounts[routeKey]) {
        routeCounts[routeKey] = {
          count: 0,
          revenue: 0,
          origin: trip.origin || 'Unknown',
          destination: trip.destination || 'Unknown',
        };
      }

      routeCounts[routeKey].count += 1;
      routeCounts[routeKey].revenue += booking.totalAmount || 0;
    }
  });

  const popularRoutes = Object.entries(routeCounts)
    .map(([_, data]) => ({
      origin: data.origin,
      destination: data.destination,
      bookings: data.count,
      revenue: Math.round(data.revenue),
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, limit);

  return popularRoutes;
};

export default {
  getAnalytics,
  getRevenueStats,
  getBookingStats,
  getPopularRoutes,
};
