import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MapPin, Save, X } from 'lucide-react';

interface CustomRadiusData {
  custom_radius: number | null;
}

interface CustomRadiusEditorProps {
  data?: CustomRadiusData;
  onSave: (data: CustomRadiusData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CustomRadiusEditor: React.FC<CustomRadiusEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [radius, setRadius] = useState<number>(data?.custom_radius || 10);
  const [isEnabled, setIsEnabled] = useState<boolean>(data?.custom_radius !== null);

  useEffect(() => {
    if (data) {
      setRadius(data.custom_radius || 10);
      setIsEnabled(data.custom_radius !== null);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      custom_radius: isEnabled ? radius : null
    });
  };

  const handleSliderChange = (value: number[]) => {
    setRadius(value[0]);
  };

  const getRadiusDescription = (radius: number): string => {
    if (radius <= 5) return 'Very close - only nearest customers';
    if (radius <= 15) return 'Close - local audience';
    if (radius <= 30) return 'Medium radius - city audience';
    if (radius <= 45) return 'Wide radius - inter-city audience';
    return 'Maximum radius - regional audience';
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Targeting Radius Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="enableRadius"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="enableRadius" className="text-base font-medium">
                Enable custom targeting radius
              </Label>
            </div>
            
            {!isEnabled && (
              <p className="text-sm text-gray-600 mb-4">
                When disabled, Yelp automatically determines the optimal radius for your business
              </p>
            )}
          </div>

          {isEnabled && (
            <>
              <div>
                <Label className="text-base font-medium mb-4 block">
                  Ad display radius: {radius} miles
                </Label>
                
                {/* Slider */}
                <div className="px-2 mb-4">
                  <Slider
                    value={[radius]}
                    onValueChange={handleSliderChange}
                    max={60}
                    min={1}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 mile</span>
                    <span>30 miles</span>
                    <span>60 miles</span>
                  </div>
                </div>

                {/* Manual Input */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="radiusInput">Exact value (miles)</Label>
                    <Input
                      id="radiusInput"
                      type="number"
                      min="1"
                      max="60"
                      step="0.5"
                      value={radius}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 1 && value <= 60) {
                          setRadius(value);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label>In kilometers</Label>
                    <Input
                      value={`≈ ${(radius * 1.6).toFixed(1)} km`}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <p className="text-sm text-blue-600 mt-2">
                  {getRadiusDescription(radius)}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">📍 Radius visualization:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>• Center: your business</div>
                  <div>• Radius: {radius} miles ({(radius * 1.6).toFixed(1)} km)</div>
                  <div>• Coverage area: ≈ {Math.round(Math.PI * radius * radius)} sq. miles</div>
                  <div>• Ads will only show to customers in this zone</div>
                </div>
              </div>
            </>
          )}

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Radius recommendations:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Restaurants/cafes:</strong> 3-10 miles</li>
              <li>• <strong>Beauty salons:</strong> 5-15 miles</li>
              <li>• <strong>Construction services:</strong> 15-40 miles</li>
              <li>• <strong>Specialized services:</strong> 25-60 miles</li>
              <li>• Smaller radius = more expensive traffic, but more relevant customers</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save Radius
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomRadiusEditor;
