import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Phone, Save, X, Plus, Trash2, Building } from 'lucide-react';

interface CallTrackingBusiness {
  business_id: string;
  metered_phone_number: string | null;
}

interface CallTrackingData {
  enabled: boolean;
  businesses: CallTrackingBusiness[];
}

interface CallTrackingEditorProps {
  data?: CallTrackingData;
  onSave: (data: CallTrackingData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CallTrackingEditor: React.FC<CallTrackingEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [enabled, setEnabled] = useState<boolean>(data?.enabled || false);
  const [businesses, setBusinesses] = useState<CallTrackingBusiness[]>(
    data?.businesses || [{ business_id: '', metered_phone_number: null }]
  );

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled || false);
      setBusinesses(data.businesses?.length > 0 ? data.businesses : [{ business_id: '', metered_phone_number: null }]);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty businesses
    const validBusinesses = businesses
      .filter(b => b.business_id.trim())
      .map(b => ({
        business_id: b.business_id.trim(),
        metered_phone_number: b.metered_phone_number?.trim() || null
      }));

    onSave({
      enabled,
      businesses: validBusinesses
    });
  };

  const addBusiness = () => {
    setBusinesses(prev => [...prev, { business_id: '', metered_phone_number: null }]);
  };

  const removeBusiness = (index: number) => {
    setBusinesses(prev => prev.filter((_, i) => i !== index));
  };

  const updateBusiness = (index: number, field: keyof CallTrackingBusiness, value: string) => {
    setBusinesses(prev => prev.map((b, i) => 
      i === index ? { ...b, [field]: value || null } : b
    ));
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    return phone; // Return as-is if doesn't match expected format
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Call tracking settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Global Enable/Disable */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Switch
              id="call-tracking-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <div>
              <Label htmlFor="call-tracking-enabled" className="text-base font-medium">
                Enable Call Tracking
              </Label>
              <p className="text-sm text-gray-600">
                {enabled 
                  ? 'Call tracking is active for the entire campaign' 
                  : 'Call tracking is disabled'
                }
              </p>
            </div>
          </div>

          {enabled && (
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">📞 How call tracking works:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Yelp provides special phone numbers for each business</li>
                  <li>• These numbers replace your regular numbers in ads</li>
                  <li>• Calls are forwarded to your real number</li>
                  <li>• Call reporting is available in the Yelp dashboard</li>
                  <li>• Setting affects only this CPC program</li>
                  <li>• Numbers can also be set at the location level (Data Ingestion API)</li>
                </ul>
              </div>

              <Label className="text-base font-medium">Settings for businesses:</Label>

              {businesses.map((business, index) => (
                <Card key={index} className="border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Business #{index + 1}
                      </h4>
                      {businesses.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeBusiness(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`business_id_${index}`}>Business ID *</Label>
                      <Input
                        id={`business_id_${index}`}
                        value={business.business_id}
                        onChange={(e) => updateBusiness(index, 'business_id', e.target.value)}
                        placeholder="your_business_id_here"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor={`phone_${index}`}>Tracking number</Label>
                      <Input
                        id={`phone_${index}`}
                        type="tel"
                        value={business.metered_phone_number || ''}
                        onChange={(e) => updateBusiness(index, 'metered_phone_number', e.target.value)}
                        placeholder="(555) 123-4567 or leave blank"
                        onBlur={(e) => {
                          if (e.target.value) {
                            updateBusiness(index, 'metered_phone_number', formatPhoneNumber(e.target.value));
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Optional. If not provided, this business will not use call tracking within this CPC program
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button type="button" onClick={addBusiness} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add another business
              </Button>
            </div>
          )}

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">📊 Call tracking benefits:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>ROI analysis:</strong> analyze effectiveness of calls from ads</li>
              <li>• <strong>Optimization:</strong> understand which keywords generate calls</li>
              <li>• <strong>Traffic quality:</strong> distinguish paid from organic traffic</li>
              <li>• <strong>Conversions:</strong> track the funnel from click to call</li>
              <li>• <strong>Reporting:</strong> call tracking is not currently shown in the Reporting API</li>
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

export default CallTrackingEditor;
