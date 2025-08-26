import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Save, X, Plus, Trash2, Building } from 'lucide-react';

interface BusinessLocation {
  business_id: string;
  locations: string[];
}

interface CustomLocationData {
  businesses: BusinessLocation[];
}

interface CustomLocationEditorProps {
  data?: CustomLocationData;
  onSave: (data: CustomLocationData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CustomLocationEditor: React.FC<CustomLocationEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [businesses, setBusinesses] = useState<BusinessLocation[]>(
    data?.businesses || [{ business_id: '', locations: [] }]
  );

  useEffect(() => {
    if (data?.businesses) {
      setBusinesses(data.businesses.length > 0 ? data.businesses : [{ business_id: '', locations: [] }]);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty businesses and validate
    const validBusinesses = businesses
      .filter(b => b.business_id.trim() && b.locations.length > 0)
      .map(b => ({
        business_id: b.business_id.trim(),
        locations: b.locations.filter(l => l.trim()).map(l => l.trim())
      }));

    onSave({ businesses: validBusinesses });
  };

  const addBusiness = () => {
    setBusinesses(prev => [...prev, { business_id: '', locations: [] }]);
  };

  const removeBusiness = (index: number) => {
    setBusinesses(prev => prev.filter((_, i) => i !== index));
  };

  const updateBusinessId = (index: number, businessId: string) => {
    setBusinesses(prev => prev.map((b, i) => 
      i === index ? { ...b, business_id: businessId } : b
    ));
  };

  const addLocationToBusiness = (businessIndex: number, location: string) => {
    if (!location.trim()) return;
    
    setBusinesses(prev => prev.map((b, i) => 
      i === businessIndex 
        ? { 
            ...b, 
            locations: [...b.locations, location.trim()].slice(0, 25) // Max 25 locations
          }
        : b
    ));
  };

  const removeLocationFromBusiness = (businessIndex: number, locationIndex: number) => {
    setBusinesses(prev => prev.map((b, i) => 
      i === businessIndex 
        ? { ...b, locations: b.locations.filter((_, li) => li !== locationIndex) }
        : b
    ));
  };

  const addBulkLocations = (businessIndex: number, locationsText: string) => {
    const newLocations = locationsText
      .split(/[,\n\r]+/)
      .map(l => l.trim())
      .filter(l => l && !businesses[businessIndex].locations.includes(l))
      .slice(0, 25 - businesses[businessIndex].locations.length);

    setBusinesses(prev => prev.map((b, i) => 
      i === businessIndex 
        ? { ...b, locations: [...b.locations, ...newLocations].slice(0, 25) }
        : b
    ));
  };

  // Common US locations for suggestions
  const commonLocations = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
    'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
    'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Boston',
    'Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island'
  ];

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Налаштування географічного таргетування
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">📍 Як це працює:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Реклама показуватиметься тільки в вказаних локаціях</li>
              <li>• Можна використовувати ZIP-коди, міста, райони, округи, штати</li>
              <li>• Тільки локації в США</li>
              <li>• Максимум 25 локацій на бізнес</li>
            </ul>
          </div>

          {businesses.map((business, businessIndex) => (
            <Card key={businessIndex} className="border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Бізнес #{businessIndex + 1}
                  </CardTitle>
                  {businesses.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeBusiness(businessIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Business ID */}
                <div>
                  <Label htmlFor={`business_id_${businessIndex}`}>ID бізнесу *</Label>
                  <Input
                    id={`business_id_${businessIndex}`}
                    value={business.business_id}
                    onChange={(e) => updateBusinessId(businessIndex, e.target.value)}
                    placeholder="your_business_id_here"
                    required
                  />
                </div>

                {/* Locations */}
                <div>
                  <Label>Локації ({business.locations.length}/25)</Label>
                  
                  {/* Quick Add */}
                  <LocationQuickAdd 
                    onAdd={(location) => addLocationToBusiness(businessIndex, location)}
                    suggestions={commonLocations}
                    existingLocations={business.locations}
                    disabled={business.locations.length >= 25}
                  />

                  {/* Bulk Add */}
                  <BulkLocationAdd
                    onAdd={(locations) => addBulkLocations(businessIndex, locations)}
                    disabled={business.locations.length >= 25}
                  />

                  {/* Current Locations */}
                  {business.locations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Додані локації:</p>
                      <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded-lg max-h-40 overflow-y-auto">
                        {business.locations.map((location, locationIndex) => (
                          <Badge key={locationIndex} variant="secondary" className="bg-green-100 text-green-800">
                            {location}
                            <button
                              type="button"
                              onClick={() => removeLocationFromBusiness(businessIndex, locationIndex)}
                              className="ml-1 text-green-600 hover:text-green-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Business Button */}
          <Button type="button" onClick={addBusiness} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Додати ще один бізнес
          </Button>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Приклади локацій:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <p className="font-medium">ZIP-коди:</p>
                <p>90210, 10001, 60601</p>
              </div>
              <div>
                <p className="font-medium">Міста:</p>
                <p>New York, Los Angeles, Chicago</p>
              </div>
              <div>
                <p className="font-medium">Райони:</p>
                <p>Manhattan, Brooklyn, Hollywood</p>
              </div>
              <div>
                <p className="font-medium">Округи/Штати:</p>
                <p>Los Angeles County, California</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Зберегти налаштування
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Скасувати
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Component for quick adding single locations
interface LocationQuickAddProps {
  onAdd: (location: string) => void;
  suggestions: string[];
  existingLocations: string[];
  disabled: boolean;
}

const LocationQuickAdd: React.FC<LocationQuickAddProps> = ({ 
  onAdd, 
  suggestions, 
  existingLocations, 
  disabled 
}) => {
  const [newLocation, setNewLocation] = useState('');

  const handleAdd = () => {
    if (newLocation.trim() && !existingLocations.includes(newLocation.trim())) {
      onAdd(newLocation.trim());
      setNewLocation('');
    }
  };

  const addSuggestion = (suggestion: string) => {
    if (!existingLocations.includes(suggestion)) {
      onAdd(suggestion);
    }
  };

  return (
    <div className="space-y-3 mt-2">
      <div className="flex gap-2">
        <Input
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          placeholder="Введіть ZIP-код, місто, район або штат"
          disabled={disabled}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        />
        <Button 
          type="button" 
          onClick={handleAdd} 
          disabled={!newLocation.trim() || disabled}
          size="sm"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {!disabled && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Популярні локації (натисніть для додавання):</p>
          <div className="flex flex-wrap gap-1">
            {suggestions.slice(0, 15).map((suggestion) => (
              <Badge
                key={suggestion}
                variant="outline"
                className={`cursor-pointer text-xs ${
                  existingLocations.includes(suggestion)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-50 hover:border-blue-300'
                }`}
                onClick={() => !existingLocations.includes(suggestion) && addSuggestion(suggestion)}
              >
                {suggestion}
                {!existingLocations.includes(suggestion) && <Plus className="w-2 h-2 ml-1" />}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Component for bulk adding locations
interface BulkLocationAddProps {
  onAdd: (locations: string) => void;
  disabled: boolean;
}

const BulkLocationAdd: React.FC<BulkLocationAddProps> = ({ onAdd, disabled }) => {
  const [bulkText, setBulkText] = useState('');

  const handleBulkAdd = () => {
    if (bulkText.trim()) {
      onAdd(bulkText);
      setBulkText('');
    }
  };

  return (
    <div className="mt-3">
      <Label htmlFor="bulkLocations">Додати кілька локацій одночасно</Label>
      <Textarea
        id="bulkLocations"
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        placeholder="Введіть локації через кому або з нового рядка:&#10;90210, 10001, 60601&#10;New York&#10;Los Angeles&#10;Chicago"
        rows={3}
        className="mt-2"
        disabled={disabled}
      />
      <Button 
        type="button" 
        onClick={handleBulkAdd} 
        disabled={!bulkText.trim() || disabled} 
        className="mt-2"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        Додати всі локації
      </Button>
    </div>
  );
};

export default CustomLocationEditor;
