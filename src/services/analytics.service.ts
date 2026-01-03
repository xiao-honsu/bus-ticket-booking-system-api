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
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
  const avgTicketPrice = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;

  // Simple conversion rate calculation (confirmed bookings / total bookings * 100)
  const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

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
      if (booking.status === 'confirmed') {
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
    status: 'confirmed',
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
    status: 'confirmed',
  })
    .populate('trip')
    .lean();

  // Group by route from tripSnapshot
  const routeCounts: {
    [key: string]: {
      count: number;
      revenue: number;
      routeName: string;
    };
  } = {};

  bookings.forEach((booking) => {
    const routeName = booking.tripSnapshot?.routeName || 'Unknown Route';

    if (!routeCounts[routeName]) {
      routeCounts[routeName] = {
        count: 0,
        revenue: 0,
        routeName,
      };
    }

    routeCounts[routeName].count += 1;
    routeCounts[routeName].revenue += booking.totalAmount || 0;
  });

  const popularRoutes = Object.entries(routeCounts)
    .map(([_, data]) => ({
      routeName: data.routeName,
      bookings: data.count,
      revenue: Math.round(data.revenue),
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, limit);

  return popularRoutes;
};

const getTodayBookingsCount = async (): Promise<number> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await Booking.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow },
  });

  return count;
};

const getBookingsByStatusOverTime = async (period: string) => {
  const { startDate, endDate } = getPeriodDates(period);

  const bookings: any[] = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  // Initialize data structure
  const dataByDate: {
    [key: string]: {
      date: string;
      pending: number;
      confirmed: number;
      cancelled: number;
    };
  } = {};

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    dataByDate[dateStr] = {
      date: dateStr,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
    };
  }

  // Fill in actual data
  bookings.forEach((booking) => {
    const dateStr = new Date(booking.createdAt).toISOString().split('T')[0];
    if (dataByDate[dateStr]) {
      if (booking.status === 'pending') {
        dataByDate[dateStr].pending += 1;
      } else if (booking.status === 'confirmed') {
        dataByDate[dateStr].confirmed += 1;
      } else if (booking.status === 'cancelled') {
        dataByDate[dateStr].cancelled += 1;
      }
    }
  });

  const result = Object.values(dataByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return result;
};

export default {
  getAnalytics,
  getRevenueStats,
  getBookingStats,
  getPopularRoutes,
  getTodayBookingsCount,
  getBookingsByStatusOverTime,
};
