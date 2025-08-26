import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Target, Save, X, Plus, Trash2 } from 'lucide-react';

interface NegativeKeywordData {
  suggested_keywords?: string[];
  blocked_keywords: string[];
}

interface NegativeKeywordEditorProps {
  data?: NegativeKeywordData;
  onSave: (data: NegativeKeywordData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const NegativeKeywordEditor: React.FC<NegativeKeywordEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>(
    data?.blocked_keywords || []
  );
  const [newKeyword, setNewKeyword] = useState('');
  const [bulkKeywords, setBulkKeywords] = useState('');

  useEffect(() => {
    if (data) {
      setBlockedKeywords(data.blocked_keywords || []);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      suggested_keywords: data?.suggested_keywords || [],
      blocked_keywords: blockedKeywords
    });
  };

  const addKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (keyword && !blockedKeywords.includes(keyword)) {
      setBlockedKeywords(prev => [...prev, keyword]);
      setNewKeyword('');
    }
  };

  const addBulkKeywords = () => {
    const keywords = bulkKeywords
      .split(/[,\n\r]+/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k && !blockedKeywords.includes(k));
    
    setBlockedKeywords(prev => [...prev, ...keywords]);
    setBulkKeywords('');
  };

  const removeKeyword = (keyword: string) => {
    setBlockedKeywords(prev => prev.filter(k => k !== keyword));
  };

  const addSuggestedKeyword = (keyword: string) => {
    if (!blockedKeywords.includes(keyword.toLowerCase())) {
      setBlockedKeywords(prev => [...prev, keyword.toLowerCase()]);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Налаштування негативних ключових слів
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Suggested Keywords */}
          {data?.suggested_keywords && data.suggested_keywords.length > 0 && (
            <div>
              <Label className="text-base font-medium">Рекомендовані ключові слова (від Yelp)</Label>
              <p className="text-sm text-gray-600 mb-3">
                Це слова, по яких ваша реклама може показуватись. Натисніть, щоб заблокувати:
              </p>
              <div className="flex flex-wrap gap-2">
                {data.suggested_keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="cursor-pointer hover:bg-red-50 hover:border-red-300"
                    onClick={() => addSuggestedKeyword(keyword)}
                  >
                    {keyword}
                    <Plus className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add Single Keyword */}
          <div>
            <Label htmlFor="newKeyword">Додати ключове слово для блокування</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="newKeyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Наприклад: cheap, free, competitor_name"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" onClick={addKeyword} disabled={!newKeyword.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Add Keywords */}
          <div>
            <Label htmlFor="bulkKeywords">Додати кілька слів одночасно</Label>
            <Textarea
              id="bulkKeywords"
              value={bulkKeywords}
              onChange={(e) => setBulkKeywords(e.target.value)}
              placeholder="Введіть слова через кому або з нового рядка:&#10;cheap, free, discount&#10;competitor1&#10;competitor2"
              rows={3}
              className="mt-2"
            />
            <Button type="button" onClick={addBulkKeywords} disabled={!bulkKeywords.trim()} className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Додати всі
            </Button>
          </div>

          {/* Current Blocked Keywords */}
          <div>
            <Label className="text-base font-medium">
              Заблоковані ключові слова ({blockedKeywords.length})
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Реклама НЕ буде показуватись при пошуку цих слів:
            </p>
            {blockedKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-red-50 rounded-lg">
                {blockedKeywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="bg-red-100 text-red-800">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Жодне слово не заблоковано</p>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Поради по негативним словам:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Блокуйте слова, що не підходять вашому бізнесу (cheap, free для преміум-сервісів)</li>
              <li>• Додавайте назви конкурентів, щоб не витрачати бюджет на їх клієнтів</li>
              <li>• Блокуйте загальні слова, що не конвертують (jobs, careers для ресторану)</li>
              <li>• Регулярно переглядайте та оновлюйте список</li>
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

export default NegativeKeywordEditor;
