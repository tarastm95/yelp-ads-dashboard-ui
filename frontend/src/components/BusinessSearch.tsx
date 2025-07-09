
import React, { useState } from 'react';
import { useGetBusinessMatchesQuery } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Copy, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const BusinessSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    name: '',
    address1: '',
    city: '',
    state: '',
    country: 'US',
  });
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data: businesses, isLoading, error } = useGetBusinessMatchesQuery(
    searchParams,
    { skip: !shouldFetch }
  );

  const handleSearch = () => {
    if (!searchParams.name || !searchParams.city) {
      toast({
        title: "Заполните обязательные поля",
        description: "Название и город обязательны для поиска",
        variant: "destructive",
      });
      return;
    }
    setShouldFetch(true);
  };

  const copyBusinessId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Business ID скопирован",
      description: "ID скопирован в буфер обмена",
    });
  };

  const handleChange = (field: string, value: string) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
    setShouldFetch(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Поиск бизнесов
          </CardTitle>
          <CardDescription>
            Найдите бизнес для получения зашифрованного Business ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название бизнеса *</Label>
              <Input
                id="name"
                value={searchParams.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="McDonald's"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address1">Адрес</Label>
              <Input
                id="address1"
                value={searchParams.address1}
                onChange={(e) => handleChange('address1', e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Город *</Label>
              <Input
                id="city"
                value={searchParams.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="New York"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Штат</Label>
              <Input
                id="state"
                value={searchParams.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="NY"
              />
            </div>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={isLoading}
            className="mt-4 w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Поиск...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Найти бизнесы
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {businesses && businesses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Результаты поиска</h3>
          {businesses.map((business) => (
            <Card key={business.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold">{business.name}</h4>
                    <p className="text-sm text-muted-foreground">{business.alias}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyBusinessId(business.id)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Копировать ID
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Business ID</p>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                      {business.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <p className="text-sm">{business.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Адрес</p>
                  <p className="text-sm">
                    {business.location.address1}, {business.location.city}, {business.location.state} {business.location.zip_code}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Ошибка поиска бизнесов</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BusinessSearch;
