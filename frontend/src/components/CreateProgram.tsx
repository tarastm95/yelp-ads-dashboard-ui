
import React, { useState, useEffect } from 'react';
import { useCreateProgramMutation, useGetBusinessIdsQuery } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatErrorForToast } from '@/lib/utils';
import { Plus, Loader2, Info, Building2, Edit3 } from 'lucide-react';
import JobTracker from './JobTracker';

const PROGRAM_OPTIONS = [
  { value: 'BP', label: 'BP \u2013 Branded Profile' },
  { value: 'EP', label: 'EP \u2013 Enhanced Profile' },
  { value: 'CPC', label: 'CPC \u2013 Cost Per Click ads' },
  { value: 'RCA', label: 'RCA \u2013 Remove Competitor Ads' },
  { value: 'CTA', label: 'CTA \u2013 Call To Action' },
  { value: 'SLIDESHOW', label: 'SLIDESHOW \u2013 Slideshow' },
  { value: 'BH', label: 'BH \u2013 Business Highlights' },
  { value: 'VL', label: 'VL \u2013 Verified License' },
  { value: 'LOGO', label: 'LOGO \u2013 Logo Feature' },
  { value: 'PORTFOLIO', label: 'PORTFOLIO \u2013 Portfolio Feature' },
];

const PROGRAM_DESCRIPTIONS = [
  { code: 'BP', name: 'Branded Profile', description: 'Enhanced business profile with branding customization' },
  { code: 'EP', name: 'Enhanced Profile', description: 'Improved profile with additional features (no competitor ads, CTA, etc.)' },
  { code: 'CPC', name: 'Cost Per Click ads', description: 'Pay-per-click advertising campaigns' },
  { code: 'RCA', name: 'Remove Competitor Ads', description: 'Removes competitor advertisements from your business page' },
  { code: 'CTA', name: 'Call To Action', description: 'Adds action buttons (e.g., call button at top of page)' },
  { code: 'SLIDESHOW', name: 'Slideshow', description: 'Image slideshow display on business page' },
  { code: 'BH', name: 'Business Highlights', description: 'Highlights key business aspects and features' },
  { code: 'VL', name: 'Verified License', description: 'Marks business as licensed (verified license badge)' },
  { code: 'LOGO', name: 'Logo Feature', description: 'Adds business logo to advertising blocks' },
  { code: 'PORTFOLIO', name: 'Portfolio Feature', description: 'Gallery showcasing work examples or services' },
];

