'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  MapPin,
  Clock,
  Users,
  Star,
  Phone,
  Wifi,
  Droplet,
  Wind,
  Zap,
  Armchair,
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { mockTripData, MockTrip } from '@/mock/tripData';
import { useRouter } from 'next/navigation';

interface TripDetailViewProps {
  trip?: MockTrip;
}

const amenitiesIconMap: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="w-4 h-4" />,
  Toilet: <Droplet className="w-4 h-4" />,
  'Air Conditioning': <Wind className="w-4 h-4" />,
  'USB Charging': <Zap className="w-4 h-4" />,
  'Reclining Seats': <Armchair className="w-4 h-4" />,
  'Blankets & Pillows': <Package className="w-4 h-4" />,
};

export default function TripDetailView({ trip = mockTripData }: TripDetailViewProps) {
  const router = useRouter();
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const departureDate = new Date(trip.departureTime);
  const arrivalDate = new Date(trip.arrivalTime);
  const durationHours = trip.route.estimatedDuration / 60;

  // Use fixed format to avoid locale mismatch between server/client
  const formatTime = (date: Date) => {
    if (!isClient) return '--:--';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (date: Date) => {
    if (!isClient) return '---';
    return date.toLocaleDateString('vi-VN', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  const formatPrice = (price: number) => {
    if (!isClient) return 'Đ---';
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const occupancyPercentage = isClient ? ((trip.bus.totalSeats - trip.availableSeats) / trip.bus.totalSeats) * 100 : 0;

  const handleBookNow = () => {
    router.push(`/booking/${trip.id}`);
  };

  const policyItems = [
    { key: 'cancellation', label: 'Cancellation Policy', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'refund', label: 'Refund Policy', icon: <CheckCircle2 className="w-4 h-4" /> },
    { key: 'rescheduling', label: 'Rescheduling', icon: <Clock className="w-4 h-4" /> },
    { key: 'baggage', label: 'Baggage Policy', icon: <Package className="w-4 h-4" /> },
    { key: 'petPolicy', label: 'Pet Policy', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Main Trip Info */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="space-y-4">
                {/* Trip Title & Status */}
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{trip.route.origin.city} → {trip.route.destination.city}</h1>
                    <p className="text-gray-600">{trip.route.routeName}</p>
                  </div>
                  <Badge variant={trip.status === 'scheduled' ? 'default' : 'secondary'} className="mt-1">
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </Badge>
                </div>

                <Separator />

                {/* Journey Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-2xl font-bold">{formatTime(departureDate)}</div>
                      <div className="text-sm text-gray-600">{formatDate(departureDate)}</div>
                      <div className="text-sm text-gray-500 mt-1">{trip.route.origin.landmark}</div>
                    </div>

                    <div className="flex flex-col items-center gap-2 px-4">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div className="text-xs text-gray-600 whitespace-nowrap">{durationHours.toFixed(1)}h</div>
                      <div className="w-20 h-1 bg-linear-to-r from-blue-600 to-blue-200 rounded" />
                      <div className="text-xs text-gray-600">{trip.route.distance}km</div>
                    </div>

                    <div className="flex-1 text-right">
                      <div className="text-2xl font-bold">{formatTime(arrivalDate)}</div>
                      <div className="text-sm text-gray-600">{formatDate(arrivalDate)}</div>
                      <div className="text-sm text-gray-500 mt-1">{trip.route.destination.landmark}</div>
                    </div>
                  </div>

                  {/* Stops Info */}
                  {trip.route.stops && trip.route.stops.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Stops on the way:</p>
                      <div className="flex flex-wrap gap-2">
                        {trip.route.stops.map((stop, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {stop.city} ({stop.minutesFromStart}m)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Bus & Driver Info */}
            <CardContent className="space-y-6">
              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Bus Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Bus Type</p>
                    <p className="font-medium capitalize">{trip.bus.busType}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Total Seats</p>
                    <p className="font-medium">{trip.bus.totalSeats}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Bus Number</p>
                    <p className="font-medium">{trip.bus.busNumber}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Model</p>
                    <p className="font-medium text-sm">{trip.bus.busModel || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {trip.bus.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="text-blue-600">{amenitiesIconMap[amenity] || <CheckCircle2 className="w-4 h-4" />}</div>
                      <span className="text-sm font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver Info */}
              {trip.driver && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Driver Information</h3>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{trip.driver.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{trip.driver.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">License:</span>
                        <span className="font-medium">{trip.driver.licenseNumber}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Price & Booking */}
        <div className="lg:col-span-1 space-y-4">
          {/* Price Card */}
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Price & Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Price per seat</p>
                <p className="text-3xl font-bold text-blue-600">{formatPrice(trip.pricePerSeat)}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Available seats:</span>
                  <span className="font-medium">{isClient ? trip.availableSeats : '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Booked seats:</span>
                  <span className="font-medium">{isClient ? trip.bus.totalSeats - trip.availableSeats : '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Occupancy:</span>
                  <span className="font-medium">{occupancyPercentage.toFixed(0)}%</span>
                </div>
              </div>

              {/* Occupancy Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${occupancyPercentage}%` }} />
              </div>

              <Button
                onClick={handleBookNow}
                disabled={!isClient || trip.availableSeats === 0 || trip.status !== 'scheduled'}
                className="w-full"
                size="lg"
              >
                {!isClient ? 'Loading...' : trip.availableSeats === 0 ? 'Fully Booked' : trip.status !== 'scheduled' ? 'Unavailable' : 'Book Now'}
              </Button>

              {isClient && trip.availableSeats === 0 && (
                <p className="text-xs text-red-600 text-center">No seats available for this trip</p>
              )}
            </CardContent>
          </Card>

          {/* Operator Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {trip.operator.logoUrl && (
                  <img
                    src={trip.operator.logoUrl}
                    alt={trip.operator.companyName}
                    className="w-12 h-12 rounded-full bg-gray-100"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">{trip.operator.companyName}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-sm">{trip.operator.rating.overall.toFixed(1)}</span>
                    <span className="text-xs text-gray-600">({trip.operator.rating.totalReviews} reviews)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-600" />
                <span>{trip.operator.phoneNumber}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rating Details */}
      <Card>
        <CardHeader>
          <CardTitle>Operator Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Overall', value: trip.operator.rating.overall },
              { label: 'Cleanliness', value: trip.operator.rating.cleanliness },
              { label: 'Punctuality', value: trip.operator.rating.punctuality },
              { label: 'Staff', value: trip.operator.rating.staff },
              { label: 'Comfort', value: trip.operator.rating.comfort },
              { label: 'Value', value: trip.operator.rating.value },
            ].map((rating, idx) => (
              <div key={idx} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">{rating.label}</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-bold">{rating.value.toFixed(1)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-yellow-400 h-1 rounded-full" style={{ width: `${(rating.value / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policies Section */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Policies & Terms</CardTitle>
          <CardDescription>Important information about this trip</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {policyItems.map((policy) => (
            <button
              key={policy.key}
              onClick={() => setExpandedPolicy(expandedPolicy === policy.key ? null : policy.key)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">{policy.icon}</div>
                  <span className="font-medium">{policy.label}</span>
                </div>
                {expandedPolicy === policy.key ? (
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                )}
              </div>
              {expandedPolicy === policy.key && (
                <div className="p-4 bg-gray-50 border border-t-0 rounded-b-lg">
                  <p className="text-sm text-gray-700 leading-relaxed">{trip.policies[policy.key as keyof typeof trip.policies]}</p>
                </div>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Footer CTA */}
      <div className="flex gap-4 justify-center py-4">
        <Button size="lg" onClick={handleBookNow} disabled={!isClient || trip.availableSeats === 0 || trip.status !== 'scheduled'}>
          {!isClient ? 'Loading...' : trip.availableSeats === 0 ? 'Fully Booked' : 'Book This Trip'}
        </Button>
        <Button size="lg" variant="outline">
          Share Trip
        </Button>
      </div>
    </div>
  );
}
