'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users, Bus, Star } from 'lucide-react';
import { MockTrip } from '@/mock/tripData';

interface TripCardProps {
  trip: MockTrip;
}

export default function TripCard({ trip }: TripCardProps) {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/trip-detail/${trip.id}`);
  };

  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/booking/${trip.id}`);
  };

  const departureTime = new Date(trip.departureTime);
  const arrivalTime = new Date(trip.arrivalTime);
  const durationMinutes = trip.route.estimatedDuration;
  const durationHours = (durationMinutes / 60).toFixed(1);

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleViewDetails}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Route and Time Info */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                  <MapPin className="h-4 w-4" />
                  <span>{trip.route.origin.city}</span>
                </div>
                <div className="text-2xl font-bold">
                  {departureTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <div className="flex flex-col items-center px-4">
                <div className="text-gray-400 text-sm mb-1">
                  {durationHours}h
                </div>
                <div className="w-24 h-0.5 bg-gray-300 relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full" />
                </div>
              </div>

              <div className="flex-1 text-right">
                <div className="flex items-center justify-end gap-2 text-gray-600 text-sm mb-1">
                  <MapPin className="h-4 w-4" />
                  <span>{trip.route.destination.city}</span>
                </div>
                <div className="text-2xl font-bold">
                  {arrivalTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Bus Info */}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Bus className="h-4 w-4" />
                <span className="capitalize">{trip.bus.busType} • {trip.bus.totalSeats} seats</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{trip.availableSeats} available</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{trip.operator.rating.overall.toFixed(1)}</span>
              </div>
              {trip.bus.licensePlate && (
                <Badge variant="outline">{trip.bus.licensePlate}</Badge>
              )}
            </div>
          </div>

          {/* Price and Action */}
          <div className="flex flex-col items-end gap-3 md:min-w-56">
            <div className="text-right">
              <div className="text-sm text-gray-600">{trip.operator.companyName}</div>
              <div className="text-3xl font-bold text-blue-600">
                {trip.pricePerSeat.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
              </div>
              <div className="text-xs text-gray-500">per seat</div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline"
                onClick={handleViewDetails}
                className="flex-1"
              >
                Details
              </Button>
              <Button 
                onClick={handleBookNow}
                disabled={trip.availableSeats === 0}
                className="flex-1 md:flex-none"
              >
                {trip.availableSeats === 0 ? 'Sold Out' : 'Book'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}