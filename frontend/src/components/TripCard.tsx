'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, MapPin, Users, Star, Armchair } from 'lucide-react';
import { MockTrip } from '@/mock/tripData';
import { useRouter } from 'next/navigation';

interface TripCardProps {
  trip: MockTrip;
  onSelect?: (trip: MockTrip) => void;
  isDetailedView?: boolean;
}

export function TripCard({ trip, onSelect, isDetailedView = false }: TripCardProps) {
  const router = useRouter();

  const departureDate = new Date(trip.departureTime);
  const arrivalDate = new Date(trip.arrivalTime);
  const durationHours = trip.route.estimatedDuration / 60;

  const formatTime = (date: Date) => date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const formatPrice = (price: number) => price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  const occupancyPercentage = ((trip.bus.totalSeats - trip.availableSeats) / trip.bus.totalSeats) * 100;

  const handleViewDetails = () => {
    router.push(`/trip-detail/${trip.id}`);
  };

  const handleBooking = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/booking/${trip.id}`);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={handleViewDetails}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {trip.route.origin.city} → {trip.route.destination.city}
            </CardTitle>
            <CardDescription className="text-xs mt-1">{trip.route.routeName}</CardDescription>
          </div>
          <Badge variant={trip.status === 'scheduled' ? 'default' : 'secondary'}>
            {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Journey Timeline */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-2xl font-bold">{formatTime(departureDate)}</p>
            <p className="text-xs text-gray-600">{trip.route.origin.city}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">{durationHours.toFixed(1)}h</p>
            <div className="w-12 h-px bg-gray-300" />
            <p className="text-xs text-gray-600">{trip.route.distance}km</p>
          </div>

          <div className="flex-1 text-right">
            <p className="text-2xl font-bold">{formatTime(arrivalDate)}</p>
            <p className="text-xs text-gray-600">{trip.route.destination.city}</p>
          </div>
        </div>

        <Separator />

        {/* Bus & Trip Details */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-50 p-2 rounded-lg">
            <p className="text-xs text-gray-600">Bus Type</p>
            <p className="text-sm font-medium capitalize">{trip.bus.busType}</p>
          </div>
          <div className="bg-blue-50 p-2 rounded-lg">
            <Armchair className="w-4 h-4 mx-auto text-blue-600 mb-1" />
            <p className="text-xs text-gray-600">Available</p>
            <p className="text-sm font-medium">{trip.availableSeats}</p>
          </div>
          <div className="bg-blue-50 p-2 rounded-lg">
            <Star className="w-4 h-4 mx-auto text-yellow-400 mb-1" />
            <p className="text-xs text-gray-600">Rating</p>
            <p className="text-sm font-medium">{trip.operator.rating.overall.toFixed(1)}</p>
          </div>
        </div>

        {/* Occupancy Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Occupancy</span>
            <span>{occupancyPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${occupancyPercentage}%` }} />
          </div>
        </div>

        {/* Price & Booking */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-gray-600">Price per seat</p>
            <p className="text-2xl font-bold text-blue-600">{formatPrice(trip.pricePerSeat)}</p>
          </div>
          <Button
            onClick={handleBooking}
            disabled={trip.availableSeats === 0 || trip.status !== 'scheduled'}
            size="sm"
          >
            {trip.availableSeats === 0 ? 'Booked' : 'Select'}
          </Button>
        </div>

        {isDetailedView && (
          <>
            <Separator />
            {/* Operator Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {trip.operator.logoUrl && (
                <img
                  src={trip.operator.logoUrl}
                  alt={trip.operator.companyName}
                  className="w-10 h-10 rounded-full bg-white"
                />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{trip.operator.companyName}</p>
                <p className="text-xs text-gray-600">{trip.operator.rating.totalReviews} reviews</p>
              </div>
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface TripListProps {
  trips: MockTrip[];
  isDetailedView?: boolean;
}

export function TripList({ trips, isDetailedView = false }: TripListProps) {
  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} isDetailedView={isDetailedView} />
      ))}
    </div>
  );
}
