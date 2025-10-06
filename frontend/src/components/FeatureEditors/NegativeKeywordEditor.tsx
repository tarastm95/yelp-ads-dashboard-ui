import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Target, Save, X, Plus, Trash2 } from 'lucide-react';
import { useAddCustomSuggestedKeywordsMutation, useDeleteCustomSuggestedKeywordsMutation } from '@/store/api/yelpApi';
import { useToast } from '@/hooks/use-toast';

interface NegativeKeywordData {
  suggested_keywords?: string[];
  blocked_keywords: string[];
}

interface NegativeKeywordEditorProps {
  data?: NegativeKeywordData;
  programId: string;
  onSave: (data: NegativeKeywordData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const NegativeKeywordEditor: React.FC<NegativeKeywordEditorProps> = ({
  data,
  programId,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const { toast } = useToast();
  const [addCustomKeywords, { isLoading: isAddingCustom }] = useAddCustomSuggestedKeywordsMutation();
  const [deleteCustomKeywords, { isLoading: isDeletingCustom }] = useDeleteCustomSuggestedKeywordsMutation();
  
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>(
    data?.blocked_keywords || []
  );
  const [newKeyword, setNewKeyword] = useState('');
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [newCustomSuggested, setNewCustomSuggested] = useState('');
  const [bulkCustomSuggested, setBulkCustomSuggested] = useState('');

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

  const handleAddCustomSuggested = async () => {
    const keyword = newCustomSuggested.trim().toLowerCase();
    if (!keyword) return;
    
    try {
      const result = await addCustomKeywords({
        program_id: programId,
        keywords: [keyword]
      }).unwrap();
      
      toast({
        title: 'Custom keyword added',
        description: `Added "${keyword}" to suggested keywords`,
      });
      setNewCustomSuggested('');
    } catch (error: any) {
      toast({
        title: 'Error adding keyword',
        description: error?.data?.error || 'Failed to add custom suggested keyword',
        variant: 'destructive',
      });
    }
  };

  const handleAddBulkCustomSuggested = async () => {
    const keywords = bulkCustomSuggested
      .split(/[,\n\r]+/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k);
    
    if (keywords.length === 0) return;
    
    try {
      const result = await addCustomKeywords({
        program_id: programId,
        keywords
      }).unwrap();
      
      toast({
        title: 'Custom keywords added',
        description: `Added ${result.created.length} keywords (${result.skipped.length} duplicates skipped)`,
      });
      setBulkCustomSuggested('');
    } catch (error: any) {
      toast({
        title: 'Error adding keywords',
        description: error?.data?.error || 'Failed to add custom suggested keywords',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCustomSuggested = async (keyword: string) => {
    try {
      await deleteCustomKeywords({
        program_id: programId,
        keywords: [keyword]
      }).unwrap();
      
      toast({
        title: 'Custom keyword deleted',
        description: `Removed "${keyword}" from suggested keywords`,
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting keyword',
        description: error?.data?.error || 'Failed to delete custom suggested keyword',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Negative keyword settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Suggested Keywords */}
          {data?.suggested_keywords && data.suggested_keywords.length > 0 && (
            <div>
              <Label className="text-base font-medium">Suggested keywords (Yelp + Custom)</Label>
              <p className="text-sm text-gray-600 mb-3">
                These are keywords your ads may show for. Click to block:
              </p>
              <div className="flex flex-wrap gap-2">
                {data.suggested_keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="cursor-pointer hover:bg-red-50 hover:border-red-300 group relative"
                    onClick={() => addSuggestedKeyword(keyword)}
                  >
                    {keyword}
                    <Plus className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Suggested Keywords */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <div>
              <Label className="text-base font-medium">Manage custom suggested keywords</Label>
              <p className="text-sm text-gray-600 mb-3">
                Add your own keywords to the suggested list (will appear above, merged with Yelp suggestions)
              </p>
            </div>

            <div>
              <Label htmlFor="newCustomSuggested">Add single custom keyword</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="newCustomSuggested"
                  value={newCustomSuggested}
                  onChange={(e) => setNewCustomSuggested(e.target.value)}
                  placeholder="e.g., emergency, 24/7, urgent"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSuggested())}
                />
                <Button 
                  type="button" 
                  onClick={handleAddCustomSuggested} 
                  disabled={!newCustomSuggested.trim() || isAddingCustom}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="bulkCustomSuggested">Add multiple custom keywords</Label>
              <Textarea
                id="bulkCustomSuggested"
                value={bulkCustomSuggested}
                onChange={(e) => setBulkCustomSuggested(e.target.value)}
                placeholder="Enter keywords separated by commas or new lines:&#10;emergency, 24/7, urgent&#10;local&#10;nearby"
                rows={2}
                className="mt-2"
              />
              <Button 
                type="button" 
                onClick={handleAddBulkCustomSuggested} 
                disabled={!bulkCustomSuggested.trim() || isAddingCustom} 
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add all
              </Button>
            </div>
          </div>

          {/* Add Single Keyword */}
          <div>
            <Label htmlFor="newKeyword">Add keyword to block</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="newKeyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g., cheap, free, competitor_name"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" onClick={addKeyword} disabled={!newKeyword.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Add Keywords */}
          <div>
            <Label htmlFor="bulkKeywords">Add multiple keywords at once</Label>
            <Textarea
              id="bulkKeywords"
              value={bulkKeywords}
              onChange={(e) => setBulkKeywords(e.target.value)}
              placeholder="Enter words separated by commas or new lines:&#10;cheap, free, discount&#10;competitor1&#10;competitor2"
              rows={3}
              className="mt-2"
            />
            <Button type="button" onClick={addBulkKeywords} disabled={!bulkKeywords.trim()} className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Add all
            </Button>
          </div>

          {/* Current Blocked Keywords */}
          <div>
            <Label className="text-base font-medium">
              Blocked keywords ({blockedKeywords.length})
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Ads will NOT be shown for these keywords:
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
              <p className="text-gray-500 italic">No keywords blocked</p>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Tips for negative keywords:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Block terms that don't fit your business (cheap, free for premium services)</li>
              <li>• Add competitor names to avoid spending budget on their customers</li>
              <li>• Block generic terms that don't convert (jobs, careers for a restaurant)</li>
              <li>• Regularly review and update the list</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save settings
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default NegativeKeywordEditor;
