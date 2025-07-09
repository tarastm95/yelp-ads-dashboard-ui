
import React, { useState } from 'react';
import { useCreateProgramMutation } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

const CreateProgram: React.FC = () => {
  const [createProgram, { isLoading }] = useCreateProgramMutation();
  const [formData, setFormData] = useState({
    business_id: '',
    product_type: '',
    budget_amount: '',
    locations: '',
    categories: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createProgram({
        business_id: formData.business_id,
        product_type: formData.product_type,
        budget_amount: parseFloat(formData.budget_amount),
        targeting: {
          locations: formData.locations.split(',').map(l => l.trim()),
          categories: formData.categories.split(',').map(c => c.trim()),
        },
      }).unwrap();

      toast({
        title: "Программа создается",
        description: `Job ID: ${result.job_id}`,
      });

      // Сброс формы
      setFormData({
        business_id: '',
        product_type: '',
        budget_amount: '',
        locations: '',
        categories: '',
      });
    } catch (error) {
      toast({
        title: "Ошибка создания программы",
        description: "Проверьте введенные данные",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: string, value: string) => {
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
            <Label htmlFor="product_type">Тип продукта</Label>
            <Select value={formData.product_type} onValueChange={(value) => handleChange('product_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип продукта" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ads">Yelp Ads</SelectItem>
                <SelectItem value="enhanced_profile">Enhanced Profile</SelectItem>
                <SelectItem value="business_page">Business Page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_amount">Бюджет (USD)</Label>
            <Input
              id="budget_amount"
              type="number"
              step="0.01"
              value={formData.budget_amount}
              onChange={(e) => handleChange('budget_amount', e.target.value)}
              placeholder="100.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locations">Локации (через запятую)</Label>
            <Input
              id="locations"
              value={formData.locations}
              onChange={(e) => handleChange('locations', e.target.value)}
              placeholder="New York, NY, Los Angeles, CA"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categories">Категории (через запятую)</Label>
            <Input
              id="categories"
              value={formData.categories}
              onChange={(e) => handleChange('categories', e.target.value)}
              placeholder="restaurants, bars, cafes"
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
