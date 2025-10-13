import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Target, Save, X, Phone, Globe, BarChart3 } from 'lucide-react';

interface AdGoalData {
  ad_goal: 'DEFAULT' | 'CALLS' | 'WEBSITE_CLICKS';
}

interface AdGoalEditorProps {
  data?: AdGoalData;
  onSave: (data: AdGoalData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const AdGoalEditor: React.FC<AdGoalEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [selectedGoal, setSelectedGoal] = useState<AdGoalData['ad_goal']>(
    data?.ad_goal || 'DEFAULT'
  );

  useEffect(() => {
    if (data) {
      setSelectedGoal(data.ad_goal);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ad_goal: selectedGoal });
  };

  const goalOptions = [
    {
      value: 'DEFAULT' as const,
      label: 'Standard Optimization',
      description: 'Yelp automatically optimizes delivery and CTA for overall effectiveness',
      icon: BarChart3,
      color: 'text-blue-600'
    },
    {
      value: 'CALLS' as const,
      label: 'Maximize Calls',
      description: 'CTA changes to "Call business" to maximize phone calls',
      icon: Phone,
      color: 'text-green-600'
    },
    {
      value: 'WEBSITE_CLICKS' as const,
      label: 'Maximize Website Clicks',
      description: 'CTA becomes "Visit website" for direct clicks to external site',
      icon: Globe,
      color: 'text-purple-600'
    }
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Ad Goal Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-base font-medium">Choose your advertising campaign goal:</Label>
            <RadioGroup
              value={selectedGoal}
              onValueChange={(value) => setSelectedGoal(value as AdGoalData['ad_goal'])}
              className="mt-4 space-y-4"
            >
              {goalOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1">
                      <label
                        htmlFor={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <IconComponent className={`w-5 h-5 ${option.color}`} />
                        <span className="font-medium">{option.label}</span>
                      </label>
                      <p className="text-sm text-gray-600 mt-1 ml-7">
                        {option.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">ℹ️ Important to know:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Standard Optimization:</strong> Yelp automatically optimizes delivery and CTA for overall effectiveness</li>
              <li>• <strong>Maximize Calls:</strong> Usually suitable for service businesses (salons, repairs, medical)</li>
              <li>• <strong>Maximize Clicks:</strong> Usually suitable for e-commerce and informational websites</li>
              <li>• If Link Tracking is configured, choosing "Website Clicks" will use tracking URL</li>
              <li>• Goals can be changed during the campaign as needed</li>
              <li>• Changing goals may affect click types, CTA and ad metrics</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save Goal
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

export default AdGoalEditor;
