import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface CustomAdTextData {
  custom_review_id?: string | null;
  custom_text?: string | null;
}

interface CustomAdTextEditorProps {
  data?: CustomAdTextData;
  onSave: (data: CustomAdTextData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CustomAdTextEditor: React.FC<CustomAdTextEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [mode, setMode] = useState<'disabled' | 'custom_text' | 'review'>('disabled');
  const [customText, setCustomText] = useState('');
  const [reviewId, setReviewId] = useState('');

  useEffect(() => {
    if (data) {
      if (data.custom_text) {
        setMode('custom_text');
        setCustomText(data.custom_text);
      } else if (data.custom_review_id) {
        setMode('review');
        setReviewId(data.custom_review_id);
      } else {
        setMode('disabled');
      }
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let payload: CustomAdTextData = {
      custom_review_id: null,
      custom_text: null
    };

    if (mode === 'custom_text' && customText.trim()) {
      payload.custom_text = customText.trim();
    } else if (mode === 'review' && reviewId.trim()) {
      payload.custom_review_id = reviewId.trim();
    }

    onSave(payload);
  };

    const validateCustomText = (text: string) => {
    const errors: string[] = [];

    // Basic checks according to practical limits
    if (text.length > 1500) errors.push('Maximum ~1500 characters (practical limit)');
    if (text.trim().length === 0) errors.push('Text cannot be empty');
    
    // Style recommendations (not strict API rules)
    const uppercasePercent = (text.match(/[A-ZА-Я]/g) || []).length / text.length;
    if (uppercasePercent > 0.4) errors.push('Recommend fewer capital letters (≤40%)');
    
    // Check for excessive use of exclamation marks
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 3) errors.push('Recommend fewer exclamation marks');

    return errors;
  };

  const textErrors = mode === 'custom_text' ? validateCustomText(customText) : [];
  const isTextValid = mode !== 'custom_text' || textErrors.length === 0;

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Custom Ad Text Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-base font-medium">Choose ad text type:</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as typeof mode)}
              className="mt-4 space-y-4"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="disabled" id="disabled" className="mt-1" />
                <div>
                  <label htmlFor="disabled" className="font-medium cursor-pointer">
                    Automatic Yelp Text
                  </label>
                  <p className="text-sm text-gray-600">
                    Yelp automatically generates ad text based on your business information
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="custom_text" id="custom_text" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="custom_text" className="font-medium cursor-pointer">
                    Custom Text
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Write your own ad text
                  </p>
                  
                  {mode === 'custom_text' && (
                    <div className="space-y-3">
                      <Textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Enter ad text (up to ~1500 characters)&#10;&#10;Example:&#10;Best pizza in town! Fresh ingredients, fast delivery and unmatched taste. Order now and get 15% off your first pizza!"
                        rows={4}
                        className={textErrors.length > 0 ? 'border-red-500' : 'border-green-500'}
                      />
                      
                      <div className="flex justify-between text-xs">
                        <span className={customText.length > 1500 ? 'text-red-500' : 'text-gray-500'}>
                          Characters: {customText.length} / ~1500
                        </span>
                        <span className={customText.trim().length > 0 && customText.length <= 1500 ? 'text-green-500' : 'text-red-500'}>
                          {customText.trim().length > 0 && customText.length <= 1500 ? '✓' : '✗'} Length
                        </span>
                      </div>

                      {textErrors.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-800">Validation errors:</span>
                          </div>
                          <ul className="text-xs text-red-700 space-y-1">
                            {textErrors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {textErrors.length === 0 && customText.trim().length > 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Text passed validation!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="review" id="review" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="review" className="font-medium cursor-pointer">
                    Review Text
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Use text from a specific customer review
                  </p>
                  
                  {mode === 'review' && (
                    <Input
                      value={reviewId}
                      onChange={(e) => setReviewId(e.target.value)}
                      placeholder="Enter review ID (e.g.: review_abc123xyz)"
                    />
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">📝 Ad Text Rules:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Fields:</strong> fill either "Custom Text" or "Review Text" (not both)</li>
              <li>• <strong>Length:</strong> keep text concise; up to ~1500 characters (practical limit)</li>
              <li>• <strong>Style:</strong> avoid excessive CAPITAL LETTERS and exclamation marks</li>
              <li>• <strong>Content:</strong> don't add contact info/URLs in text (use CTA for links)</li>
              <li>• <strong>If both fields empty:</strong> Yelp will set text automatically</li>
              <li>• <strong>Relevance:</strong> text should match your business</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Tips for effective text:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Highlight your business's unique advantages</li>
              <li>• Use specific facts (speed, quality, experience)</li>
              <li>• Add a call to action (order, call, visit)</li>
              <li>• Mention special offers or discounts</li>
              <li>• Write in natural language, avoid advertising clichés</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || !isTextValid} 
              className="flex-1"
            >
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save Text
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

export default CustomAdTextEditor;
