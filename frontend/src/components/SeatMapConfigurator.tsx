'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateBusSeatMapMutation } from '@/lib/store/services/api';
import { toast } from 'sonner';

interface Seat {
  seatNumber: string;
  row: number;
  column: number;
  seatType: 'standard' | 'vip' | 'window' | 'aisle';
  position?: { x: number; y: number };
}

interface SeatMap {
  name?: string;
  rows: number;
  columns: number;
  layout?: any;
  seats: Seat[];
}

interface SeatMapConfiguratorProps {
  busId: string;
  currentSeatMap?: SeatMap;
  open: boolean;
  onClose: () => void;
}

const seatTypeColors = {
  standard: 'bg-gray-200 hover:bg-gray-300',
  vip: 'bg-yellow-300 hover:bg-yellow-400',
  window: 'bg-blue-200 hover:bg-blue-300',
  aisle: 'bg-green-200 hover:bg-green-300',
};

const SeatMapConfigurator: React.FC<SeatMapConfiguratorProps> = ({
  busId,
  currentSeatMap,
  open,
  onClose,
}) => {
  const [rows, setRows] = useState(currentSeatMap?.rows || 10);
  const [columns, setColumns] = useState(currentSeatMap?.columns || 4);
  const [seats, setSeats] = useState<Seat[]>(currentSeatMap?.seats || []);
  const [selectedSeatType, setSelectedSeatType] = useState<'standard' | 'vip' | 'window' | 'aisle'>('standard');
  
  const [updateSeatMap, { isLoading }] = useUpdateBusSeatMapMutation();

  useEffect(() => {
    if (currentSeatMap) {
      setRows(currentSeatMap.rows);
      setColumns(currentSeatMap.columns);
      setSeats(currentSeatMap.seats || []);
    }
  }, [currentSeatMap]);

  const handleLayoutChange = (templateRows: number, templateColumns: number) => {
    setRows(templateRows);
    setColumns(templateColumns);
    
    // Generate default seats for the new layout
    const newSeats: Seat[] = [];
    for (let row = 1; row <= templateRows; row++) {
      for (let col = 1; col <= templateColumns; col++) {
        newSeats.push({
          seatNumber: `${row}${String.fromCharCode(64 + col)}`,
          row,
          column: col,
          seatType: 'standard',
        });
      }
    }
    setSeats(newSeats);
  };

  const handleSeatClick = (row: number, column: number) => {
    const seatIndex = seats.findIndex(s => s.row === row && s.column === column);
    
    if (seatIndex >= 0) {
      // Update existing seat
      const updatedSeats = [...seats];
      updatedSeats[seatIndex] = {
        ...updatedSeats[seatIndex],
        seatType: selectedSeatType,
      };
      setSeats(updatedSeats);
    } else {
      // Add new seat
      const newSeat: Seat = {
        seatNumber: `${row}${String.fromCharCode(64 + column)}`,
        row,
        column,
        seatType: selectedSeatType,
      };
      setSeats([...seats, newSeat]);
    }
  };

  const handleRemoveSeat = (row: number, column: number) => {
    setSeats(seats.filter(s => !(s.row === row && s.column === column)));
  };

  const getSeatAtPosition = (row: number, column: number): Seat | undefined => {
    return seats.find(s => s.row === row && s.column === column);
  };

  const handleSave = async () => {
    try {
      const seatMapData: SeatMap = {
        rows,
        columns,
        seats,
      };

      await updateSeatMap({ busId, seatMapData }).unwrap();
      
      toast.success('Seat map updated successfully');
      
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update seat map');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full h-[98vh] max-h-[98vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-8 py-6 border-b">
          <DialogTitle className="text-2xl">Configure Seat Map</DialogTitle>
          <DialogDescription className="text-base">
            Design your bus layout by selecting seat types and arranging seats on the grid
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-8 py-6">

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Control Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
              <Label className="text-base font-semibold mb-3 block">📐 Layout Templates</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => handleLayoutChange(10, 4)}
                >
                  Standard (10×4)
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => handleLayoutChange(12, 3)}
                >
                  Limousine (12×3)
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => handleLayoutChange(8, 2)}
                >
                  Sleeper (8×2)
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
              <Label className="text-base font-semibold mb-3 block">⚙️ Custom Layout</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="rows" className="text-sm mb-1.5 block">Rows</Label>
                  <Input
                    id="rows"
                    type="number"
                    min="1"
                    max="20"
                    value={rows}
                    onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="columns" className="text-sm mb-1.5 block">Columns</Label>
                  <Input
                    id="columns"
                    type="number"
                    min="1"
                    max="6"
                    value={columns}
                    onChange={(e) => setColumns(parseInt(e.target.value) || 1)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-4">
              <div className="text-base font-semibold mb-3 text-blue-900">🎨 Painting Mode</div>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm mb-2 block">Select Seat Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedSeatType('standard')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedSeatType === 'standard' 
                          ? 'bg-gray-200 border-gray-500 ring-2 ring-blue-500 shadow-md' 
                          : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow'
                      }`}
                    >
                      <div className="text-sm font-semibold">Standard</div>
                    </button>
                    <button
                      onClick={() => setSelectedSeatType('vip')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedSeatType === 'vip' 
                          ? 'bg-yellow-300 border-yellow-500 ring-2 ring-blue-500 shadow-md' 
                          : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow'
                      }`}
                    >
                      <div className="text-sm font-semibold">VIP</div>
                    </button>
                    <button
                      onClick={() => setSelectedSeatType('window')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedSeatType === 'window' 
                          ? 'bg-blue-200 border-blue-500 ring-2 ring-blue-500 shadow-md' 
                          : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow'
                      }`}
                    >
                      <div className="text-sm font-semibold">Window</div>
                    </button>
                    <button
                      onClick={() => setSelectedSeatType('aisle')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedSeatType === 'aisle' 
                          ? 'bg-green-200 border-green-500 ring-2 ring-blue-500 shadow-md' 
                          : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow'
                      }`}
                    >
                      <div className="text-sm font-semibold">Aisle</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-4 mt-4">
              <div className="text-sm font-semibold mb-2 text-amber-900">💡 How to Use:</div>
              <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
                <li>Select seat type from buttons above</li>
                <li>Click seats on the grid to paint them</li>
                <li>Right-click to remove a seat</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-sm font-semibold text-blue-600">💰 Note: Seat pricing will be configured per trip</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-4 mt-4">
              <div className="text-sm font-semibold mb-3">Color Legend:</div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg border-2 border-gray-400 flex-shrink-0"></div>
                  <span className="text-sm font-medium">Standard</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-300 rounded-lg border-2 border-yellow-500 flex-shrink-0"></div>
                  <span className="text-sm font-medium">VIP</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-200 rounded-lg border-2 border-blue-400 flex-shrink-0"></div>
                  <span className="text-sm font-medium">Window</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-200 rounded-lg border-2 border-green-400 flex-shrink-0"></div>
                  <span className="text-sm font-medium">Aisle</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seat Grid */}
          <div className="lg:col-span-4">
            <div className="border-2 border-gray-300 rounded-xl p-8 bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-3 px-4 rounded-lg mb-6 font-semibold text-base shadow-md">
                🚍 Front of Bus
              </div>
              
              <div className="space-y-3">
                {Array.from({ length: rows }, (_, rowIndex) => {
                  const row = rowIndex + 1;
                  return (
                    <div key={row} className="flex justify-center gap-3">
                      <div className="w-10 flex items-center justify-center text-base font-bold text-gray-700">
                        {row}
                      </div>
                      {Array.from({ length: columns }, (_, colIndex) => {
                        const column = colIndex + 1;
                        const seat = getSeatAtPosition(row, column);
                        
                        return (
                          <div key={column} className="relative group">
                            <button
                              onClick={() => handleSeatClick(row, column)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                handleRemoveSeat(row, column);
                              }}
                              className={`w-16 h-16 rounded-lg border-2 transition-all relative ${
                                seat
                                  ? `${seatTypeColors[seat.seatType]} border-gray-400`
                                  : 'bg-white hover:bg-gray-100 border-dashed border-gray-300'
                              }`}
                              title={
                                seat
                                  ? `${seat.seatNumber} - ${seat.seatType}`
                                  : 'Click to add seat'
                              }
                            >
                              {seat && (
                                <div className="text-sm font-bold">
                                  {seat.seatNumber}
                                </div>
                              )}
                              {!seat && (
                                <div className="text-lg text-gray-400 font-bold">+</div>
                              )}
                            </button>
                            
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              {seat ? (
                                <>
                                  {seat.seatNumber} - {seat.seatType}
                                </>
                              ) : (
                                'Click to add seat'
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-white rounded-xl border-2 border-gray-300 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-base font-semibold text-gray-800">
                    💺 Total Seats: <span className="text-blue-600">{seats.length}</span>
                  </div>
                  <div className="text-sm text-gray-600 flex gap-3">
                    <span className="font-medium">{seats.filter(s => s.seatType === 'standard').length} Standard</span>
                    <span className="font-medium">{seats.filter(s => s.seatType === 'vip').length} VIP</span>
                    <span className="font-medium">{seats.filter(s => s.seatType === 'window').length} Window</span>
                    <span className="font-medium">{seats.filter(s => s.seatType === 'aisle').length} Aisle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        <DialogFooter className="px-8 py-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="px-6 h-11">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="px-8 h-11">
            {isLoading ? 'Saving...' : 'Save Seat Map'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SeatMapConfigurator;
