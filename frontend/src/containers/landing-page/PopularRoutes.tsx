'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { mockTripList } from '@/mock/tripData';
import { MapPin, DollarSign } from 'lucide-react';

export default function PopularRoutes() {
  const [isClient, setIsClient] = useState(false);
  const [popularRoutes, setPopularRoutes] = useState<typeof mockTripList>([]);

  useEffect(() => {
    setIsClient(true);
    
    // Get unique routes from mock trips and sort by available seats (highest first)
    const routeMap = new Map<string, typeof mockTripList[0]>();
    mockTripList.forEach((trip) => {
      const routeKey = `${trip.route.origin.city}_${trip.route.destination.city}`;
      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, trip);
      } else {
        // Update if current trip has more available seats
        const existing = routeMap.get(routeKey)!;
        if (trip.availableSeats > existing.availableSeats) {
          routeMap.set(routeKey, trip);
        }
      }
    });

    // Get top 4 routes sorted by available seats
    const routes = Array.from(routeMap.values())
      .sort((a, b) => b.availableSeats - a.availableSeats)
      .slice(0, 4);
    
    setPopularRoutes(routes);
  }, []);

  if (!isClient || popularRoutes.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Popular Routes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularRoutes.map((trip) => (
            <Link href={`/trip-detail/${trip.id}`} key={trip.id}>
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">{trip.route.origin.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">{trip.route.destination.city}</span>
                    </div>
                  </div>
                  <span className="text-gray-300 text-xl">→</span>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600 font-bold text-lg">
                      {(trip.pricePerSeat / 1000).toFixed(0)}K đ
                    </span>
                  </div>
                  <div className="bg-blue-50 rounded px-2 py-1">
                    <span className="text-xs font-semibold text-blue-700">
                      {`${trip.availableSeats} seats`}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  {trip.operator.companyName}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
