
import React, { useState } from 'react';
import { useCreateProgramMutation } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createProgram({
        business_id: formData.business_id,
        program_name: formData.program_name,
        budget: parseFloat(formData.budget),
        max_bid: parseFloat(formData.max_bid),
        is_autobid: formData.is_autobid,
        start: formData.start,
        end: formData.end || undefined,
      }).unwrap();

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
      });
    } catch (error) {
      toast({
        title: "Ошибка создания программы",
        description: "Проверьте введенные данные",
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="program_name">Program Name</Label>
            <Input
              id="program_name"
              value={formData.program_name}
              onChange={(e) => handleChange('program_name', e.target.value)}
              placeholder="CPC"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (USD)</Label>
            <Input
              id="budget"
              type="number"
              value={formData.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
              placeholder="30000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_bid">Max Bid (USD)</Label>
            <Input
              id="max_bid"
              type="number"
              value={formData.max_bid}
              onChange={(e) => handleChange('max_bid', e.target.value)}
              placeholder="1000"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="is_autobid"
              type="checkbox"
              checked={formData.is_autobid}
              onChange={(e) => handleChange('is_autobid', e.target.checked)}
            />
            <Label htmlFor="is_autobid">Autobid</Label>
          </div>

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
