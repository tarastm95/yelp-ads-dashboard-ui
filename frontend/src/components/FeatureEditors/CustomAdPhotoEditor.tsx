import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ImageIcon, Save, X, Info, Eye, ExternalLink } from 'lucide-react';

interface CustomAdPhotoData {
  custom_photo_id: string | null;
}

interface CustomAdPhotoEditorProps {
  data?: CustomAdPhotoData;
  onSave: (data: CustomAdPhotoData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CustomAdPhotoEditor: React.FC<CustomAdPhotoEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [photoId, setPhotoId] = useState<string>(data?.custom_photo_id || '');
  const [isEnabled, setIsEnabled] = useState<boolean>(!!data?.custom_photo_id);

  useEffect(() => {
    if (data) {
      setPhotoId(data.custom_photo_id || '');
      setIsEnabled(!!data.custom_photo_id);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      custom_photo_id: isEnabled && photoId.trim() ? photoId.trim() : null
    });
  };

  const isValidPhotoId = (id: string): boolean => {
    // Photo ID should be alphanumeric and reasonable length
    const photoIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
    return photoIdPattern.test(id);
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Налаштування власного фото для реклами
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Switch
              id="photo-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <div>
              <Label htmlFor="photo-enabled" className="text-base font-medium">
                Використовувати власне фото в рекламі
              </Label>
              <p className="text-sm text-gray-600">
                {isEnabled 
                  ? 'Ваше власне фото буде показуватись в рекламі замість автоматично обраного' 
                  : 'Yelp автоматично обере найкраще фото для реклами'
                }
              </p>
            </div>
          </div>

          {isEnabled && (
            <div className="space-y-4">
              {/* Photo ID Input */}
              <div>
                <Label htmlFor="photoId">ID фото *</Label>
                <Input
                  id="photoId"
                  value={photoId}
                  onChange={(e) => setPhotoId(e.target.value)}
                  placeholder="custom_photo_id"
                  required
                  className={`${
                    photoId && !isValidPhotoId(photoId) ? 'border-red-500' : ''
                  }`}
                />
                
                {photoId && !isValidPhotoId(photoId) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ ID фото має містити лише букви, цифри, дефіси та підкреслення (3-50 символів)
                  </p>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  Ідентифікатор фото, яке показувати в оголошенні. Щоб повернутися до авто-вибору — очистіть поле.
                </p>
              </div>

              {/* How to find Photo ID */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Як отримати ID фото:
                </h4>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li>• <strong>Data Ingestion API:</strong> Після завантаження фото через API, ви отримуєте photo_id у статусі джобу — зберігайте та використовуйте їх</li>
                  <li>• <strong>Офіційні API:</strong> Використовуйте ID, отримані від офіційних Yelp API ендпоїнтів</li>
                  <li>• <strong>Бізнес-профіль:</strong> ID фото з вашого затвердженого бізнес-профілю на Yelp</li>
                </ul>
                <div className="mt-3 p-2 bg-blue-100 rounded border text-xs">
                  <strong>Важливо:</strong> Використовуйте лише ID, отримані від офіційних Yelp API. Неофіційні методи не гарантуються.
                </div>
              </div>

              {/* Photo Requirements */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">📋 Вимоги до фото:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Фото має бути вже завантажене у ваш Yelp-профіль</li>
                  <li>• Високої якості та релевантне до вашого бізнесу</li>
                  <li>• Відповідає Content Guidelines Yelp</li>
                  <li>• Yelp може модерувати контент, що порушує правила</li>
                  <li>• Використовуйте високу роздільну здатність (Yelp автоматично змінить розмір)</li>
                </ul>
              </div>

              {/* Best Practices */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">💡 Поради для ефективної реклами:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Якість:</strong> Використовуйте яскраві, чіткі фото</li>
                  <li>• <strong>Репрезентативність:</strong> Фото має показувати ваш продукт/послугу</li>
                  <li>• <strong>Емоційність:</strong> Фото, що викликають позитивні емоції, працюють краще</li>
                  <li>• <strong>Унікальність:</strong> Уникайте стокових фото</li>
                  <li>• <strong>Актуальність:</strong> Використовуйте свіжі фото вашого бізнесу</li>
                </ul>
              </div>

              {/* Preview Section */}
              {photoId && isValidPhotoId(photoId) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Вибране фото:
                  </h4>
                  <div className="flex items-center justify-between bg-white p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium">ID фото: <code className="bg-gray-100 px-2 py-1 rounded">{photoId}</code></p>
                      <p className="text-xs text-gray-500">Це фото буде використовуватись в рекламі</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const yelpUrl = `https://www.yelp.com/biz_photos/search?find_desc=&find_loc=&bfind=${photoId}`;
                        window.open(yelpUrl, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Переглянути на Yelp
                    </Button>
                  </div>
                </div>
              )}

              {/* Alternative Options */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">🎯 Альтернативи:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Автоматичний вибір:</strong> Yelp обере найкращі фото автоматично</li>
                  <li>• <strong>A/B тестування:</strong> Спробуйте різні фото і порівняйте результати</li>
                  <li>• <strong>Portfolio проекти:</strong> Створюйте креативи на основі ваших портфоліо (portfolio photo_id ≠ custom_photo_id)</li>
                  <li>• <strong>Сезонність:</strong> Змінюйте фото відповідно до сезону чи акцій</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || (isEnabled && (!photoId.trim() || !isValidPhotoId(photoId)))} 
              className="flex-1"
            >
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Зберегти налаштування фото
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

export default CustomAdPhotoEditor;
