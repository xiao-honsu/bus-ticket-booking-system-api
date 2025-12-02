# Trip UI Components Documentation

## Overview

A comprehensive frontend UI implementation for detailed trip view and trip listing in a bus ticket booking system. Built with shadcn/ui styling, React, and Next.js.

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── TripDetailView.tsx    # Main detailed trip view component
│   │   ├── TripCard.tsx          # Reusable trip card component
│   │   └── ui/
│   │       └── tabs.tsx          # Tab UI component
│   ├── app/
│   │   ├── trip/
│   │   │   └── page.tsx          # Trip showcase page with tabs
│   │   └── trip-detail/
│   │       └── [tripId]/
│   │           └── page.tsx      # Dynamic trip detail page
│   └── mock/
│       └── tripData.ts           # Mock data for trips
```

## Components

### 1. TripDetailView (`src/components/TripDetailView.tsx`)

A comprehensive detailed view component displaying all information about a trip.

**Features:**

- Journey timeline with departure/arrival times and location details
- Stops information along the route
- Bus specifications (type, model, seats, amenities)
- Driver information card
- Operator ratings dashboard
- Sticky pricing and booking sidebar
- Expandable trip policies (cancellation, refund, rescheduling, baggage, pet)
- Occupancy rate visualization

**Props:**

```typescript
interface TripDetailViewProps {
  trip?: MockTrip; // Optional - uses mock data if not provided
}
```

**Usage:**

```tsx
import TripDetailView from '@/components/TripDetailView';

export default function Page() {
  return <TripDetailView trip={tripData} />;
}
```

### 2. TripCard (`src/components/TripCard.tsx`)

Reusable card component for displaying trip information in a compact format.

**Components:**

- `TripCard` - Single trip card
- `TripList` - List of trip cards

**Features:**

- Journey timeline visualization
- Bus type, available seats, and rating display
- Occupancy bar chart
- Price per seat and booking button
- Optional detailed view with operator information
- Click to view full details

**Props:**

```typescript
interface TripCardProps {
  trip: MockTrip;
  onSelect?: (trip: MockTrip) => void;
  isDetailedView?: boolean; // Show operator info
}

interface TripListProps {
  trips: MockTrip[];
  isDetailedView?: boolean;
}
```

**Usage:**

```tsx
import { TripCard, TripList } from '@/components/TripCard';
import { mockTripList } from '@/mock/tripData';

export default function Page() {
  return <TripList trips={mockTripList} isDetailedView={true} />;
}
```

### 3. Tabs Component (`src/components/ui/tabs.tsx`)

Radix UI based tabs component for tab navigation.

**Features:**

- Accessible tabs with keyboard navigation
- Automatic focus management
- Smooth transitions

## Mock Data

### File: `src/mock/tripData.ts`

Contains comprehensive mock data structure based on the backend trip.model.ts

**Main Export:**

```typescript
export const mockTripData: MockTrip;
export const mockTripList: MockTrip[];
```

**Data Structure:**

- Trip metadata (ID, status, times)
- Route information (origin, destination, stops)
- Bus details (type, amenities, images)
- Operator information (ratings, contact)
- Trip policies (cancellation, refund, baggage)
- Statistics (bookings, revenue, occupancy)

**Sample Data Includes:**

- Route: Hà Nội → TP Hồ Chí Minh
- Bus type: Sleeper bus with 36 seats
- Amenities: WiFi, Toilet, AC, USB Charging, Reclining Seats, Blankets
- Multiple stops with time estimates
- Operator ratings for different categories
- Comprehensive policies

## Pages

### 1. Trip Showcase Page (`src/app/trip/page.tsx`)

Display all available trips with tab views.

**Routes:**

- `/trip` - Main trip listing page

**Features:**

- Tab switcher between List and Detailed views
- Multiple trip cards
- Responsive grid layout

### 2. Trip Detail Page (`src/app/trip-detail/[tripId]/page.tsx`)

Dynamic page for individual trip details.

**Routes:**

- `/trip-detail/[tripId]` - Individual trip detail

**Features:**

- Full trip information display
- Dynamic routing based on trip ID
- 404 handling for non-existent trips

## Styling

All components use:

- **shadcn/ui** components (Card, Button, Badge, etc.)
- **Tailwind CSS** for styling
- **Lucide React** for icons
- Responsive design (mobile-first approach)
- Light and dark mode support via shadcn themes

## Key Features

### Route Information

- Origin and destination cities with landmarks
- Distance and estimated duration
- Multiple stops with time estimates
- Stop types (pickup, dropoff, or both)

### Bus & Amenities

- Bus type classification (standard, limousine, sleeper)
- Total seat count and availability
- Full amenities list with icons
- Bus model and manufacture year
- License plate information

### Pricing & Booking

- Price per seat display
- Real-time availability
- Occupancy visualization
- Quick booking button
- Disabled state when fully booked

### Operator Information

- Company logo and name
- Overall rating and breakdown by category:
  - Cleanliness
  - Punctuality
  - Staff
  - Comfort
  - Value for money
- Total reviews count
- Contact information

### Trip Policies

- Expandable/collapsible policy sections
- Cancellation terms
- Refund policy
- Rescheduling options
- Baggage allowance
- Pet policy

### Driver Details

- Driver name, phone, and license number
- Professional presentation

## Responsive Design

Components are fully responsive:

- **Mobile** (< 640px): Single column layout
- **Tablet** (640px - 1024px): Two column layout
- **Desktop** (> 1024px): Three column layout with sticky sidebar

## Icons Used (Lucide React)

- `Clock` - Time information
- `MapPin` - Location markers
- `Users` - Passenger count
- `Star` - Ratings
- `Phone` - Contact information
- `Wifi`, `Droplet`, `Wind`, `Zap` - Amenities
- `Armchair` - Seating
- `Package` - Baggage
- `ChevronUp/Down` - Expand/collapse

## Navigation

All components include navigation:

- Click trip card → Navigate to detailed view
- "Book Now" button → Navigate to booking page
- "View Details" → Dynamic route with trip ID

## Installation & Setup

1. Install required dependencies:

```bash
npm install @radix-ui/react-tabs
```

2. Ensure shadcn/ui components are installed:

```bash
npm install lucide-react date-fns
```

3. Import and use components:

```tsx
import TripDetailView from '@/components/TripDetailView';
import { TripCard, TripList } from '@/components/TripCard';
import { mockTripData } from '@/mock/tripData';
```

## Future Enhancements

- Integration with real API backend
- Real-time seat availability updates
- Advanced filtering and sorting
- User reviews and comments
- Favorite trips saving
- Multi-language support
- Real payment integration
- Trip modification and cancellation flows

## Testing

To test the components:

1. **Trip Showcase Page:**

   ```
   Navigate to http://localhost:3000/trip
   ```

2. **Trip Detail Page:**

   ```
   Navigate to http://localhost:3000/trip-detail/67a4e8c9f3e9b1c2d3e4f5g6
   ```

3. **Mock Data:**
   ```
   All components automatically load mock data if not provided
   ```

## Performance Considerations

- Components use React.memo for optimization
- Images are optimized with Next.js Image component
- CSS classes are pre-computed
- Efficient state management with React hooks

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance
- Focus indicators
