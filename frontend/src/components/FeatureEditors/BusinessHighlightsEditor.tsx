import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Save, X, Plus, AlertTriangle } from 'lucide-react';

interface BusinessHighlightsData {
  active_business_highlights: string[];
  available_business_highlights?: string[];
  mutually_exclusive_business_highlights?: string[][];
}

interface BusinessHighlightsEditorProps {
  data?: BusinessHighlightsData;
  onSave: (data: BusinessHighlightsData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const BusinessHighlightsEditor: React.FC<BusinessHighlightsEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [activeHighlights, setActiveHighlights] = useState<string[]>(
    data?.active_business_highlights || []
  );

  useEffect(() => {
    if (data) {
      setActiveHighlights(data.active_business_highlights || []);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      active_business_highlights: activeHighlights,
      available_business_highlights: data?.available_business_highlights,
      mutually_exclusive_business_highlights: data?.mutually_exclusive_business_highlights
    });
  };

  const toggleHighlight = (highlight: string) => {
    if (activeHighlights.includes(highlight)) {
      // Remove highlight
      setActiveHighlights(prev => prev.filter(h => h !== highlight));
    } else {
      // Add highlight, but check for mutually exclusive ones
      const mutuallyExclusive = findMutuallyExclusive(highlight);
      
      if (mutuallyExclusive) {
        // Remove mutually exclusive highlights first
        setActiveHighlights(prev => 
          [...prev.filter(h => !mutuallyExclusive.includes(h)), highlight]
        );
      } else {
        setActiveHighlights(prev => [...prev, highlight]);
      }
    }
  };

  const findMutuallyExclusive = (highlight: string): string[] | null => {
    if (!data?.mutually_exclusive_business_highlights) return null;

    for (const pair of data.mutually_exclusive_business_highlights) {
      if (pair.includes(highlight)) {
        // Return the other highlight(s) in this mutually exclusive group
        return pair.filter(h => h !== highlight && activeHighlights.includes(h));
      }
    }
    return null;
  };

  const isMutuallyExclusiveWith = (highlight: string): string[] => {
    if (!data?.mutually_exclusive_business_highlights) return [];

    for (const pair of data.mutually_exclusive_business_highlights) {
      if (pair.includes(highlight)) {
        return pair.filter(h => h !== highlight);
      }
    }
    return [];
  };

  const availableHighlights = data?.available_business_highlights || [];

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Business Highlights Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">⭐ About Business Highlights:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Business highlights are displayed in your ads to attract customers</li>
              <li>• Select highlights that best represent your business</li>
              <li>• Some highlights are mutually exclusive (can't be enabled together)</li>
              <li>• Available highlights depend on your business category</li>
            </ul>
          </div>

          {/* Active Highlights */}
          <div>
            <Label className="text-base font-medium">
              Active Highlights ({activeHighlights.length})
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Currently enabled in your ads:
            </p>
            {activeHighlights.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded-lg">
                {activeHighlights.map((highlight) => (
                  <Badge key={highlight} variant="secondary" className="bg-green-100 text-green-800">
                    <Star className="w-3 h-3 mr-1" />
                    {highlight}
                    <button
                      type="button"
                      onClick={() => toggleHighlight(highlight)}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                No highlights currently active
              </p>
            )}
          </div>

          {/* Available Highlights */}
          {availableHighlights.length > 0 && (
            <div>
              <Label className="text-base font-medium">
                Available Highlights
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Click to enable/disable:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableHighlights.map((highlight) => {
                  const isActive = activeHighlights.includes(highlight);
                  const mutuallyExclusiveWith = isMutuallyExclusiveWith(highlight);
                  const hasConflict = mutuallyExclusiveWith.some(h => activeHighlights.includes(h));

                  return (
                    <div key={highlight} className="relative">
                      <Badge
                        variant={isActive ? "default" : "outline"}
                        className={`cursor-pointer ${
                          isActive 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : hasConflict
                            ? 'opacity-50 border-red-300 hover:border-red-500'
                            : 'hover:bg-blue-50 hover:border-blue-300'
                        }`}
                        onClick={() => toggleHighlight(highlight)}
                      >
                        {isActive ? (
                          <Star className="w-3 h-3 mr-1 fill-current" />
                        ) : (
                          <Plus className="w-3 h-3 mr-1" />
                        )}
                        {highlight}
                      </Badge>
                      {hasConflict && !isActive && (
                        <div className="absolute -top-1 -right-1">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mutually Exclusive Info */}
          {data?.mutually_exclusive_business_highlights && 
           data.mutually_exclusive_business_highlights.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Mutually Exclusive Highlights:
              </h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {data.mutually_exclusive_business_highlights.map((pair, index) => (
                  <li key={index}>
                    • <strong>{pair.join(' and ')}</strong> cannot be enabled together
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Best Practices:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Choose highlights that are most relevant to your customers</li>
              <li>• Don't enable too many - focus on your key strengths</li>
              <li>• Update highlights seasonally or based on promotions</li>
              <li>• Test different combinations to see what performs best</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save Highlights
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

export default BusinessHighlightsEditor;
