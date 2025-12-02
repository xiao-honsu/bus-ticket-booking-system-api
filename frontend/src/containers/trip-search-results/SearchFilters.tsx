'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

interface SearchFiltersProps {
  onFilterChange?: (filters: any) => void;
}

export default function SearchFilters({ onFilterChange }: SearchFiltersProps) {
  const [departureTime, setDepartureTime] = useState('any');
  const [busTypes, setBusTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState('any');
  const [amenities, setAmenities] = useState<string[]>([]);

  const handleDepartureTimeChange = (value: string) => {
    setDepartureTime(value);
    if (value !== 'any') {
      sessionStorage.setItem('departureTimeFilter', value);
    } else {
      sessionStorage.removeItem('departureTimeFilter');
    }
  };

  const handleBusTypeChange = (type: string, checked: boolean) => {
    const updated = checked ? [...busTypes, type] : busTypes.filter((t) => t !== type);
    setBusTypes(updated);
    if (updated.length > 0) {
      sessionStorage.setItem('busTypeFilter', updated.join(','));
    } else {
      sessionStorage.removeItem('busTypeFilter');
    }
  };

  const handlePriceRangeChange = (value: string) => {
    setPriceRange(value);
    if (value !== 'any') {
      sessionStorage.setItem('priceFilter', value);
    } else {
      sessionStorage.removeItem('priceFilter');
    }
  };

  const handleAmenitiesChange = (amenity: string, checked: boolean) => {
    const updated = checked
      ? [...amenities, amenity]
      : amenities.filter((a) => a !== amenity);
    setAmenities(updated);
    if (updated.length > 0) {
      sessionStorage.setItem('amenitiesFilter', updated.join(','));
    } else {
      sessionStorage.removeItem('amenitiesFilter');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-3 block">Departure Time</Label>
          <Select value={departureTime} onValueChange={handleDepartureTimeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="morning">Morning (6AM - 12PM)</SelectItem>
              <SelectItem value="afternoon">Afternoon (12PM - 6PM)</SelectItem>
              <SelectItem value="evening">Evening (6PM - 12AM)</SelectItem>
              <SelectItem value="night">Night (12AM - 6AM)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div>
          <Label className="mb-3 block">Bus Type</Label>
          <div className="space-y-3">
            {['standard', 'limousine', 'sleeper'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={busTypes.includes(type)}
                  onCheckedChange={(checked) => handleBusTypeChange(type, checked as boolean)}
                />
                <label
                  htmlFor={type}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                >
                  {type}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="mb-3 block">Price Range (VND)</Label>
          <Select value={priceRange} onValueChange={handlePriceRangeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any price</SelectItem>
              <SelectItem value="300000-400000">300K - 400K</SelectItem>
              <SelectItem value="400000-500000">400K - 500K</SelectItem>
              <SelectItem value="500000-600000">500K - 600K</SelectItem>
              <SelectItem value="600000-999999">600K+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div>
          <Label className="mb-3 block">Amenities</Label>
          <div className="space-y-3">
            {['WiFi', 'Toilet', 'Air Conditioning', 'USB Charging'].map((amenity) => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox
                  id={amenity.toLowerCase().replace(' ', '-')}
                  checked={amenities.includes(amenity)}
                  onCheckedChange={(checked) => handleAmenitiesChange(amenity, checked as boolean)}
                />
                <label
                  htmlFor={amenity.toLowerCase().replace(' ', '-')}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {amenity}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
