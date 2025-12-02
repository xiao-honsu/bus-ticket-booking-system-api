'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import TripCard from './TripCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { searchTrips, SearchFilters, PaginationParams } from '@/mock/tripData';

interface TripListProps {
  origin: string;
  destination: string;
  date: string;
}

export default function TripList({ origin, destination, date }: TripListProps) {
  const [sortBy, setSortBy] = useState('departure');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchResults, setSearchResults] = useState(searchTrips({}, { page: 1, limit: 8 }));
  const [isClient, setIsClient] = useState(false);
  const itemsPerPage = 8;

  // Helper function to load filters from sessionStorage
  const loadFiltersFromStorage = (): SearchFilters => {
    const appliedFilters: SearchFilters = {};

    const priceFilter = sessionStorage.getItem('priceFilter');
    if (priceFilter) {
      const [min, max] = priceFilter.split('-').map(Number);
      appliedFilters.priceRange = { min, max };
    }

    const timeFilter = sessionStorage.getItem('departureTimeFilter');
    if (timeFilter) {
      switch (timeFilter) {
        case 'morning':
          appliedFilters.departureTimeRange = { start: '6', end: '12' };
          break;
        case 'afternoon':
          appliedFilters.departureTimeRange = { start: '12', end: '18' };
          break;
        case 'evening':
          appliedFilters.departureTimeRange = { start: '18', end: '24' };
          break;
        case 'night':
          appliedFilters.departureTimeRange = { start: '0', end: '6' };
          break;
      }
    }

    const busTypeFilter = sessionStorage.getItem('busTypeFilter');
    if (busTypeFilter) {
      appliedFilters.busTypes = busTypeFilter.split(',').filter(t => t);
    }

    const amenitiesFilter = sessionStorage.getItem('amenitiesFilter');
    if (amenitiesFilter) {
      appliedFilters.amenities = amenitiesFilter.split(',').filter(a => a);
    }

    return appliedFilters;
  };

  // Mount client and initial load
  useEffect(() => {
    setIsClient(true);
    const initialFilters = loadFiltersFromStorage();
    setFilters(initialFilters);
    const results = searchTrips(initialFilters, { page: 1, limit: itemsPerPage });
    setSearchResults(results);
    setCurrentPage(1);
  }, []);

  // Watch for filter changes and reset to page 1
  useEffect(() => {
    if (!isClient) return;

    // Set up listener for storage changes (from other tabs/windows)
    const handleStorageChange = () => {
      const updatedFilters = loadFiltersFromStorage();
      setFilters(updatedFilters);
      const results = searchTrips(updatedFilters, { page: 1, limit: itemsPerPage });
      setSearchResults(results);
      setCurrentPage(1);
    };

    // Custom event listener for storage changes from same tab
    window.addEventListener('storage', handleStorageChange);
    
    // Also check filters on interval to catch changes from same-tab writes
    const interval = setInterval(() => {
      const updatedFilters = loadFiltersFromStorage();
      setFilters((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(updatedFilters)) {
          const results = searchTrips(updatedFilters, { page: 1, limit: itemsPerPage });
          setSearchResults(results);
          setCurrentPage(1);
          return updatedFilters;
        }
        return prev;
      });
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isClient]);

  // Handle page changes
  useEffect(() => {
    if (!isClient) return;
    const results = searchTrips(filters, { page: currentPage, limit: itemsPerPage });
    setSearchResults(results);
  }, [currentPage, isClient]);

  // Sort trips based on selection
  let sortedTrips = [...searchResults.results];
  sortedTrips.sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.pricePerSeat - b.pricePerSeat;
      case 'price-high':
        return b.pricePerSeat - a.pricePerSeat;
      case 'departure':
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      case 'duration':
        const durationA =
          new Date(a.arrivalTime).getTime() - new Date(a.departureTime).getTime();
        const durationB =
          new Date(b.arrivalTime).getTime() - new Date(b.departureTime).getTime();
        return durationA - durationB;
      default:
        return 0;
    }
  });

  if (!isClient) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (sortedTrips.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600 text-lg">No trips found for your search criteria.</p>
        <p className="text-gray-500 text-sm mt-2">Try adjusting your search parameters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with sort */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">Available Trips</h2>
          <p className="text-gray-600 text-sm">
            {searchResults.total} trips found ({searchResults.page} of {searchResults.totalPages})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="departure">Departure Time</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="duration">Duration: Shortest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trip Cards */}
      <div className="space-y-4">
        {sortedTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>

      {/* Pagination */}
      {searchResults.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex gap-1">
            {Array.from({ length: searchResults.totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-10"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, searchResults.totalPages))
            }
            disabled={currentPage === searchResults.totalPages}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Page info */}
      <div className="text-center text-sm text-gray-600 mt-4">
        Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
        {Math.min(currentPage * itemsPerPage, searchResults.total)} of {searchResults.total}{' '}
        trips
      </div>
    </div>
  );
}
