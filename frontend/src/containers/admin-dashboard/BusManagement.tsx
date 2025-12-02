'use client';

import {
  useGetBusesQuery,
  useCreateBusMutation,
  useDeleteBusMutation,
  useGetOperatorsQuery,
} from '@/lib/store/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function BusManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  
  const { data, isLoading, error } = useGetBusesQuery({ page: currentPage, limit });
  const { data: operatorsData, isLoading: isLoadingOperators, error: operatorsError } = useGetOperatorsQuery({ page: 1, limit: 100 });
  const [createBus, { isLoading: isCreating }] = useCreateBusMutation();
  const [deleteBus, { isLoading: isDeleting }] = useDeleteBusMutation();

  const router = useRouter();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // Get operators and pagination info from RTK Query
  const operators = operatorsData?.results || [];
  const buses = data?.results || [];
  const totalPages = data?.totalPages || 1;
  const totalResults = data?.totalResults || 0;

  const [formData, setFormData] = useState({
    busNumber: '',
    licensePlate: '',
    busType: 'standard',
    totalSeats: 40,
    operatorId: '',
    amenities: '',
    busModel: '',
    yearOfManufacture: new Date().getFullYear(),
  });

  const handleCreate = async () => {
    try {
      // Validation
      if (!formData.busNumber || !formData.licensePlate) {
        toast.error('Bus Number and License Plate are required');
        return;
      }
      
      if (!formData.operatorId) {
        toast.error('Please select an operator');
        return;
      }
      
      // Transform data to match backend schema
      const busData = {
        busNumber: formData.busNumber,
        licensePlate: formData.licensePlate,
        busType: formData.busType,
        totalSeats: formData.totalSeats,
        operator: formData.operatorId, // Backend expects 'operator' not 'operatorId'
        amenities: formData.amenities ? formData.amenities.split(',').map(a => a.trim()) : [],
        busModel: formData.busModel,
        yearOfManufacture: formData.yearOfManufacture,
      };
      
      await createBus(busData).unwrap();
      toast.success('Bus created successfully');
      setDialogOpen(false);
      setFormData({ 
        busNumber: '',
        licensePlate: '',
        busType: 'standard',
        totalSeats: 40,
        operatorId: '',
        amenities: '',
        busModel: '',
        yearOfManufacture: new Date().getFullYear(),
      });
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create bus');
    }
  };

  const handleDelete = async () => {
    if (!selectedBusId) return;

    try {
      await deleteBus(selectedBusId).unwrap();
      toast.success('Bus deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedBusId(null);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete bus');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bus Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bus Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load buses</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bus Management</CardTitle>
          <Button onClick={() => setDialogOpen(true)}>+ Add Bus</Button>
        </CardHeader>
        <CardContent>
          {buses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No buses yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Seats</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.map((bus: any) => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-medium">{bus.licensePlate}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{bus.busType}</Badge>
                    </TableCell>
                    <TableCell>{bus.totalSeats} seats</TableCell>
                    <TableCell>{bus.operator?.companyName || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/buses/${bus.id}/seat-map`)}
                        >
                          Configure Seats
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedBusId(bus.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {buses.length} of {totalResults} buses
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
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    if (totalPages <= 5) return i + 1;
                    if (currentPage <= 3) return i + 1;
                    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
                    return currentPage - 2 + i;
                  }).map(page => (
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bus</DialogTitle>
            <DialogDescription>Enter bus details to add a new bus to the fleet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="busNumber" className="mb-1.5 block">Bus Number *</Label>
                <Input
                  id="busNumber"
                  value={formData.busNumber}
                  onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                  placeholder="VT-001"
                />
              </div>
              <div>
                <Label htmlFor="licensePlate" className="mb-1.5 block">License Plate *</Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder="51B-12345"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="operator" className="mb-1.5 block">Operator *</Label>
              <Select 
                value={formData.operatorId} 
                onValueChange={(value) => setFormData({ ...formData, operatorId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op: any) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="busType" className="mb-1.5 block">Bus Type *</Label>
                <Select 
                  value={formData.busType} 
                  onValueChange={(value) => setFormData({ ...formData, busType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="limousine">Limousine</SelectItem>
                    <SelectItem value="sleeper">Sleeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="totalSeats" className="mb-1.5 block">Total Seats *</Label>
                <Input
                  id="totalSeats"
                  type="number"
                  min={10}
                  max={60}
                  value={formData.totalSeats}
                  onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="busModel" className="mb-1.5 block">Bus Model</Label>
                <Input
                  id="busModel"
                  value={formData.busModel}
                  onChange={(e) => setFormData({ ...formData, busModel: e.target.value })}
                  placeholder="Hyundai Universe"
                />
              </div>
              <div>
                <Label htmlFor="year" className="mb-1.5 block">Year of Manufacture</Label>
                <Input
                  id="year"
                  type="number"
                  min={2000}
                  max={new Date().getFullYear()}
                  value={formData.yearOfManufacture}
                  onChange={(e) => setFormData({ ...formData, yearOfManufacture: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="amenities" className="mb-1.5 block">Amenities (comma-separated)</Label>
              <Input
                id="amenities"
                value={formData.amenities}
                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="AC, WiFi, USB Charging, Water"
              />
              <p className="text-xs text-gray-500 mt-1">Example: AC, WiFi, USB Charging</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Bus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bus</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bus? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
