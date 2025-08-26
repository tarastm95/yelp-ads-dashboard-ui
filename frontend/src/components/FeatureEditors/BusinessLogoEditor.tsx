import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Image, Save, X, Upload, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

interface BusinessLogoData {
  business_logo_url: string | null;
}

interface BusinessLogoEditorProps {
  data?: BusinessLogoData;
  onSave: (data: BusinessLogoData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const BusinessLogoEditor: React.FC<BusinessLogoEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [logoUrl, setLogoUrl] = useState<string>(data?.business_logo_url || '');
  const [isEnabled, setIsEnabled] = useState<boolean>(!!data?.business_logo_url);
  const [imageStatus, setImageStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');

  useEffect(() => {
    if (data) {
      setLogoUrl(data.business_logo_url || '');
      setIsEnabled(!!data.business_logo_url);
    }
  }, [data]);

  useEffect(() => {
    if (logoUrl && isEnabled) {
      validateImage(logoUrl);
    } else {
      setImageStatus('idle');
    }
  }, [logoUrl, isEnabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      business_logo_url: isEnabled && logoUrl.trim() ? logoUrl.trim() : null
    });
  };

  const validateImage = async (url: string) => {
    if (!url.trim()) return;
    
    setImageStatus('loading');
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const loadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
      });
      
      img.src = url;
      await loadPromise;
      setImageStatus('success');
    } catch {
      setImageStatus('error');
    }
  };

  const isValidImageFormat = (url: string): boolean => {
    const validExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.tiff'];
    const lowercaseUrl = url.toLowerCase();
    return validExtensions.some(ext => lowercaseUrl.includes(ext));
  };

  const getStatusIcon = () => {
    switch (imageStatus) {
      case 'loading':
        return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (imageStatus) {
      case 'loading':
        return { text: 'Перевіряємо зображення...', color: 'text-blue-600' };
      case 'success':
        return { text: 'Зображення успішно завантажене', color: 'text-green-600' };
      case 'error':
        return { text: 'Не вдалося завантажити зображення', color: 'text-red-600' };
      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Налаштування логотипу бізнесу
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Switch
              id="logo-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <div>
              <Label htmlFor="logo-enabled" className="text-base font-medium">
                Використовувати власний логотип
              </Label>
              <p className="text-sm text-gray-600">
                {isEnabled 
                  ? 'Ваш логотип буде показуватись в рекламі' 
                  : 'Логотип не використовується (Yelp підбере автоматично)'
                }
              </p>
            </div>
          </div>

          {isEnabled && (
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <Label htmlFor="logoUrl">URL логотипу *</Label>
                <div className="relative">
                  <Input
                    id="logoUrl"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    required
                    className={`pr-10 ${
                      logoUrl && !isValidImageFormat(logoUrl) ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getStatusIcon()}
                  </div>
                </div>
                
                {statusMessage && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${statusMessage.color}`}>
                    {statusMessage.text}
                  </p>
                )}
                
                {logoUrl && !isValidImageFormat(logoUrl) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ URL має містити розширення зображення (.jpeg, .jpg, .png, .gif, .tiff)
                  </p>
                )}
              </div>

              {/* Image Preview */}
              {logoUrl && isEnabled && imageStatus === 'success' && (
                <div>
                  <Label>Попередній перегляд:</Label>
                  <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-center">
                      <img
                        src={logoUrl}
                        alt="Business Logo Preview"
                        className="max-h-24 max-w-48 object-contain"
                        onError={() => setImageStatus('error')}
                      />
                    </div>
                    <div className="text-center mt-2">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => window.open(logoUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Відкрити в новій вкладці
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">📋 Вимоги до логотипу:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Формати:</strong> JPEG, PNG, GIF, TIFF</li>
                  <li>• <strong>Доступність:</strong> URL має бути публічно доступним</li>
                  <li>• <strong>Розмір:</strong> рекомендований розмір 400x400 пікселів або більше</li>
                  <li>• <strong>Якість:</strong> високої роздільної здатності для чіткого відображення</li>
                  <li>• <strong>Фон:</strong> прозорий або білий фон працює найкраще</li>
                </ul>
              </div>

              {/* Tips */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">💡 Поради для ефективного логотипу:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Використовуйте простий, впізнаваний дизайн</li>
                  <li>• Переконайтесь, що логотип добре виглядає в малому розмірі</li>
                  <li>• Уникайте дрібного тексту, який важко прочитати</li>
                  <li>• Логотип має відповідати стилю вашого бренду</li>
                  <li>• Тестуйте відображення на різних пристроях</li>
                </ul>
              </div>

              {/* Host Examples */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">🌐 Приклади хостингу зображень:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Ваш сайт:</strong> https://yoursite.com/logo.png</li>
                  <li>• <strong>CDN:</strong> https://cdn.yoursite.com/assets/logo.png</li>
                  <li>• <strong>Cloud Storage:</strong> публічний URL з Google Drive, Dropbox</li>
                  <li>• <strong>Image хостинг:</strong> Imgur, ImageBB (з прямими посиланнями)</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || (isEnabled && (!logoUrl.trim() || imageStatus === 'error'))} 
              className="flex-1"
            >
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Зберегти логотип
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

export default BusinessLogoEditor;
