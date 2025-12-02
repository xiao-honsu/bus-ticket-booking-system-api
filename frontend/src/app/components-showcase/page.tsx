'use client';

import React from 'react';
import TripDetailView from '@/components/TripDetailView';
import { TripCard, TripList } from '@/components/TripCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockTripData, mockTripList } from '@/mock/tripData';

export default function ComponentShowcasePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Trip UI Components Showcase</h1>
          <p className="text-gray-600">All available trip components and their variants</p>
        </div>

        {/* Trip Detail View Section */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">1. TripDetailView Component</h2>
            <p className="text-gray-600">Comprehensive detailed view of a trip with all information</p>
          </div>
          <TripDetailView trip={mockTripData} />
        </section>

        {/* Trip Card - Single */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">2. TripCard Component (Compact View)</h2>
            <p className="text-gray-600">Single trip card in compact format</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTripList.map((trip) => (
              <TripCard key={trip.id} trip={trip} isDetailedView={false} />
            ))}
          </div>
        </section>

        {/* Trip Card - Detailed */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">3. TripCard Component (Detailed View)</h2>
            <p className="text-gray-600">Trip cards with operator information</p>
          </div>
          <div className="space-y-4">
            {mockTripList.map((trip) => (
              <TripCard key={trip.id} trip={trip} isDetailedView={true} />
            ))}
          </div>
        </section>

        {/* Trip List */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">4. TripList Component</h2>
            <p className="text-gray-600">List of trips in compact format</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Available Trips</CardTitle>
              <CardDescription>All upcoming trips</CardDescription>
            </CardHeader>
            <CardContent>
              <TripList trips={mockTripList} isDetailedView={false} />
            </CardContent>
          </Card>
        </section>

        {/* Component Info */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Component Information</h2>
            <p className="text-gray-600">Technical details about the components</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">TripDetailView</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">Location:</p>
                  <code className="text-xs bg-gray-100 p-1 rounded">src/components/TripDetailView.tsx</code>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Full trip information display</li>
                    <li>Journey timeline</li>
                    <li>Bus and driver info</li>
                    <li>Amenities showcase</li>
                    <li>Operator ratings</li>
                    <li>Expandable policies</li>
                    <li>Sticky booking sidebar</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">TripCard & TripList</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">Location:</p>
                  <code className="text-xs bg-gray-100 p-1 rounded">src/components/TripCard.tsx</code>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Compact trip display</li>
                    <li>Quick booking option</li>
                    <li>Occupancy visualization</li>
                    <li>Operator info (optional)</li>
                    <li>Click for details</li>
                    <li>Responsive grid</li>
                    <li>List wrapper component</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mock Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">Location:</p>
                  <code className="text-xs bg-gray-100 p-1 rounded">src/mock/tripData.ts</code>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Includes:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>MockTrip interface</li>
                    <li>Sample trip data</li>
                    <li>Multiple trip variants</li>
                    <li>Route with stops</li>
                    <li>Bus amenities</li>
                    <li>Operator ratings</li>
                    <li>Trip policies</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">Routes:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li><code>/trip</code> - Trip showcase</li>
                    <li><code>/trip-detail/[tripId]</code> - Detail page</li>
                    <li><code>/components-showcase</code> - This page</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Mock Data Overview */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Mock Data Overview</h2>
            <p className="text-gray-600">Sample data used in components</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Route Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Route:</span> {mockTripData.route.routeName}
                </div>
                <div>
                  <span className="font-semibold">Origin:</span> {mockTripData.route.origin.city} ({mockTripData.route.origin.landmark})
                </div>
                <div>
                  <span className="font-semibold">Destination:</span> {mockTripData.route.destination.city} ({mockTripData.route.destination.landmark})
                </div>
                <div>
                  <span className="font-semibold">Distance:</span> {mockTripData.route.distance}km
                </div>
                <div>
                  <span className="font-semibold">Duration:</span> {mockTripData.route.estimatedDuration} minutes
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bus Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Type:</span> {mockTripData.bus.busType}
                </div>
                <div>
                  <span className="font-semibold">Number:</span> {mockTripData.bus.busNumber}
                </div>
                <div>
                  <span className="font-semibold">Total Seats:</span> {mockTripData.bus.totalSeats}
                </div>
                <div>
                  <span className="font-semibold">Model:</span> {mockTripData.bus.busModel}
                </div>
                <div>
                  <span className="font-semibold">Amenities:</span> {mockTripData.bus.amenities.join(', ')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Operator Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Company:</span> {mockTripData.operator.companyName}
                </div>
                <div>
                  <span className="font-semibold">Overall Rating:</span> {mockTripData.operator.rating.overall}/5
                </div>
                <div>
                  <span className="font-semibold">Total Reviews:</span> {mockTripData.operator.rating.totalReviews}
                </div>
                <div>
                  <span className="font-semibold">Contact:</span> {mockTripData.operator.phoneNumber}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trip Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Price/Seat:</span> {mockTripData.pricePerSeat.toLocaleString('vi-VN')} VND
                </div>
                <div>
                  <span className="font-semibold">Available Seats:</span> {mockTripData.availableSeats}
                </div>
                <div>
                  <span className="font-semibold">Booked Seats:</span> {mockTripData.bookedSeats.length}
                </div>
                <div>
                  <span className="font-semibold">Occupancy:</span> {((1 - mockTripData.availableSeats / mockTripData.bus.totalSeats) * 100).toFixed(0)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
