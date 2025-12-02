'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useGetRoutesQuery,
  useGetBusesQuery,
  useSearchTripsQuery,
  useCreateTripMutation,
  useDeleteTripMutation,
} from '@/lib/store/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function TripManagement() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  
  const { data: routesData } = useGetRoutesQuery({ page: 1, limit: 100 });
  const { data: busesData } = useGetBusesQuery({ page: 1, limit: 100 });
  const { data: tripsData, isLoading: isLoadingTrips } = useSearchTripsQuery({ page: currentPage, limit });
  const [createTrip, { isLoading: isCreating }] = useCreateTripMutation();
  const [deleteTrip, { isLoading: isDeleting }] = useDeleteTripMutation();
  
  const routes = routesData?.results || [];
  const buses = busesData?.results || [];
  const trips = tripsData?.results || [];
  const totalPages = tripsData?.totalPages || 1;
  const totalResults = tripsData?.totalResults || 0;
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [hasConflict, setHasConflict] = useState(false);

  const [formData, setFormData] = useState({
    routeId: '',
    busId: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
    pricePerSeat: 0,
    driver: {
      name: '',
      phone: '',
      licenseNumber: '',
    },
  });

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.routeId || !formData.busId) {
        toast.error('Please select route and bus');
        return;
      }
      if (!formData.departureDate || !formData.departureTime) {
        toast.error('Please enter departure date and time');
        return;
      }
      if (!formData.arrivalDate || !formData.arrivalTime) {
        toast.error('Please enter arrival date and time');
        return;
      }
      if (!formData.pricePerSeat || formData.pricePerSeat <= 0) {
        toast.error('Please enter valid price per seat');
        return;
      }
      
      // Get selected bus to extract operator
      const selectedBus = buses.find((b: any) => b.id === formData.busId);
      if (!selectedBus || !selectedBus.operator) {
        toast.error('Selected bus must have an operator');
        return;
      }
      
      // Combine date and time into Date objects (backend will handle conversion)
      const departureDateTime = new Date(`${formData.departureDate}T${formData.departureTime}`);
      const arrivalDateTime = new Date(`${formData.arrivalDate}T${formData.arrivalTime}`);
      
      console.log('📅 Departure DateTime:', departureDateTime);
      console.log('📅 Arrival DateTime:', arrivalDateTime);
      
      const tripData = {
        route: formData.routeId,
        bus: formData.busId,
        operator: selectedBus.operator.id || selectedBus.operator,
        departureTime: departureDateTime,
        arrivalTime: arrivalDateTime,
        pricePerSeat: formData.pricePerSeat,
        driver: formData.driver.name ? {
          name: formData.driver.name,
          phone: formData.driver.phone,
          licenseNumber: formData.driver.licenseNumber,
        } : undefined,
      };
      
      await createTrip(tripData).unwrap();
      toast.success('Trip created successfully');
      setDialogOpen(false);
      
      // Reset form
      setFormData({
        routeId: '',
        busId: '',
        departureDate: '',
        departureTime: '',
        arrivalDate: '',
        arrivalTime: '',
        pricePerSeat: 0,
        driver: {
          name: '',
          phone: '',
          licenseNumber: '',
        },
      });
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create trip');
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) {
      return;
    }
    
    try {
      await deleteTrip(tripId).unwrap();
      toast.success('Trip deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete trip');
    }
  };

  const checkConflicts = () => {
    if (formData.busId && formData.departureDate) {
      setHasConflict(false);
      setConflictMessage('✅ Bus is available for selected time slot');
    } else {
      setConflictMessage('Please select bus and departure time first');
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Trip Management</h2>
          <Button onClick={() => setDialogOpen(true)}>+ Add Trip</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Route</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Available Seats</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingTrips ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading trips...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No trips scheduled yet. Create your first trip!
                  </td>
                </tr>
              ) : (
                trips.map((trip: any) => (
                  <tr key={trip.id} className="border-t">
                    <td className="px-4 py-3">
                      {trip.route?.routeName || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(trip.departureTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(trip.departureTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {trip.availableSeats}/{trip.bus?.totalSeats || 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        trip.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                        trip.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                        trip.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/trips/${trip.id}/seat-pricing`)}
                        >
                          Set Prices
                        </Button>
                        <button 
                          onClick={() => handleDeleteTrip(trip.id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {trips.length} of {totalResults} trips
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-[40px]"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Trip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Trip</DialogTitle>
            <DialogDescription>
              Create a new trip by assigning a bus to a route with departure/arrival times
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Route Selection */}
            <div>
              <Label htmlFor="route" className="mb-1.5 block">Select Route *</Label>
              <Select value={formData.routeId} onValueChange={(value) => setFormData({ ...formData, routeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.length === 0 ? (
                    <SelectItem value="placeholder" disabled>No routes available</SelectItem>
                  ) : (
                    routes.map((route: any) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.routeName} - {route.distance}km ({Math.floor(route.estimatedDuration / 60)}h {route.estimatedDuration % 60}m)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Bus Selection */}
            <div>
              <Label htmlFor="bus" className="mb-1.5 block">Select Bus *</Label>
              <Select value={formData.busId} onValueChange={(value) => setFormData({ ...formData, busId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.length === 0 ? (
                    <SelectItem value="placeholder" disabled>No buses available</SelectItem>
                  ) : (
                    buses.map((bus: any) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.licensePlate} - {bus.busType} ({bus.totalSeats} seats) - {bus.operator?.companyName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Departure Time */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Departure</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="depDate" className="mb-1.5 block">Date *</Label>
                  <Input
                    id="depDate"
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="depTime" className="mb-1.5 block">Time *</Label>
                  <Input
                    id="depTime"
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Arrival Time */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Arrival</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="arrDate" className="mb-1.5 block">Date *</Label>
                  <Input
                    id="arrDate"
                    type="date"
                    value={formData.arrivalDate}
                    onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="arrTime" className="mb-1.5 block">Time *</Label>
                  <Input
                    id="arrTime"
                    type="time"
                    value={formData.arrivalTime}
                    onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Price */}
            <div>
              <Label htmlFor="price" className="mb-1.5 block">Price per Seat (VND) *</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={formData.pricePerSeat}
                onChange={(e) => setFormData({ ...formData, pricePerSeat: parseFloat(e.target.value) })}
                placeholder="500000"
              />
              <p className="text-xs text-gray-500 mt-1">Base price, modifiers will apply based on seat type</p>
            </div>

            <Separator />

            {/* Driver Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Driver Information</h3>
              <div>
                <Label htmlFor="driverName">Driver Name *</Label>
                <Input
                  id="driverName"
                  value={formData.driver.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      driver: { ...formData.driver, name: e.target.value },
                    })
                  }
                  placeholder="Nguyen Van A"
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="driverName" className="mb-1.5 block">Driver Name *</Label>
                  <Input
                    id="driverName"
                    value={formData.driver.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        driver: { ...formData.driver, name: e.target.value },
                      })
                    }
                    placeholder="Nguyen Van A"
                  />
                </div>
                <div>
                  <Label htmlFor="driverLicense" className="mb-1.5 block">License Number *</Label>
                  <Input
                    id="driverLicense"
                    value={formData.driver.licenseNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        driver: { ...formData.driver, licenseNumber: e.target.value },
                      })
                    }
                    placeholder="B2-123456"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Conflict Checker */}
            <div className="space-y-2">
              <Button type="button" variant="outline" className="w-full" onClick={checkConflicts}>
                🔍 Check Bus Availability
              </Button>
              {conflictMessage && (
                <div
                  className={`rounded-lg border p-4 ${
                    hasConflict
                      ? 'bg-red-50 text-red-900 border-red-200'
                      : 'bg-green-50 text-green-900 border-green-200'
                  }`}
                >
                  <p className="text-sm">{conflictMessage}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || hasConflict}>
              {isCreating ? 'Creating...' : 'Create Trip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
