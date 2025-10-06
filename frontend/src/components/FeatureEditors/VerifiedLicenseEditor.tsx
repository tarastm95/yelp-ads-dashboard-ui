import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Award, Save, X, Plus, Trash2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface License {
  license_number: string;
  license_expiry_date?: string; // YYYY-MM-DD
  license_trade?: string;
  license_issuing_agency?: string;
  license_verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  license_verification_failure_reason?: string;
}

interface VerifiedLicenseData {
  licenses: License[];
}

interface VerifiedLicenseEditorProps {
  data?: VerifiedLicenseData;
  onSave: (data: VerifiedLicenseData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const VerifiedLicenseEditor: React.FC<VerifiedLicenseEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [licenses, setLicenses] = useState<License[]>(
    data?.licenses || [{
      license_number: '',
      license_verification_status: 'PENDING'
    }]
  );

  useEffect(() => {
    if (data?.licenses && data.licenses.length > 0) {
      setLicenses(data.licenses);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty licenses and validate
    const validLicenses = licenses
      .filter(l => l.license_number.trim())
      .map(l => ({
        license_number: l.license_number.trim(),
        license_expiry_date: l.license_expiry_date || undefined,
        license_trade: l.license_trade?.trim() || undefined,
        license_issuing_agency: l.license_issuing_agency?.trim() || undefined,
        license_verification_status: l.license_verification_status,
        license_verification_failure_reason: l.license_verification_failure_reason?.trim() || undefined
      }));

    onSave({ licenses: validLicenses });
  };

  const addLicense = () => {
    setLicenses(prev => [...prev, {
      license_number: '',
      license_verification_status: 'PENDING'
    }]);
  };

  const removeLicense = (index: number) => {
    setLicenses(prev => prev.filter((_, i) => i !== index));
  };

  const updateLicense = (index: number, field: keyof License, value: any) => {
    setLicenses(prev => prev.map((l, i) => 
      i === index ? { ...l, [field]: value } : l
    ));
  };

  const getStatusIcon = (status: License['license_verification_status']) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'REJECTED':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: License['license_verification_status']) => {
    const variants = {
      VERIFIED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <Badge className={variants[status]}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Verified License Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">🏆 About Verified Licenses:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Add professional licenses to build trust with customers</li>
              <li>• Licenses must be verified by Yelp before displaying in ads</li>
              <li>• Status changes from PENDING → VERIFIED or REJECTED</li>
              <li>• Include license number and issuing agency for verification</li>
            </ul>
          </div>

          {/* Licenses List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Licenses ({licenses.length})
              </Label>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1">
                  {getStatusIcon('VERIFIED')} Verified: {licenses.filter(l => l.license_verification_status === 'VERIFIED').length}
                </span>
                <span className="flex items-center gap-1">
                  {getStatusIcon('PENDING')} Pending: {licenses.filter(l => l.license_verification_status === 'PENDING').length}
                </span>
                <span className="flex items-center gap-1">
                  {getStatusIcon('REJECTED')} Rejected: {licenses.filter(l => l.license_verification_status === 'REJECTED').length}
                </span>
              </div>
            </div>

            {licenses.map((license, index) => (
              <Card key={index} className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-medium">License #{index + 1}</h4>
                      {getStatusBadge(license.license_verification_status)}
                    </div>
                    {licenses.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeLicense(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* License Number & Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`license_number_${index}`}>
                        License Number * <span className="text-red-500">Required</span>
                      </Label>
                      <Input
                        id={`license_number_${index}`}
                        value={license.license_number}
                        onChange={(e) => updateLicense(index, 'license_number', e.target.value)}
                        placeholder="ABC-12345"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor={`verification_status_${index}`}>
                        Verification Status * <span className="text-red-500">Required</span>
                      </Label>
                      <Select
                        value={license.license_verification_status}
                        onValueChange={(value) => updateLicense(index, 'license_verification_status', value)}
                      >
                        <SelectTrigger id={`verification_status_${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">
                            <div className="flex items-center gap-2">
                              {getStatusIcon('PENDING')} Pending Verification
                            </div>
                          </SelectItem>
                          <SelectItem value="VERIFIED">
                            <div className="flex items-center gap-2">
                              {getStatusIcon('VERIFIED')} Verified
                            </div>
                          </SelectItem>
                          <SelectItem value="REJECTED">
                            <div className="flex items-center gap-2">
                              {getStatusIcon('REJECTED')} Rejected
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* License Trade & Issuing Agency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`license_trade_${index}`}>
                        License Trade/Field
                      </Label>
                      <Input
                        id={`license_trade_${index}`}
                        value={license.license_trade || ''}
                        onChange={(e) => updateLicense(index, 'license_trade', e.target.value)}
                        placeholder="e.g., Plumbing, Electrical, Medical"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Business or trade for which the license was issued
                      </p>
                    </div>

                    <div>
                      <Label htmlFor={`issuing_agency_${index}`}>
                        Issuing Agency/Authority
                      </Label>
                      <Input
                        id={`issuing_agency_${index}`}
                        value={license.license_issuing_agency || ''}
                        onChange={(e) => updateLicense(index, 'license_issuing_agency', e.target.value)}
                        placeholder="e.g., State of California"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Agency or authority that issued the license
                      </p>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <Label htmlFor={`expiry_date_${index}`}>
                      License Expiry Date
                    </Label>
                    <Input
                      id={`expiry_date_${index}`}
                      type="date"
                      value={license.license_expiry_date || ''}
                      onChange={(e) => updateLicense(index, 'license_expiry_date', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: YYYY-MM-DD (optional)
                    </p>
                  </div>

                  {/* Failure Reason (shown only for REJECTED) */}
                  {license.license_verification_status === 'REJECTED' && (
                    <div>
                      <Label htmlFor={`failure_reason_${index}`}>
                        Verification Failure Reason
                      </Label>
                      <Textarea
                        id={`failure_reason_${index}`}
                        value={license.license_verification_failure_reason || ''}
                        onChange={(e) => updateLicense(index, 'license_verification_failure_reason', e.target.value)}
                        placeholder="Explain why the license was rejected..."
                        rows={2}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add License Button */}
          <Button type="button" onClick={addLicense} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Another License
          </Button>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">⚠️ Verification Process:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>PENDING:</strong> Awaiting Yelp verification (default for new licenses)</li>
              <li>• <strong>VERIFIED:</strong> License confirmed by Yelp (displays in ads)</li>
              <li>• <strong>REJECTED:</strong> License could not be verified (won't display)</li>
              <li>• Only VERIFIED licenses appear in your advertisements</li>
              <li>• Verification typically takes 1-3 business days</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Best Practices:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Provide accurate license numbers for faster verification</li>
              <li>• Include issuing agency to speed up the process</li>
              <li>• Keep expiry dates up to date</li>
              <li>• Add all relevant professional licenses</li>
              <li>• Check verification status regularly</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save Licenses
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

export default VerifiedLicenseEditor;
