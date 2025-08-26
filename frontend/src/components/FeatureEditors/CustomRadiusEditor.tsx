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
    if (radius <= 5) return 'Дуже близько - тільки найближчі клієнти';
    if (radius <= 15) return 'Близько - місцева аудиторія';
    if (radius <= 30) return 'Середній радіус - міська аудиторія';
    if (radius <= 45) return 'Широкий радіус - міжміська аудиторія';
    return 'Максимальний радіус - регіональна аудиторія';
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Налаштування радіусу таргетування
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
                Увімкнути власний радіус таргетування
              </Label>
            </div>
            
            {!isEnabled && (
              <p className="text-sm text-gray-600 mb-4">
                Коли вимкнено, Yelp автоматично визначає оптимальний радіус для вашого бізнесу
              </p>
            )}
          </div>

          {isEnabled && (
            <>
              <div>
                <Label className="text-base font-medium mb-4 block">
                  Радіус показу реклами: {radius} миль
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
                    <span>1 миля</span>
                    <span>30 миль</span>
                    <span>60 миль</span>
                  </div>
                </div>

                {/* Manual Input */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="radiusInput">Точне значення (мілі)</Label>
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
                    <Label>В кілометрах</Label>
                    <Input
                      value={`≈ ${(radius * 1.6).toFixed(1)} км`}
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
                <h4 className="text-sm font-medium mb-2">📍 Візуалізація радіусу:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>• Центр: ваш бізнес</div>
                  <div>• Радіус: {radius} миль ({(radius * 1.6).toFixed(1)} км)</div>
                  <div>• Площа покриття: ≈ {Math.round(Math.PI * radius * radius)} кв. миль</div>
                  <div>• Реклама показуватиметься тільки клієнтам в цій зоні</div>
                </div>
              </div>
            </>
          )}

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Рекомендації по радіусу:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Ресторани/кафе:</strong> 3-10 миль</li>
              <li>• <strong>Салони краси:</strong> 5-15 миль</li>
              <li>• <strong>Будівельні послуги:</strong> 15-40 миль</li>
              <li>• <strong>Спеціалізовані послуги:</strong> 25-60 миль</li>
              <li>• Менший радіус = дорожчий трафік, але більш релевантні клієнти</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Зберегти радіус
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

export default CustomRadiusEditor;
