
import React, { useState } from 'react';
import { useUpdateBusinessCategoriesMutation } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Settings, Loader2 } from 'lucide-react';

interface Business {
  business_id: string;
  categories: string[];
  name?: string;
  phone?: string;
  location?: {
    address1: string;
    city: string;
    state: string;
    zip_code: string;
  };
}

const CategoryManager: React.FC = () => {
  const [updateBusinessCategories, { isLoading }] = useUpdateBusinessCategoriesMutation();
  const [businesses, setBusinesses] = useState<Business[]>([{
    business_id: '',
    categories: [''],
    name: '',
    phone: '',
    location: {
      address1: '',
      city: '',
      state: '',
      zip_code: '',
    },
  }]);

  const addBusiness = () => {
    setBusinesses([...businesses, {
      business_id: '',
      categories: [''],
      name: '',
      phone: '',
      location: {
        address1: '',
        city: '',
        state: '',
        zip_code: '',
      },
    }]);
  };

  const removeBusiness = (index: number) => {
    setBusinesses(businesses.filter((_, i) => i !== index));
  };

  const updateBusiness = (index: number, field: string, value: any) => {
    const updated = [...businesses];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updated[index] = {
        ...updated[index],
        [parent]: {
          ...updated[index][parent as keyof Business],
          [child]: value,
        },
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setBusinesses(updated);
  };

  const addCategory = (businessIndex: number) => {
    const updated = [...businesses];
    updated[businessIndex].categories.push('');
    setBusinesses(updated);
  };

  const updateCategory = (businessIndex: number, categoryIndex: number, value: string) => {
    const updated = [...businesses];
    updated[businessIndex].categories[categoryIndex] = value;
    setBusinesses(updated);
  };

  const removeCategory = (businessIndex: number, categoryIndex: number) => {
    const updated = [...businesses];
    updated[businessIndex].categories.splice(categoryIndex, 1);
    setBusinesses(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validBusinesses = businesses.filter(b => 
      b.business_id.trim() && 
      b.categories.some(c => c.trim())
    );

    if (validBusinesses.length === 0) {
      toast({
        title: "Нет валидных данных",
        description: "Добавьте хотя бы один бизнес с ID и категориями",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await updateBusinessCategories(validBusinesses).unwrap();
      toast({
        title: "Категории обновляются",
        description: `Job ID: ${result.job_id}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка обновления категорий",
        description: "Проверьте введенные данные",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Управление категориями бизнесов
          </CardTitle>
          <CardDescription>
            Обновите категории для одного или нескольких бизнесов
          </CardDescription>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {businesses.map((business, businessIndex) => (
          <Card key={businessIndex}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">
                  Бизнес #{businessIndex + 1}
                </CardTitle>
                {businesses.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeBusiness(businessIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`business_id_${businessIndex}`}>Business ID *</Label>
                  <Input
                    id={`business_id_${businessIndex}`}
                    value={business.business_id}
                    onChange={(e) => updateBusiness(businessIndex, 'business_id', e.target.value)}
                    placeholder="Зашифрованный Business ID"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`name_${businessIndex}`}>Название</Label>
                  <Input
                    id={`name_${businessIndex}`}
                    value={business.name}
                    onChange={(e) => updateBusiness(businessIndex, 'name', e.target.value)}
                    placeholder="Название бизнеса"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`phone_${businessIndex}`}>Телефон</Label>
                  <Input
                    id={`phone_${businessIndex}`}
                    value={business.phone}
                    onChange={(e) => updateBusiness(businessIndex, 'phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`address_${businessIndex}`}>Адрес</Label>
                  <Input
                    id={`address_${businessIndex}`}
                    value={business.location?.address1}
                    onChange={(e) => updateBusiness(businessIndex, 'location.address1', e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`city_${businessIndex}`}>Город</Label>
                  <Input
                    id={`city_${businessIndex}`}
                    value={business.location?.city}
                    onChange={(e) => updateBusiness(businessIndex, 'location.city', e.target.value)}
                    placeholder="New York"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`state_${businessIndex}`}>Штат</Label>
                  <Input
                    id={`state_${businessIndex}`}
                    value={business.location?.state}
                    onChange={(e) => updateBusiness(businessIndex, 'location.state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Категории *</Label>
                {business.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="flex gap-2">
                    <Input
                      value={category}
                      onChange={(e) => updateCategory(businessIndex, categoryIndex, e.target.value)}
                      placeholder="restaurants, bars, cafes..."
                      required
                    />
                    {business.categories.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCategory(businessIndex, categoryIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCategory(businessIndex)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить категорию
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={addBusiness}
          >
            <Plus className="h-4 w-4 mr-1" />
            Добавить бизнес
          </Button>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Обновление...
              </>
            ) : (
              'Обновить категории'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CategoryManager;
