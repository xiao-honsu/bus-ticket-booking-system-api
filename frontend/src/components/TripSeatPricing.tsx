'use client';

import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

interface TripSeatPricingProps {
  tripId: string;
  bus: {
    id: string;
    seatMap?: SeatMap;
  };
  basePricePerSeat: number;
  currentSeatPricing?: Record<string, number>;
  open: boolean;
  onClose: () => void;
  onSave: (seatPricing: Record<string, number>) => Promise<void>;
}

const seatTypeColors = {
  standard: 'bg-gray-200 hover:bg-gray-300',
  vip: 'bg-yellow-300 hover:bg-yellow-400',
  window: 'bg-blue-200 hover:bg-blue-300',
  aisle: 'bg-green-200 hover:bg-green-300',
};

const TripSeatPricing: React.FC<TripSeatPricingProps> = ({
  tripId,
  bus,
  basePricePerSeat,
  currentSeatPricing,
  open,
  onClose,
  onSave,
}) => {
  const [seatPricing, setSeatPricing] = useState<Record<string, number>>({});
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentSeatPricing) {
      setSeatPricing(currentSeatPricing);
    }
  }, [currentSeatPricing]);

  const seatMap = bus.seatMap;
  
  if (!seatMap || !seatMap.seats || seatMap.seats.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Seat Pricing</DialogTitle>
            <DialogDescription>
              This bus doesn't have a seat map configured yet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const getSeatAtPosition = (row: number, column: number): Seat | undefined => {
    return seatMap.seats.find(s => s.row === row && s.column === column);
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
    setIsSaving(true);
    try {
      await onSave(seatPricing);
      toast.success('Seat pricing saved successfully');
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save seat pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const groupedSeats = {
    standard: seatMap.seats.filter(s => s.seatType === 'standard'),
    vip: seatMap.seats.filter(s => s.seatType === 'vip'),
    window: seatMap.seats.filter(s => s.seatType === 'window'),
    aisle: seatMap.seats.filter(s => s.seatType === 'aisle'),
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Seat Pricing for Trip</DialogTitle>
          <DialogDescription>
            Set individual prices for each seat or apply bulk pricing by seat type
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Control Panel */}
          <div className="space-y-4">
            <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
              <div className="text-sm font-medium mb-2 text-blue-900">💰 Base Price</div>
              <div className="text-2xl font-bold text-blue-900">${basePricePerSeat}</div>
              <p className="text-xs text-gray-600 mt-1">Default price per seat</p>
            </div>

            {selectedSeat && (
              <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                <div className="text-sm font-medium mb-2 text-green-900">
                  🎯 Selected: {selectedSeat.seatNumber}
                </div>
                <Badge className="mb-2">{selectedSeat.seatType}</Badge>
                <div className="space-y-2">
                  <Label htmlFor="seatPrice">Set Price ($)</Label>
                  <Input
                    id="seatPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="bg-white"
                    placeholder={basePricePerSeat.toString()}
                  />
                  <Button onClick={handleApplyPrice} className="w-full" size="sm">
                    Apply to This Seat
                  </Button>
                </div>
              </div>
            )}

            <div className="border rounded-lg p-3 bg-purple-50 border-purple-200">
              <div className="text-sm font-medium mb-2 text-purple-900">🎨 Bulk Pricing</div>
              <div className="space-y-2">
                <Label htmlFor="bulkPrice">Price ($)</Label>
                <Input
                  id="bulkPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="bg-white"
                  placeholder="Enter price"
                />
                <div className="space-y-1">
                  {Object.entries(groupedSeats).map(([type, seats]) => (
                    seats.length > 0 && (
                      <Button
                        key={type}
                        onClick={() => handleApplyToSeatType(type as any)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Apply to {type} ({seats.length})
                      </Button>
                    )
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleResetToBase} variant="outline" className="w-full">
              Reset All to Base Price
            </Button>

            <div className="pt-2 space-y-2">
              <div className="text-sm font-medium">💡 Instructions:</div>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Click a seat to set its individual price</li>
                <li>Or use bulk pricing to set all seats of same type</li>
                <li>Unpriced seats use base price (${basePricePerSeat})</li>
              </ol>
            </div>
          </div>

          {/* Seat Grid */}
          <div className="md:col-span-3">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-center mb-4 font-semibold text-sm">
                Front of Bus
              </div>
              
              <div className="space-y-2">
                {Array.from({ length: seatMap.rows }, (_, rowIndex) => {
                  const row = rowIndex + 1;
                  return (
                    <div key={row} className="flex justify-center gap-2">
                      <div className="w-8 flex items-center justify-center text-sm font-medium">
                        {row}
                      </div>
                      {Array.from({ length: seatMap.columns }, (_, colIndex) => {
                        const column = colIndex + 1;
                        const seat = getSeatAtPosition(row, column);
                        
                        if (!seat) {
                          return <div key={column} className="w-12 h-12"></div>;
                        }

                        const price = getSeatPrice(seat.seatNumber);
                        const hasCustomPrice = seatPricing[seat.seatNumber] !== undefined;
                        const isSelected = selectedSeat?.seatNumber === seat.seatNumber;
                        
                        return (
                          <div key={column} className="relative group">
                            <button
                              onClick={() => handleSeatClick(seat)}
                              className={`w-12 h-12 rounded border-2 transition-all relative ${
                                seatTypeColors[seat.seatType]
                              } ${
                                isSelected 
                                  ? 'border-blue-600 ring-2 ring-blue-500' 
                                  : 'border-gray-400'
                              }`}
                              title={`${seat.seatNumber} - $${price}`}
                            >
                              <div className="text-xs font-semibold">
                                {seat.seatNumber}
                              </div>
                              <div className={`text-[10px] ${hasCustomPrice ? 'text-green-700 font-bold' : 'text-gray-600'}`}>
                                ${price}
                              </div>
                            </button>
                            
                            {hasCustomPrice && (
                              <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                ✓
                              </div>
                            )}

                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
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

              <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-300">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <strong>Seats with custom pricing:</strong> {Object.keys(seatPricing).length}
                  </div>
                  <div>
                    <strong>Using base price:</strong> {seatMap.seats.length - Object.keys(seatPricing).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Seat Pricing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TripSeatPricing;
