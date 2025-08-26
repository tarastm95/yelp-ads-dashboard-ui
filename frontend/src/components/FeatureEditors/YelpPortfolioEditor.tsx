import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Save, X, Plus, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';

interface YelpPortfolioProject {
  project_id: string;
  published: boolean;
}

interface YelpPortfolioData {
  projects: YelpPortfolioProject[];
}

interface YelpPortfolioEditorProps {
  data?: YelpPortfolioData;
  onSave: (data: YelpPortfolioData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const YelpPortfolioEditor: React.FC<YelpPortfolioEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [projects, setProjects] = useState<YelpPortfolioProject[]>(
    data?.projects || []
  );

  useEffect(() => {
    if (data) {
      setProjects(data.projects || []);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty project IDs
    const validProjects = projects
      .filter(p => p.project_id.trim())
      .map(p => ({
        project_id: p.project_id.trim(),
        published: p.published
      }));

    onSave({ projects: validProjects });
  };

  const addProject = () => {
    setProjects(prev => [...prev, { project_id: '', published: true }]);
  };

  const removeProject = (index: number) => {
    setProjects(prev => prev.filter((_, i) => i !== index));
  };

  const updateProject = (index: number, field: keyof YelpPortfolioProject, value: string | boolean) => {
    setProjects(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const isValidProjectId = (id: string): boolean => {
    // Project ID should be alphanumeric and reasonable length
    const projectIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
    return projectIdPattern.test(id);
  };

  const toggleAllPublished = () => {
    const allPublished = projects.every(p => p.published);
    setProjects(prev => prev.map(p => ({ ...p, published: !allPublished })));
  };

  const publishedCount = projects.filter(p => p.published).length;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Налаштування Yelp Portfolio в рекламі
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">📂 Що таке Yelp Portfolio:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Показує ваші проекти/роботи прямо в рекламі</li>
              <li>• Підвищує довіру потенційних клієнтів</li>
              <li>• Демонструє якість ваших послуг</li>
              <li>• Тільки опубліковані проекти будуть показуватись в рекламі</li>
            </ul>
          </div>

          {/* Summary */}
          {projects.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    📊 Загальна статистика: {projects.length} проект(ів)
                  </p>
                  <p className="text-xs text-gray-600">
                    Опубліковано: {publishedCount} | Не опубліковано: {projects.length - publishedCount}
                  </p>
                </div>
                {projects.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllPublished}
                  >
                    {projects.every(p => p.published) ? 'Приховати всі' : 'Опублікувати всі'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Проекти портфоліо:</Label>
              {projects.length === 0 && (
                <span className="text-sm text-gray-500">Немає проектів</span>
              )}
            </div>

            {projects.map((project, index) => (
              <Card key={index} className="border-gray-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    {/* Project ID Input */}
                    <div className="flex-1">
                      <Label htmlFor={`project_id_${index}`}>ID проекту *</Label>
                      <Input
                        id={`project_id_${index}`}
                        value={project.project_id}
                        onChange={(e) => updateProject(index, 'project_id', e.target.value)}
                        placeholder="project_id_from_portfolio"
                        required
                        className={`${
                          project.project_id && !isValidProjectId(project.project_id) ? 'border-red-500' : ''
                        }`}
                      />
                      {project.project_id && !isValidProjectId(project.project_id) && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ ID проекту має містити лише букви, цифри, дефіси та підкреслення (3-50 символів)
                        </p>
                      )}
                    </div>

                    {/* Published Toggle */}
                    <div className="flex flex-col items-center gap-2 min-w-[120px]">
                      <Label className="text-sm">Статус</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={project.published}
                          onCheckedChange={(checked) => updateProject(index, 'published', checked)}
                        />
                        <Badge 
                          variant={project.published ? "default" : "secondary"}
                          className={project.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                        >
                          {project.published ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Опубліковано
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Приховано
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeProject(index)}
                      className="mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Project Preview */}
                  {project.project_id && isValidProjectId(project.project_id) && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Проект: <code className="bg-white px-2 py-1 rounded">{project.project_id}</code></p>
                          <p className="text-xs text-gray-500">
                            {project.published ? 'Буде показуватись в рекламі' : 'Не буде показуватись в рекламі'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Navigate to portfolio manager for this project
                            const currentPath = window.location.pathname;
                            const programId = currentPath.split('/').pop();
                            window.open(`/portfolio/${programId}`, '_blank');
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Переглянути
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add Project Button */}
            <Button type="button" onClick={addProject} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Додати проект до реклами
            </Button>
          </div>

          {/* How to find Project ID */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">🔍 Як знайти ID проекту:</h4>
            <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
              <li>Перейдіть до розділу Portfolio в цьому додатку</li>
              <li>Створіть або оберіть існуючий проект</li>
              <li>Скопіюйте ID проекту з деталей проекту</li>
              <li>Вставте ID в поле вище</li>
              <li>Увімкніть "Опубліковано", щоб проект показувався в рекламі</li>
            </ol>
          </div>

          {/* Tips */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Поради для ефективного портфоліо:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Якість:</strong> Додавайте тільки найкращі проекти</li>
              <li>• <strong>Різноманітність:</strong> Покажіть різні види робіт</li>
              <li>• <strong>Актуальність:</strong> Регулярно оновлюйте портфоліо</li>
              <li>• <strong>Деталі:</strong> Добавляйте детальні описи проектів</li>
              <li>• <strong>Фото:</strong> Використовуйте якісні фото "до" і "після"</li>
            </ul>
          </div>

          {/* Performance Note */}
          {projects.length > 5 && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">⚡ Оптимізація продуктивності:</h4>
              <p className="text-xs text-gray-600">
                У вас {projects.length} проект(ів). Рекомендуємо показувати в рекламі не більше 3-5 найкращих проектів 
                для оптимальної продуктивності та фокусу на якості.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || projects.some(p => p.project_id && !isValidProjectId(p.project_id))} 
              className="flex-1"
            >
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Зберегти портфоліо налаштування
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

export default YelpPortfolioEditor;
