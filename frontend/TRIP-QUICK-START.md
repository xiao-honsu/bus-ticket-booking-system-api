# Trip UI Components - Quick Start Guide

## 📋 Overview

This document provides a quick reference for using the trip UI components in your application.

## 🚀 Quick Links

- **Showcase Page**: http://localhost:3000/components-showcase
- **Trip Listing**: http://localhost:3000/trip
- **Trip Detail**: http://localhost:3000/trip-detail/67a4e8c9f3e9b1c2d3e4f5g6

## 📦 Available Components

### 1. TripDetailView

Displays comprehensive trip information.

```tsx
import TripDetailView from '@/components/TripDetailView';
import { mockTripData } from '@/mock/tripData';

export default function Page() {
  return <TripDetailView trip={mockTripData} />;
}
```

**What it shows:**

- ✅ Journey timeline with times and locations
- ✅ Route stops
- ✅ Bus details and amenities
- ✅ Driver information
- ✅ Operator ratings breakdown
- ✅ Expandable policies
- ✅ Sticky booking sidebar with pricing

### 2. TripCard

Compact trip card for listings.

```tsx
import { TripCard } from '@/components/TripCard';

export default function Page({ trip }) {
  return (
    <TripCard
      trip={trip}
      isDetailedView={false} // Show operator info?
    />
  );
}
```

**Variants:**

- `isDetailedView={false}` - Compact view with booking button
- `isDetailedView={true}` - Includes operator information

### 3. TripList

List wrapper for multiple trips.

```tsx
import { TripList } from '@/components/TripCard';
import { mockTripList } from '@/mock/tripData';

export default function Page() {
  return <TripList trips={mockTripList} isDetailedView={true} />;
}
```

## 📁 File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── TripDetailView.tsx       # Main detailed view
│   │   ├── TripCard.tsx             # Card and list components
│   │   └── ui/
│   │       └── tabs.tsx             # Tab component
│   ├── app/
│   │   ├── trip/page.tsx            # /trip route
│   │   ├── trip-detail/[tripId]/page.tsx  # /trip-detail/[id]
│   │   └── components-showcase/page.tsx   # /components-showcase
│   └── mock/
│       └── tripData.ts              # Mock data
├── TRIP-UI-COMPONENTS.md            # Full documentation
└── TRIP-QUICK-START.md              # This file
```

## 🎨 Styling

All components use:

- **shadcn/ui** - Base UI components
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- Fully responsive and accessible

## 🔧 Customization

### Using Your Own Data

```tsx
import TripDetailView from '@/components/TripDetailView';

const myTrip = {
  id: 'trip001',
  departureTime: '2024-12-10T08:00:00Z',
  arrivalTime: '2024-12-10T20:00:00Z',
  pricePerSeat: 450000,
  availableSeats: 18,
  bookedSeats: ['A1', 'A2'],
  status: 'scheduled',
  route: {
    /* ... */
  },
  bus: {
    /* ... */
  },
  operator: {
    /* ... */
  },
  policies: {
    /* ... */
  },
  stats: {
    /* ... */
  },
};

export default function Page() {
  return <TripDetailView trip={myTrip} />;
}
```

### Component Props

**TripDetailView:**

```typescript
interface TripDetailViewProps {
  trip?: MockTrip; // Optional - uses mock if not provided
}
```

**TripCard:**

```typescript
interface TripCardProps {
  trip: MockTrip; // Required
  onSelect?: (trip: MockTrip) => void; // Optional callback
  isDetailedView?: boolean; // Default: false
}
```

**TripList:**

```typescript
interface TripListProps {
  trips: MockTrip[];
  isDetailedView?: boolean; // Default: false
}
```

## 🎯 Common Use Cases

### Display Single Trip Details

```tsx
// In /trip-detail/[tripId]/page.tsx
import TripDetailView from '@/components/TripDetailView';
import { mockTripList } from '@/mock/tripData';

export default function TripDetailPage({ params }) {
  const trip = mockTripList.find((t) => t.id === params.tripId);
  return <TripDetailView trip={trip} />;
}
```

### Display Trip Search Results

```tsx
import { TripList } from '@/components/TripCard';
import { useGetTripsQuery } from '@/lib/store/services/api';

