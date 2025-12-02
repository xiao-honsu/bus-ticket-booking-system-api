'use client';

import React from 'react';
import TripDetailView from '@/components/TripDetailView';
import { mockTripList } from '@/mock/tripData';
import { notFound } from 'next/navigation';

interface TripDetailPageProps {
  params: Promise<{
    tripId: string;
  }>;
}

export default function TripDetailPage({ params }: TripDetailPageProps) {
  const { tripId } = React.use(params);
  const trip = mockTripList.find((t) => t.id === tripId);

  if (!trip) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <TripDetailView trip={trip} />
    </main>
  );
}
