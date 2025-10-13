import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Briefcase, Save, X, Plus, Trash2, Check } from 'lucide-react';

interface ServiceOfferingsData {
  disabled_service_offerings: string[];
  enabled_service_offerings: string[];
}

interface ServiceOfferingsEditorProps {
  data?: ServiceOfferingsData;
  onSave: (data: ServiceOfferingsData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ServiceOfferingsEditor: React.FC<ServiceOfferingsEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [disabledOfferings, setDisabledOfferings] = useState<string[]>(
    data?.disabled_service_offerings || []
  );
  const [enabledOfferings, setEnabledOfferings] = useState<string[]>(
    data?.enabled_service_offerings || []
  );

  useEffect(() => {
    if (data) {
      setDisabledOfferings(data.disabled_service_offerings || []);
      setEnabledOfferings(data.enabled_service_offerings || []);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      disabled_service_offerings: disabledOfferings,
      enabled_service_offerings: enabledOfferings
    });
  };

  const toggleOffering = (offering: string) => {
    if (disabledOfferings.includes(offering)) {
      // Move from disabled to enabled
      setDisabledOfferings(prev => prev.filter(o => o !== offering));
      if (!enabledOfferings.includes(offering)) {
        setEnabledOfferings(prev => [...prev, offering]);
      }
    } else {
      // Move from enabled to disabled
      setEnabledOfferings(prev => prev.filter(o => o !== offering));
      if (!disabledOfferings.includes(offering)) {
        setDisabledOfferings(prev => [...prev, offering]);
      }
    }
  };

  // Get all unique offerings
  const allOfferings = Array.from(
    new Set([...disabledOfferings, ...enabledOfferings])
  ).sort();

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Service Offerings Targeting
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">🎯 About Service Offerings:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Control which service offerings show in your ads</li>
              <li>• <strong>Enabled:</strong> These service offerings will be advertised</li>
              <li>• <strong>Disabled:</strong> These service offerings won't be advertised</li>
              <li>• Available offerings depend on your business category</li>
            </ul>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-green-800">
                <Check className="w-4 h-4 inline mr-1" />
                Enabled: {enabledOfferings.length}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-red-800">
                <X className="w-4 h-4 inline mr-1" />
                Disabled: {disabledOfferings.length}
              </p>
            </div>
          </div>

          {/* All Service Offerings */}
          {allOfferings.length > 0 && (
            <div>
              <Label className="text-base font-medium">All Service Offerings</Label>
              <p className="text-sm text-gray-600 mb-3">
                Click to toggle enabled/disabled:
              </p>
              <div className="flex flex-wrap gap-2">
                {allOfferings.map((offering) => {
                  const isDisabled = disabledOfferings.includes(offering);
                  return (
                    <Badge
                      key={offering}
                      variant={isDisabled ? "destructive" : "default"}
                      className={`cursor-pointer ${
                        isDisabled
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                      onClick={() => toggleOffering(offering)}
                    >
                      {isDisabled ? (
                        <X className="w-3 h-3 mr-1" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      {offering}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enabled Offerings */}
          <div>
            <Label className="text-base font-medium text-green-800">
              Enabled Offerings ({enabledOfferings.length})
            </Label>
            {enabledOfferings.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded-lg mt-2">
                {enabledOfferings.map((offering) => (
                  <Badge key={offering} variant="secondary" className="bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    {offering}
                    <button
                      type="button"
                      onClick={() => toggleOffering(offering)}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic p-3 bg-gray-50 rounded-lg mt-2">
                No offerings enabled - all offerings will be disabled in ads
              </p>
            )}
          </div>

          {/* Disabled Offerings */}
          <div>
            <Label className="text-base font-medium text-red-800">
              Disabled Offerings ({disabledOfferings.length})
            </Label>
            {disabledOfferings.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-red-50 rounded-lg mt-2">
                {disabledOfferings.map((offering) => (
                  <Badge key={offering} variant="secondary" className="bg-red-100 text-red-800">
                    <X className="w-3 h-3 mr-1" />
                    {offering}
                    <button
                      type="button"
                      onClick={() => toggleOffering(offering)}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic p-3 bg-gray-50 rounded-lg mt-2">
                No offerings explicitly disabled
              </p>
            )}
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">⚠️ Important Notes:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>For GET:</strong> Both fields show current state</li>
              <li>• <strong>For POST:</strong> <code>disabled_service_offerings</code> is required, 
                  <code>enabled_service_offerings</code> can be omitted</li>
              <li>• If you disable all offerings, no service-specific ads will show</li>
              <li>• Changes apply only to this ad campaign</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Best Practices:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Enable only the services you're actively promoting</li>
              <li>• Disable services that are temporarily unavailable</li>
              <li>• Test different combinations to see what converts best</li>
              <li>• Keep disabled list minimal for better ad reach</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
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

export default ServiceOfferingsEditor;