export default function SearchResults() {
  const { data: trips } = useGetTripsQuery();
  return <TripList trips={trips} isDetailedView={true} />;
}
```

### Tabbed Trip View

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TripList } from '@/components/TripCard';

export default function TripsPage() {
  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">List View</TabsTrigger>
        <TabsTrigger value="detail">Detailed View</TabsTrigger>
      </TabsList>
      <TabsContent value="list">
        <TripList trips={trips} isDetailedView={false} />
      </TabsContent>
      <TabsContent value="detail">
        <TripList trips={trips} isDetailedView={true} />
      </TabsContent>
    </Tabs>
  );
}
```

## 📱 Responsive Behavior

All components automatically adapt to screen sizes:

| Breakpoint              | Behavior                       |
| ----------------------- | ------------------------------ |
| Mobile (< 640px)        | Single column                  |
| Tablet (640px - 1024px) | Two columns                    |
| Desktop (> 1024px)      | Three columns + sticky sidebar |

## 🔌 Integration with Redux

The components work with the booking slice:

```tsx
import { useAppDispatch } from '@/lib/hooks';
import { setTripId } from '@/lib/store/features/booking/bookingSlice';

export default function MyComponent() {
  const dispatch = useAppDispatch();

  const handleSelectTrip = (trip) => {
    dispatch(setTripId(trip.id));
    router.push(`/booking/${trip.id}`);
  };

  return <TripCard trip={trip} onSelect={handleSelectTrip} />;
}
```

## 🚨 Troubleshooting

### "Cannot find module '@radix-ui/react-tabs'"

```bash
npm install @radix-ui/react-tabs
```

### Components not rendering

- Ensure mock data is properly imported
- Check that all required props are passed
- Verify shadcn/ui components are installed

### Styling looks off

- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run dev`
- Check Tailwind CSS configuration

## 📊 Data Structure Example

```typescript
const trip = {
  id: 'trip001',
  tripId: 'TRIP001',
  departureTime: '2024-12-10T08:00:00Z',
  arrivalTime: '2024-12-10T20:00:00Z',
  pricePerSeat: 450000,
  availableSeats: 18,
  bookedSeats: ['A1', 'A2', 'A5'],
  status: 'scheduled',

  driver: {
    name: 'Nguyễn Văn An',
    phone: '0912345678',
    licenseNumber: 'DL12345ABC',
  },

  route: {
    id: 'route001',
    routeName: 'Hà Nội - TP Hồ Chí Minh',
    origin: {
      city: 'Hà Nội',
      state: 'Hà Nội',
      landmark: 'Bến xe Mỹ Đình',
      coordinates: [105.78, 21.0285],
      minutesFromStart: 0,
      stopType: 'pickup',
    },
    destination: {
      city: 'TP Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      landmark: 'Bến xe Miền Đông',
      coordinates: [106.75, 10.8231],
      minutesFromStart: 880,
      stopType: 'dropoff',
    },
    distance: 1600,
    estimatedDuration: 880,
    stops: [
      {
        city: 'Thanh Hóa',
        state: 'Thanh Hóa',
        landmark: 'Bến xe Thanh Hóa',
        minutesFromStart: 180,
        stopType: 'both',
      },
      // More stops...
    ],
  },

  bus: {
    id: 'bus001',
    busNumber: 'BUS-001-VT',
    busType: 'sleeper',
    totalSeats: 36,
    amenities: ['WiFi', 'Toilet', 'Air Conditioning', 'USB Charging'],
    licensePlate: 'HA-12345AB',
    busModel: 'Thaco Universe TB82',
    yearOfManufacture: 2023,
    images: ['url1', 'url2'],
  },

  operator: {
    id: 'operator001',
    companyName: 'Vietnam Express Company',
    logoUrl: 'https://...',
    phoneNumber: '1900-1234',
    rating: {
      overall: 4.8,
      cleanliness: 4.9,
      punctuality: 4.7,
      staff: 4.8,
      comfort: 4.7,
      value: 4.6,
      totalReviews: 2345,
    },
  },

  policies: {
    cancellation: 'Free cancellation up to 24 hours...',
    refund: 'Refunds within 3-5 business days...',
    rescheduling: 'You can reschedule up to 2 times...',
    baggage: 'Free baggage allowance: 1 large bag...',
    petPolicy: 'Small pets (under 5kg) allowed...',
  },

  stats: {
    totalBookings: 487,
    totalRevenue: 219150000,
    occupancyRate: 0.5,
  },
};
```

## 🎓 Learning Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide React Icons](https://lucide.dev)
- [Radix UI](https://www.radix-ui.com)

## 📞 Support

For issues or questions:

1. Check the main documentation: `TRIP-UI-COMPONENTS.md`
2. Review mock data structure: `src/mock/tripData.ts`
3. Check component showcase: `/components-showcase`
