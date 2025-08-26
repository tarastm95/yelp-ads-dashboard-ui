import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link, Save, X } from 'lucide-react';

interface LinkTrackingData {
  website?: string | null;
  menu?: string | null;
  call_to_action?: string | null;
}

interface LinkTrackingEditorProps {
  data?: LinkTrackingData;
  onSave: (data: LinkTrackingData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LinkTrackingEditor: React.FC<LinkTrackingEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<LinkTrackingData>({
    website: data?.website || '',
    menu: data?.menu || '',
    call_to_action: data?.call_to_action || ''
  });

  useEffect(() => {
    if (data) {
      setFormData({
        website: data.website || '',
        menu: data.menu || '',
        call_to_action: data.call_to_action || ''
      });
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert empty strings to null
    const processedData = {
      website: formData.website?.trim() || null,
      menu: formData.menu?.trim() || null,
      call_to_action: formData.call_to_action?.trim() || null
    };
    
    onSave(processedData);
  };

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is OK
    
    // Check if it's a full URL
    try {
      new URL(url);
      return true;
    } catch {
      // Check if it's URL parameters only (starts with utm_ or contains =)
      if (url.includes('=') && !url.includes('://')) {
        // Simple validation for parameters like "utm_source=yelp&utm_medium=cpc"
        return /^[a-zA-Z0-9_]+=.+(&[a-zA-Z0-9_]+=.+)*$/.test(url);
      }
      return false;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5" />
          Налаштування відстеження посилань
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="website">URL веб-сайту</Label>
            <Input
              id="website"
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://mysite.com?utm_source=yelp або utm_source=yelp&utm_medium=cpc"
              className={!validateUrl(formData.website || '') ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500 mt-1">
              Повний URL або тільки UTM-параметри для трекінгу переходів на веб-сайт
            </p>
          </div>

          <div>
            <Label htmlFor="menu">URL меню</Label>
            <Input
              id="menu"
              type="url"
              value={formData.menu || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, menu: e.target.value }))}
              placeholder="https://mysite.com/menu?utm_source=yelp або utm_source=yelp&utm_medium=cpc"
              className={!validateUrl(formData.menu || '') ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500 mt-1">
              Повний URL або тільки UTM-параметри для трекінгу переходів до меню
            </p>
          </div>

          <div>
            <Label htmlFor="call_to_action">Call-to-Action URL</Label>
            <Input
              id="call_to_action"
              type="url"
              value={formData.call_to_action || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, call_to_action: e.target.value }))}
              placeholder="https://mysite.com/contact?utm_source=yelp або utm_source=yelp&utm_medium=cpc"
              className={!validateUrl(formData.call_to_action || '') ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500 mt-1">
              URL для Call-to-Action кнопки. Використовується коли AD_GOAL = WEBSITE_CLICKS
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Як працює відстеження:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Порожнє поле:</strong> використовуємо стандартний зовнішній URL (без трекінгу)</li>
              <li>• <strong>Повний URL:</strong> https://mysite.com/page?utm_source=yelp</li>
              <li>• <strong>Тільки параметри:</strong> utm_source=yelp&utm_medium=cpc (Yelp додасть до існуючого URL)</li>
              <li>• <strong>Зв'язок з AD_GOAL:</strong> якщо AD_GOAL = WEBSITE_CLICKS і налаштовано call_to_action, використовується трекінг-URL</li>
              <li>• <strong>Всі поля null:</strong> фіча вважається вимкненою</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">🎯 Важливо знати:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Link tracking застосовується до <strong>CPC-трафіку</strong> з реклами Yelp</li>
              <li>• Базові URL для органічного трафіку задаються через Data Ingestion API</li>
              <li>• Поле <code>call_to_action</code> (не url) відповідає за CTA кнопку</li>
              <li>• Приклад "тільки параметри": {`{"LINK_TRACKING": {"website": "utm_source=yelp&utm_medium=cpc"}}`}</li>
            </ul>
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

export default LinkTrackingEditor;