const CreateProgram: React.FC = () => {
  const [createProgram, { isLoading }] = useCreateProgramMutation();
  const { data: businessIdsData, isLoading: isLoadingBusinesses } = useGetBusinessIdsQuery('ALL');
  
  // State for job tracking
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  // State for business selection
  const [businessSelectionMode, setBusinessSelectionMode] = useState<'existing' | 'manual'>('existing');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [manualBusinessId, setManualBusinessId] = useState('');
  
  const [formData, setFormData] = useState({
    business_id: '',
    program_name: '',
    budget: '',
    max_bid: '',
    is_autobid: false,
    start: '',
    end: '',
    promotion_code: '',
    currency: 'USD',
    pacing_method: '',
    fee_period: '',
    ad_categories: '',
  });

  // Update business_id when selection changes
  useEffect(() => {
    if (businessSelectionMode === 'existing') {
      setFormData(prev => ({ ...prev, business_id: selectedBusinessId }));
    } else {
      setFormData(prev => ({ ...prev, business_id: manualBusinessId }));
    }
  }, [businessSelectionMode, selectedBusinessId, manualBusinessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Basic parameters for all program types
      const baseParams = {
        business_id: formData.business_id,
        program_name: formData.program_name,
        start: formData.start,
        end: formData.end || undefined,
        promotion_code: formData.promotion_code || undefined,
      } as any;

      // Add CPC-specific parameters only for CPC programs
      const isCPCProgram = formData.program_name === 'CPC';
      
      const payload = isCPCProgram ? {
        ...baseParams,
        budget: parseFloat(formData.budget),
        is_autobid: formData.is_autobid,
        currency: formData.currency || undefined,
        pacing_method: formData.pacing_method || undefined,
        fee_period: formData.fee_period || undefined,
        ad_categories: formData.ad_categories ? formData.ad_categories.split(',').map(c=>c.trim()).filter(Boolean) : undefined,
        // max_bid only if not autobid
        ...(formData.is_autobid ? {} : { max_bid: parseFloat(formData.max_bid) })
      } : baseParams;

      const result = await createProgram(payload).unwrap();

      // Set active job ID to start tracking
      setActiveJobId(result.job_id);

      // Reset form
      setFormData({
        business_id: '',
        program_name: '',
        budget: '',
        max_bid: '',
        is_autobid: false,
        start: '',
        end: '',
        promotion_code: '',
        currency: 'USD',
        pacing_method: '',
        fee_period: '',
        ad_categories: '',
      });
      
      // Reset business selection
      setSelectedBusinessId('');
      setManualBusinessId('');
      setBusinessSelectionMode('existing');
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Advertising Program
          </CardTitle>
          <CardDescription>
            Fill out the form to create a new Yelp advertising program
          </CardDescription>
        </CardHeader>
        <CardContent>
        {/* Program Types Reference */}
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Program Types Reference</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead className="w-48">Name</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PROGRAM_DESCRIPTIONS.map((program) => (
                  <TableRow key={program.code}>
                    <TableCell className="font-mono font-semibold text-blue-600">
                      {program.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {program.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {program.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Selection
              </Label>
            </div>
            
            {/* Business Selection Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={businessSelectionMode === 'existing' ? 'default' : 'outline'}
                onClick={() => setBusinessSelectionMode('existing')}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Choose from existing
              </Button>
              <Button
                type="button"
                variant={businessSelectionMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setBusinessSelectionMode('manual')}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Enter manually
              </Button>
            </div>

            {/* Existing Business Dropdown */}
            {businessSelectionMode === 'existing' && (
              <div className="space-y-2">
                <Label htmlFor="existing_business">Select Business</Label>
                <Select
                  value={selectedBusinessId}
                  onValueChange={setSelectedBusinessId}
                >
                  <SelectTrigger id="existing_business">
                    <SelectValue placeholder="Choose a business..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingBusinesses ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading businesses...
                        </div>
                      </SelectItem>
                    ) : businessIdsData?.businesses?.length ? (
                      businessIdsData.businesses.map((business) => (
                        <SelectItem key={business.business_id} value={business.business_id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">{business.business_name || business.business_id}</span>
                            <span className="text-xs text-gray-500">({business.business_id.substring(0, 12)}...)</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {business.program_count} programs
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-businesses" disabled>
                        No businesses found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {businessIdsData?.businesses?.length && (
                  <p className="text-sm text-gray-600">
                    Found {businessIdsData.businesses.length} businesses with {businessIdsData.total} total programs
                  </p>
                )}
              </div>
            )}

            {/* Manual Business Input */}
            {businessSelectionMode === 'manual' && (
              <div className="space-y-2">
                <Label htmlFor="manual_business_id">Business ID</Label>
                <Input
                  id="manual_business_id"
                  value={manualBusinessId}
                  onChange={(e) => setManualBusinessId(e.target.value)}
                  placeholder="Enter encrypted business ID"
                  required
                />
                <p className="text-sm text-gray-600">
                  Enter the encrypted business ID from Yelp
                </p>
              </div>
            )}

            {/* Current Selection Display */}
            {formData.business_id && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-medium">
                  Selected Business ID: <code className="bg-blue-100 px-2 py-1 rounded">{formData.business_id}</code>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="program_name">Program Name</Label>
            <Select
              value={formData.program_name}
              onValueChange={(value) => handleChange('program_name', value)}
            >
              <SelectTrigger id="program_name">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CPC-specific fields only for CPC programs */}
          {formData.program_name === 'CPC' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-base font-semibold flex items-center gap-2">
                  💵 Budget (USD)
                </Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  min="25"
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                  placeholder="200.00"
                  required
                  className="text-lg"
                />
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Enter in DOLLARS (e.g., 200.00 for $200)
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Minimum: $25.00 | Backend automatically converts to cents for Yelp API
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="is_autobid"
                  type="checkbox"
                  checked={formData.is_autobid}
                  onChange={(e) => handleChange('is_autobid', e.target.checked)}
                />
                <Label htmlFor="is_autobid">Automatic bidding (Autobid)</Label>
              </div>

              {/* Max bid only if NOT autobid */}
              {!formData.is_autobid && (
                <div className="space-y-2">
                  <Label htmlFor="max_bid" className="text-base font-semibold flex items-center gap-2">
                    💰 Max Bid per Click (USD)
                  </Label>
                  <Input
                    id="max_bid"
                    type="number"
                    step="0.01"
                    min="0.25"
                    value={formData.max_bid}
                    onChange={(e) => handleChange('max_bid', e.target.value)}
                    placeholder="5.00"
                    required
                    className="text-lg"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 font-medium">
                      ✅ Enter in DOLLARS (e.g., 5.00 for $5 per click)
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      This is the maximum you'll pay per click | Backend converts to cents
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  placeholder="USD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pacing_method">Pacing Method</Label>
                <Select value={formData.pacing_method} onValueChange={(value) => handleChange('pacing_method', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pacing method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paced">Paced (spread budget evenly)</SelectItem>
                    <SelectItem value="unpaced">Unpaced (spend as fast as possible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee_period">Fee Period</Label>
                <Select value={formData.fee_period} onValueChange={(value) => handleChange('fee_period', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALENDAR_MONTH">Calendar Month (reset on 1st)</SelectItem>
                    <SelectItem value="ROLLING_MONTH">Rolling Month (reset every 30 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad_categories">Ad Categories (comma separated)</Label>
                <Input
                  id="ad_categories"
                  value={formData.ad_categories}
                  onChange={(e) => handleChange('ad_categories', e.target.value)}
                  placeholder="hvac, plumbing"
                />
              </div>
            </>
          )}

          {/* Info message for non-CPC programs */}
          {formData.program_name && formData.program_name !== 'CPC' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-700">
                <strong>{formData.program_name}</strong> program does not require budget and bid parameters.
                Only business_id and start/end dates.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start">Start Date</Label>
            <Input
              id="start"
              type="date"
              value={formData.start}
              onChange={(e) => handleChange('start', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End Date</Label>
            <Input
              id="end"
              type="date"
              value={formData.end}
              onChange={(e) => handleChange('end', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promotion_code">Promotion Code</Label>
            <Input
              id="promotion_code"
              value={formData.promotion_code}
              onChange={(e) => handleChange('promotion_code', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Program'
            )}
          </Button>

          {/* Job Tracker - показується внизу під кнопкою */}
          {activeJobId && (
            <JobTracker 
              jobId={activeJobId} 
              jobType="create"
              onComplete={(success) => {
                if (!success) {
                  setActiveJobId(null); // Reset on failure so user can try again
                }
                // On success, JobTracker will handle redirect
              }}
            />
          )}
        </form>
      </CardContent>
    </Card>
    </div>
  );
};

export default CreateProgram;
