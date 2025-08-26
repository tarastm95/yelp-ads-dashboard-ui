import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface CustomAdTextData {
  custom_review_id?: string | null;
  custom_text?: string | null;
}

interface CustomAdTextEditorProps {
  data?: CustomAdTextData;
  onSave: (data: CustomAdTextData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CustomAdTextEditor: React.FC<CustomAdTextEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [mode, setMode] = useState<'disabled' | 'custom_text' | 'review'>('disabled');
  const [customText, setCustomText] = useState('');
  const [reviewId, setReviewId] = useState('');

  useEffect(() => {
    if (data) {
      if (data.custom_text) {
        setMode('custom_text');
        setCustomText(data.custom_text);
      } else if (data.custom_review_id) {
        setMode('review');
        setReviewId(data.custom_review_id);
      } else {
        setMode('disabled');
      }
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let payload: CustomAdTextData = {
      custom_review_id: null,
      custom_text: null
    };

    if (mode === 'custom_text' && customText.trim()) {
      payload.custom_text = customText.trim();
    } else if (mode === 'review' && reviewId.trim()) {
      payload.custom_review_id = reviewId.trim();
    }

    onSave(payload);
  };

    const validateCustomText = (text: string) => {
    const errors: string[] = [];

    // Основні перевірки згідно з практичними лімітами
    if (text.length > 1500) errors.push('Максимум ~1500 символів (практичний ліміт)');
    if (text.trim().length === 0) errors.push('Текст не може бути порожнім');
    
    // Рекомендації щодо стилю (не жорсткі правила API)
    const uppercasePercent = (text.match(/[A-ZА-Я]/g) || []).length / text.length;
    if (uppercasePercent > 0.4) errors.push('Рекомендуємо менше великих літер (≤40%)');
    
    // Перевірка на надмірне використання знаків оклику
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 3) errors.push('Рекомендуємо менше знаків оклику');

    return errors;
  };

  const textErrors = mode === 'custom_text' ? validateCustomText(customText) : [];
  const isTextValid = mode !== 'custom_text' || textErrors.length === 0;

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Налаштування власного тексту реклами
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-base font-medium">Оберіть тип тексту реклами:</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as typeof mode)}
              className="mt-4 space-y-4"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="disabled" id="disabled" className="mt-1" />
                <div>
                  <label htmlFor="disabled" className="font-medium cursor-pointer">
                    Автоматичний текст Yelp
                  </label>
                  <p className="text-sm text-gray-600">
                    Yelp автоматично генерує текст реклами на основі інформації про ваш бізнес
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="custom_text" id="custom_text" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="custom_text" className="font-medium cursor-pointer">
                    Власний текст
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Напишіть власний текст для реклами
                  </p>
                  
                  {mode === 'custom_text' && (
                    <div className="space-y-3">
                      <Textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Введіть текст реклами (до ~1500 символів)&#10;&#10;Приклад:&#10;Найкраща піца в місті! Свіжі інгредієнти, швидка доставка та неперевершений смак. Замовляйте зараз і отримайте знижку 15% на першу піцу!"
                        rows={4}
                        className={textErrors.length > 0 ? 'border-red-500' : 'border-green-500'}
                      />
                      
                      <div className="flex justify-between text-xs">
                        <span className={customText.length > 1500 ? 'text-red-500' : 'text-gray-500'}>
                          Символів: {customText.length} / ~1500
                        </span>
                        <span className={customText.trim().length > 0 && customText.length <= 1500 ? 'text-green-500' : 'text-red-500'}>
                          {customText.trim().length > 0 && customText.length <= 1500 ? '✓' : '✗'} Довжина
                        </span>
                      </div>

                      {textErrors.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-800">Помилки валідації:</span>
                          </div>
                          <ul className="text-xs text-red-700 space-y-1">
                            {textErrors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {textErrors.length === 0 && customText.trim().length > 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Текст пройшов валідацію!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="review" id="review" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="review" className="font-medium cursor-pointer">
                    Текст з відгуку
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Використати текст з конкретного відгуку клієнта
                  </p>
                  
                  {mode === 'review' && (
                    <Input
                      value={reviewId}
                      onChange={(e) => setReviewId(e.target.value)}
                      placeholder="Введіть ID відгуку (наприклад: review_abc123xyz)"
                    />
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">📝 Правила тексту реклами:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Поля:</strong> заповнюй або "Власний текст", або "Текст з відгуку" (не обидва)</li>
              <li>• <strong>Довжина:</strong> тримай текст стислим; до ~1500 символів (практичний ліміт)</li>
              <li>• <strong>Стиль:</strong> без надмірних ВЕРХНІХ ЛІТЕР та знаків оклику</li>
              <li>• <strong>Контент:</strong> не додавай контактні дані/URL у текст (для посилань використовуй CTA)</li>
              <li>• <strong>Якщо обидва поля порожні:</strong> текст встановить Yelp автоматично</li>
              <li>• <strong>Релевантність:</strong> текст повинен відповідати вашому бізнесу</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Поради для ефективного тексту:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Підкресліть унікальні переваги вашого бізнесу</li>
              <li>• Використовуйте конкретні факти (швидкість, якість, досвід)</li>
              <li>• Додайте заклик до дії (замовляйте, телефонуйте, відвідайте)</li>
              <li>• Згадайте спеціальні пропозиції або знижки</li>
              <li>• Пишіть природною мовою, уникайте рекламних штампів</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || !isTextValid} 
              className="flex-1"
            >
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Зберегти текст
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

export default CustomAdTextEditor;
