import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Target, Save, X, Phone, Globe, BarChart3 } from 'lucide-react';

interface AdGoalData {
  ad_goal: 'DEFAULT' | 'CALLS' | 'WEBSITE_CLICKS';
}

interface AdGoalEditorProps {
  data?: AdGoalData;
  onSave: (data: AdGoalData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const AdGoalEditor: React.FC<AdGoalEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [selectedGoal, setSelectedGoal] = useState<AdGoalData['ad_goal']>(
    data?.ad_goal || 'DEFAULT'
  );

  useEffect(() => {
    if (data) {
      setSelectedGoal(data.ad_goal);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ad_goal: selectedGoal });
  };

  const goalOptions = [
    {
      value: 'DEFAULT' as const,
      label: 'Стандартна оптимізація',
      description: 'Yelp автоматично оптимізує доставку та CTA під загальну ефективність',
      icon: BarChart3,
      color: 'text-blue-600'
    },
    {
      value: 'CALLS' as const,
      label: 'Максимум дзвінків',
      description: 'CTA змінюється на "Call business" для максимізації телефонних дзвінків',
      icon: Phone,
      color: 'text-green-600'
    },
    {
      value: 'WEBSITE_CLICKS' as const,
      label: 'Максимум переходів на сайт',
      description: 'CTA стає "Visit website" для прямих переходів на зовнішній сайт',
      icon: Globe,
      color: 'text-purple-600'
    }
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Налаштування цілі реклами
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-base font-medium">Оберіть ціль вашої рекламної кампанії:</Label>
            <RadioGroup
              value={selectedGoal}
              onValueChange={(value) => setSelectedGoal(value as AdGoalData['ad_goal'])}
              className="mt-4 space-y-4"
            >
              {goalOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1">
                      <label
                        htmlFor={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <IconComponent className={`w-5 h-5 ${option.color}`} />
                        <span className="font-medium">{option.label}</span>
                      </label>
                      <p className="text-sm text-gray-600 mt-1 ml-7">
                        {option.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">ℹ️ Важливо знати:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Стандартна оптимізація:</strong> Yelp автоматично оптимізує доставку та CTA під загальну ефективність</li>
              <li>• <strong>Максимум дзвінків:</strong> Зазвичай підходить для сервісних бізнесів (салони, ремонт, медицина)</li>
              <li>• <strong>Максимум переходів:</strong> Зазвичай підходить для e-commerce та інформаційних сайтів</li>
              <li>• Якщо налаштовано Link Tracking, при виборі "Переходи на сайт" використовується трекінговий URL</li>
              <li>• Ціль можна змінювати в процесі кампанії залежно від потреб</li>
              <li>• Зміна цілі може вплинути на тип кліків, CTA та показники реклами</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Зберегти ціль
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

export default AdGoalEditor;
