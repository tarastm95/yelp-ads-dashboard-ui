
import React, { useState } from 'react';
import { useCreateProgramMutation } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TEST_BUSINESS_IDS } from '@/constants/testData';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatErrorForToast } from '@/lib/utils';
import { Plus, Loader2 } from 'lucide-react';

const PROGRAM_OPTIONS = [
  { value: 'BP', label: 'BP \u2013 Branded Profile' },
  { value: 'EP', label: 'EP \u2013 Enhanced Profile' },
  { value: 'CPC', label: 'CPC \u2013 Cost Per Click ads' },
  { value: 'RCA', label: 'RCA \u2013 Remove Competitor Ads' },
  { value: 'CTA', label: 'CTA \u2013 Call To Action' },
  { value: 'SLIDESHOW', label: 'SLIDESHOW \u2013 Slideshow' },
  { value: 'BH', label: 'BH \u2013 Business Highlights' },
  { value: 'VL', label: 'VL \u2013 Verified License' },
  { value: 'LOGO', label: 'LOGO \u2013 Logo Feature' },
  { value: 'PORTFOLIO', label: 'PORTFOLIO \u2013 Portfolio Feature' },
];

const CreateProgram: React.FC = () => {
  const [createProgram, { isLoading }] = useCreateProgramMutation();
  const [formData, setFormData] = useState({
    business_id: '',
    program_name: '',
    budget: '',
    max_bid: '',
    is_autobid: false,
    start: '',
    end: '',
    promotion_code: '',
    currency: 'USD',
    pacing_method: '',
    fee_period: '',
    ad_categories: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Базові параметри для всіх типів програм
      const baseParams = {
        business_id: formData.business_id,
        program_name: formData.program_name,
        start: formData.start,
        end: formData.end || undefined,
        promotion_code: formData.promotion_code || undefined,
      } as any;

      // Додаємо CPC-специфічні параметри тільки для CPC програм
      const isCPCProgram = formData.program_name === 'CPC';
      
      const payload = isCPCProgram ? {
        ...baseParams,
        budget: parseFloat(formData.budget),
        is_autobid: formData.is_autobid,
        currency: formData.currency || undefined,
        pacing_method: formData.pacing_method || undefined,
        fee_period: formData.fee_period || undefined,
        ad_categories: formData.ad_categories ? formData.ad_categories.split(',').map(c=>c.trim()).filter(Boolean) : undefined,
        // max_bid тільки якщо не автобід
        ...(formData.is_autobid ? {} : { max_bid: parseFloat(formData.max_bid) })
      } : baseParams;

      const result = await createProgram(payload).unwrap();

      toast({
        title: "Программа создается",
        description: `Job ID: ${result.job_id}`,
      });

      // Сброс формы
      setFormData({
        business_id: '',
        program_name: '',
        budget: '',
        max_bid: '',
        is_autobid: false,
        start: '',
        end: '',
        promotion_code: '',
        currency: 'USD',
        pacing_method: '',
        fee_period: '',
        ad_categories: '',
      });
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Создать рекламную программу
        </CardTitle>
        <CardDescription>
          Заполните форму для создания новой рекламной программы Yelp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_id">Business ID</Label>
            <Input
              id="business_id"
              value={formData.business_id}
              onChange={(e) => handleChange('business_id', e.target.value)}
              placeholder="Введите зашифрованный business ID"
              required
            />
            <div className="flex gap-2 mt-2">
              <p className="text-sm text-gray-600">Тестові IDs:</p>
              {TEST_BUSINESS_IDS.map((id, index) => (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleChange('business_id', id)}
                  className="text-xs"
                >
                  Test #{index + 1}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program_name">Program Name</Label>
            <Select
              value={formData.program_name}
              onValueChange={(value) => handleChange('program_name', value)}
            >
              <SelectTrigger id="program_name">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CPC-специфічні поля показуємо тільки для CPC програм */}
          {formData.program_name === 'CPC' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (USD в центах)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                  placeholder="20000 (= $200.00)"
                  required
                />
                <p className="text-sm text-gray-500">
                  Введіть суму в центах: $200.00 = 20000
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="is_autobid"
                  type="checkbox"
                  checked={formData.is_autobid}
                  onChange={(e) => handleChange('is_autobid', e.target.checked)}
                />
                <Label htmlFor="is_autobid">Автоматичне бідування (Autobid)</Label>
              </div>

              {/* Max bid тільки якщо НЕ автобід */}
              {!formData.is_autobid && (
                <div className="space-y-2">
                  <Label htmlFor="max_bid">Max Bid (USD в центах)</Label>
                  <Input
                    id="max_bid"
                    type="number"
                    value={formData.max_bid}
                    onChange={(e) => handleChange('max_bid', e.target.value)}
                    placeholder="500 (= $5.00)"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Введіть суму в центах: $5.00 = 500
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  placeholder="USD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pacing_method">Pacing Method</Label>
                <Select value={formData.pacing_method} onValueChange={(value) => handleChange('pacing_method', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pacing method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paced">Paced (spread budget evenly)</SelectItem>
                    <SelectItem value="unpaced">Unpaced (spend as fast as possible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee_period">Fee Period</Label>
                <Select value={formData.fee_period} onValueChange={(value) => handleChange('fee_period', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALENDAR_MONTH">Calendar Month (reset on 1st)</SelectItem>
                    <SelectItem value="ROLLING_MONTH">Rolling Month (reset every 30 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad_categories">Ad Categories (comma separated)</Label>
                <Input
                  id="ad_categories"
                  value={formData.ad_categories}
                  onChange={(e) => handleChange('ad_categories', e.target.value)}
                  placeholder="hvac, plumbing"
                />
              </div>
            </>
          )}

          {/* Інформаційне повідомлення для не-CPC програм */}
          {formData.program_name && formData.program_name !== 'CPC' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-700">
                <strong>{formData.program_name}</strong> програма не потребує budget та bid параметрів. 
                Тільки business_id, дати початку та кінця.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start">Start Date</Label>
            <Input
              id="start"
              type="date"
              value={formData.start}
              onChange={(e) => handleChange('start', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End Date</Label>
            <Input
              id="end"
              type="date"
              value={formData.end}
              onChange={(e) => handleChange('end', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promotion_code">Promotion Code</Label>
            <Input
              id="promotion_code"
              value={formData.promotion_code}
              onChange={(e) => handleChange('promotion_code', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создание...
              </>
            ) : (
              'Создать программу'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateProgram;
