import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useGetPortfolioProjectQuery,
  useUpdatePortfolioProjectMutation,
  PortfolioProject,
  PortfolioProjectCreateRequest
} from '../store/api/yelpApi';

interface PortfolioProjectEditorProps {
  programId: string;
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const PortfolioProjectEditor: React.FC<PortfolioProjectEditorProps> = ({
  programId,
  projectId,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<PortfolioProjectCreateRequest>({
    name: '',
    description: '',
    call_to_action: 'WEBSITE',
    service_offerings: [],
    cost: undefined,
    duration: undefined,
    completion_year: undefined,
    completion_month: undefined,
  });
  
  const [newService, setNewService] = useState('');

  const { data: project, isLoading, error } = useGetPortfolioProjectQuery({
    program_id: programId,
    project_id: projectId,
  });

  const [updateProject, { isLoading: isUpdating }] = useUpdatePortfolioProjectMutation();

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        call_to_action: project.call_to_action,
        service_offerings: [...project.service_offerings],
        cost: project.cost,
        duration: project.duration,
        completion_year: project.completion_year,
        completion_month: project.completion_month,
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Помилка валідації',
        description: 'Назва проєкту є обов\'язковою',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Помилка валідації',
        description: 'Опис проєкту є обов\'язковим',
        variant: 'destructive',
      });
      return;
    }

    if (formData.service_offerings.length > 4) {
      toast({
        title: 'Помилка валідації',
        description: 'Максимум 4 послуги дозволено',
        variant: 'destructive',
      });
      return;
    }

    if (formData.completion_month && (formData.completion_month < 1 || formData.completion_month > 12)) {
      toast({
        title: 'Помилка валідації',
        description: 'Місяць має бути від 1 до 12',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateProject({
        program_id: programId,
        project_id: projectId,
        data: formData,
      }).unwrap();

      toast({
        title: 'Проєкт оновлено',
        description: 'Зміни збережено успішно',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('❌ Update project error:', error);
      toast({
        title: 'Помилка оновлення',
        description: error.data?.detail || 'Не вдалося оновити проєкт',
        variant: 'destructive',
      });
    }
  };

  const addService = () => {
    if (newService.trim() && formData.service_offerings.length < 4) {
      setFormData(prev => ({
        ...prev,
        service_offerings: [...prev.service_offerings, newService.trim()]
      }));
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      service_offerings: prev.service_offerings.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Завантаження проєкту...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold text-red-600">Помилка завантаження</h3>
        <p className="text-gray-600 mt-2">Не вдалося завантажити дані проєкту</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Основна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Назва проєкту *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Введіть назву проєкту"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Опис проєкту *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Детальний опис проєкту"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="cta">Дія виклику</Label>
              <Select
                value={formData.call_to_action}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, call_to_action: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEBSITE">Веб-сайт</SelectItem>
                  <SelectItem value="CALL">Зателефонувати</SelectItem>
                  <SelectItem value="BOOK_APPOINTMENT">Записатися</SelectItem>
                  <SelectItem value="GET_QUOTE">Отримати пропозицію</SelectItem>
                  <SelectItem value="LEARN_MORE">Дізнатися більше</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Деталі проєкту</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cost">Вартість</Label>
              <Select
                value={formData.cost || ''}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  cost: value as any || undefined 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть діапазон вартості" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не вказано</SelectItem>
                  <SelectItem value="UNDER_100">Менше $100</SelectItem>
                  <SelectItem value="100_500">$100 - $500</SelectItem>
                  <SelectItem value="500_1000">$500 - $1,000</SelectItem>
                  <SelectItem value="1000_5000">$1,000 - $5,000</SelectItem>
                  <SelectItem value="5000_PLUS">$5,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Тривалість</Label>
              <Select
                value={formData.duration || ''}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  duration: value as any || undefined 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть тривалість проєкту" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не вказано</SelectItem>
                  <SelectItem value="UNDER_1_WEEK">Менше тижня</SelectItem>
                  <SelectItem value="1_2_WEEKS">1-2 тижні</SelectItem>
                  <SelectItem value="2_4_WEEKS">2-4 тижні</SelectItem>
                  <SelectItem value="1_3_MONTHS">1-3 місяці</SelectItem>
                  <SelectItem value="3_PLUS_MONTHS">3+ місяці</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Рік завершення</Label>
                <Input
                  id="year"
                  type="number"
                  min="2000"
                  max="2030"
                  value={formData.completion_year || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    completion_year: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="2024"
                />
              </div>

              <div>
                <Label htmlFor="month">Місяць завершення</Label>
                <Input
                  id="month"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.completion_month || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    completion_month: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="12"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Offerings */}
      <Card>
        <CardHeader>
          <CardTitle>Послуги (макс. 4)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Додати послугу"
                disabled={formData.service_offerings.length >= 4}
              />
              <Button 
                type="button" 
                onClick={addService}
                disabled={!newService.trim() || formData.service_offerings.length >= 4}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {formData.service_offerings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.service_offerings.map((service, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {service}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-500" 
                      onClick={() => removeService(index)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Скасувати
        </Button>
        <Button type="submit" disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Зберегти зміни
        </Button>
      </div>
    </form>
  );
};

export default PortfolioProjectEditor;
