'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useGetTripQuery, useUpdateTripSeatPricingMutation } from '@/lib/store/services/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';

interface Seat {
  seatNumber: string;
  row: number;
  column: number;
  seatType: 'standard' | 'vip' | 'window' | 'aisle';
  position?: { x: number; y: number };
}

interface SeatMap {
  rows: number;
  columns: number;
  seats: Seat[];
}

const seatTypeColors = {
  standard: 'bg-gray-200 hover:bg-gray-300',
  vip: 'bg-yellow-300 hover:bg-yellow-400',
  window: 'bg-blue-200 hover:bg-blue-300',
  aisle: 'bg-green-200 hover:bg-green-300',
};

export default function TripSeatPricingPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const { data: trip, isLoading: isLoadingTrip } = useGetTripQuery(tripId);
  const [updateTripSeatPricing, { isLoading: isSaving }] = useUpdateTripSeatPricingMutation();

  const [seatPricing, setSeatPricing] = useState<Record<string, number>>({});
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [priceInput, setPriceInput] = useState('');

  const bus = trip?.bus;
  const seatMap: SeatMap | undefined = bus?.seatMap;
  const basePricePerSeat = trip?.pricePerSeat || 0;

  useEffect(() => {
    if (trip?.seatPricing) {
      const pricing: Record<string, number> = {};
      if (typeof trip.seatPricing === 'object') {
        Object.entries(trip.seatPricing).forEach(([key, value]) => {
          pricing[key] = value as number;
        });
      }
      setSeatPricing(pricing);
    }
  }, [trip]);

  const getSeatAtPosition = (row: number, column: number): Seat | undefined => {
    return seatMap?.seats.find(s => s.row === row && s.column === column);
  };

  const getSeatPrice = (seatNumber: string): number => {
    return seatPricing[seatNumber] || basePricePerSeat;
  };

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    setPriceInput(getSeatPrice(seat.seatNumber).toString());
  };

  const handleApplyPrice = () => {
    if (!selectedSeat) return;
    
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSeatPricing({
      ...seatPricing,
      [selectedSeat.seatNumber]: price,
    });
    
    toast.success(`Price set for seat ${selectedSeat.seatNumber}: $${price}`);
    setSelectedSeat(null);
    setPriceInput('');
  };

  const handleApplyToSeatType = (seatType: 'standard' | 'vip' | 'window' | 'aisle') => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!seatMap) return;

    const seatsOfType = seatMap.seats.filter(s => s.seatType === seatType);
    const updatedPricing = { ...seatPricing };
    
    seatsOfType.forEach(seat => {
      updatedPricing[seat.seatNumber] = price;
    });

    setSeatPricing(updatedPricing);
    toast.success(`Price set for all ${seatType} seats: $${price}`);
  };

  const handleResetToBase = () => {
    setSeatPricing({});
    toast.success('All seats reset to base price');
  };

  const handleSave = async () => {
    try {
      await updateTripSeatPricing({
        tripId,
        seatPricing,
      }).unwrap();
      
      toast.success('Seat pricing saved successfully');
      router.push('/admin/trips');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save seat pricing');
    }
  };

  if (isLoadingTrip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trip information...</p>
        </div>
      </div>
    );
  }

  if (!seatMap || !seatMap.seats || seatMap.seats.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Seat Map Available</h2>
          <p className="text-gray-600 mb-4">
            This bus doesn't have a seat map configured yet. Please configure the seat map first.
          </p>
          <Button onClick={() => router.push('/admin/trips')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Trip Management
          </Button>
        </div>
      </div>
    );
  }

  const groupedSeats = {
    standard: seatMap.seats.filter(s => s.seatType === 'standard'),
    vip: seatMap.seats.filter(s => s.seatType === 'vip'),
    window: seatMap.seats.filter(s => s.seatType === 'window'),
    aisle: seatMap.seats.filter(s => s.seatType === 'aisle'),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/trips')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Trip Management
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configure Seat Pricing</h1>
                <p className="text-sm text-gray-600">
                  {trip?.route?.routeName} • {bus?.licensePlate} • {new Date(trip?.departureTime).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/trips')}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Seat Pricing'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="col-span-3 space-y-6">
            {/* Base Price */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border-2 border-blue-200 p-6">
              <h3 className="text-sm font-semibold mb-2 text-blue-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Base Price
              </h3>
              <div className="text-3xl font-bold text-blue-900">${basePricePerSeat}</div>
              <p className="text-xs text-gray-600 mt-2">Default price per seat</p>
            </div>

            {/* Selected Seat */}
            {selectedSeat && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-200 p-6">
                <h3 className="text-sm font-semibold mb-3 text-green-900">
                  🎯 Selected: {selectedSeat.seatNumber}
                </h3>
                <Badge className="mb-3">{selectedSeat.seatType}</Badge>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="seatPrice" className="text-sm mb-1.5 block">
                      Set Price ($)
                    </Label>
                    <Input
                      id="seatPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="h-11 bg-white"
                      placeholder={basePricePerSeat.toString()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleApplyPrice();
                        }
                      }}
                    />
                  </div>
                  <Button onClick={handleApplyPrice} className="w-full h-11">
                    Apply to This Seat
                  </Button>
                </div>
              </div>
            )}

            {/* Bulk Pricing */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl shadow-sm border-2 border-purple-200 p-6">
              <h3 className="text-sm font-semibold mb-3 text-purple-900">🎨 Bulk Pricing</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bulkPrice" className="text-sm mb-1.5 block">
                    Price ($)
                  </Label>
                  <Input
                    id="bulkPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="h-11 bg-white"
                    placeholder="Enter price"
                  />
                </div>
                <div className="space-y-2">
                  {Object.entries(groupedSeats).map(([type, seats]) => (
                    seats.length > 0 && (
                      <Button
                        key={type}
                        onClick={() => handleApplyToSeatType(type as any)}
                        variant="outline"
                        size="sm"
                        className="w-full h-10"
                      >
                        Apply to {type} ({seats.length})
                      </Button>
                    )
                  ))}
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <Button 
              onClick={handleResetToBase} 
              variant="outline" 
              className="w-full h-11"
            >
              Reset All to Base Price
            </Button>

            {/* Instructions */}
            <div className="bg-amber-50 rounded-xl border-2 border-amber-200 p-6">
              <h3 className="text-sm font-semibold mb-3 text-amber-900">💡 How to Use:</h3>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Click a seat to set its individual price</li>
                <li>Or use bulk pricing to set all seats of same type</li>
                <li>Unpriced seats use base price (${basePricePerSeat})</li>
              </ol>
            </div>
          </div>

          {/* Main Grid Area */}
          <div className="col-span-9">
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-10">
              {/* Bus Front Indicator */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-4 px-6 rounded-xl mb-8 font-semibold text-lg shadow-md">
                🚍 Front of Bus
              </div>

              {/* Seat Grid */}
              <div className="space-y-4">
                {Array.from({ length: seatMap.rows }, (_, rowIndex) => {
                  const row = rowIndex + 1;
                  return (
                    <div key={row} className="flex justify-center gap-4">
                      <div className="w-12 flex items-center justify-center text-lg font-bold text-gray-700">
                        {row}
                      </div>
                      {Array.from({ length: seatMap.columns }, (_, colIndex) => {
                        const column = colIndex + 1;
                        const seat = getSeatAtPosition(row, column);
                        
                        if (!seat) {
                          return <div key={column} className="w-20 h-20"></div>;
                        }

                        const price = getSeatPrice(seat.seatNumber);
                        const hasCustomPrice = seatPricing[seat.seatNumber] !== undefined;
                        const isSelected = selectedSeat?.seatNumber === seat.seatNumber;
                        
                        return (
                          <div key={column} className="relative group">
                            <button
                              onClick={() => handleSeatClick(seat)}
                              className={`w-20 h-20 rounded-xl border-2 transition-all relative shadow-sm ${
                                seatTypeColors[seat.seatType]
                              } ${
                                isSelected 
                                  ? 'border-blue-600 ring-4 ring-blue-300' 
                                  : 'border-gray-400'
                              }`}
                              title={`${seat.seatNumber} - $${price}`}
                            >
                              <div className="text-sm font-bold">
                                {seat.seatNumber}
                              </div>
                              <div className={`text-xs ${hasCustomPrice ? 'text-green-700 font-bold' : 'text-gray-600'}`}>
                                ${price}
                              </div>
                            </button>
                            
                            {hasCustomPrice && (
                              <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
                                ✓
                              </div>
                            )}

                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                              {seat.seatNumber} - {seat.seatType} - ${price}
                              {!hasCustomPrice && ' (base)'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Statistics */}
              <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-lg font-bold text-gray-800 mb-1">
                      📊 Pricing Summary
                    </div>
                    <div className="text-sm text-gray-600">
                      Seats with custom pricing: <span className="font-bold text-green-600">{Object.keys(seatPricing).length}</span> / 
                      Using base price: <span className="font-bold text-blue-600">{seatMap.seats.length - Object.keys(seatPricing).length}</span>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Min Price</div>
                      <div className="text-xl font-bold text-gray-800">
                        ${Math.min(...seatMap.seats.map(s => getSeatPrice(s.seatNumber)))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Max Price</div>
                      <div className="text-xl font-bold text-gray-800">
                        ${Math.max(...seatMap.seats.map(s => getSeatPrice(s.seatNumber)))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Avg Price</div>
                      <div className="text-xl font-bold text-gray-800">
                        ${(seatMap.seats.reduce((sum, s) => sum + getSeatPrice(s.seatNumber), 0) / seatMap.seats.length).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
