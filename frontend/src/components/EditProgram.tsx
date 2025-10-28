import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditProgramMutation, useGetPartnerProgramInfoQuery } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatErrorForToast } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import JobTracker from './JobTracker';

const EditProgram: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [editProgram, { isLoading }] = useEditProgramMutation();
  // Use Yelp API (not local DB) for fresh data
  const { data: programData } = useGetPartnerProgramInfoQuery(programId || '', { skip: !programId });
  
  // Extract first program from Yelp API response
  const program = programData?.programs?.[0];

  // State for job tracking
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [budget, setBudget] = useState('');
  const [maxBid, setMaxBid] = useState('');
  const [categories, setCategories] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pacingMethod, setPacingMethod] = useState('');
  const [isAutobid, setIsAutobid] = useState(true);

  useEffect(() => {
    if (program) {
      // Budget from Yelp API (in cents) - convert to dollars
      if (program.program_metrics?.budget !== undefined && program.program_metrics?.budget !== null) {
        const budgetInDollars = Number(program.program_metrics.budget) / 100;
        setBudget(budgetInDollars.toFixed(2));
      }
      
      // Autobid status
      setIsAutobid(program.program_metrics?.is_autobid ?? true);
      
      // Max bid from Yelp API (in cents) - convert to dollars
      // Only show if manual bidding
      if (!program.program_metrics?.is_autobid && program.program_metrics?.max_bid !== undefined && program.program_metrics?.max_bid !== null) {
        const maxBidInDollars = Number(program.program_metrics.max_bid) / 100;
        setMaxBid(maxBidInDollars.toFixed(2));
      }
      
      // Dates
      if (program.start_date) {
        setStartDate(program.start_date);
      }
      if (program.end_date) {
        setEndDate(program.end_date);
      }
      
      // Pacing method
      if (program.program_metrics?.pacing_method) {
        setPacingMethod(program.program_metrics.pacing_method);
      }
      // Categories - Yelp doesn't return this in program_metrics
      // Leave empty for now
    }
  }, [program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Yelp API returns program_id (not partner_program_id)
    const actualProgramId = program?.program_id || programId;
    if (!program || !actualProgramId) {
      console.error('No program or program_id available');
      return;
    }
    
    // Validation: max_bid required for manual bidding
    if (!isAutobid && !maxBid) {
      toast({
        title: 'Max Bid Required',
        description: 'Please enter a max bid per click for manual bidding, or switch to auto-bidding.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const editData: any = {};
      
      if (budget) editData.budget = parseFloat(budget);
      
      // Always send is_autobid to be explicit
      editData.is_autobid = isAutobid;
      
      // Only send max_bid if manual bidding
      if (!isAutobid && maxBid) {
        editData.max_bid = parseFloat(maxBid);
      }
      
      if (categories) editData.ad_categories = categories.split(',').map((c) => c.trim()).filter(Boolean);
      
      // Start date is ONLY editable for INACTIVE programs
      console.log('🔍 Edit Debug - Program Status:', program.program_status);
      console.log('🔍 Edit Debug - Start Date:', startDate);
      console.log('🔍 Edit Debug - Is INACTIVE?', program.program_status === 'INACTIVE');
      
      if (startDate && program.program_status === 'INACTIVE') {
        editData.start = startDate;
        console.log('✅ Start date added to payload:', startDate);
      } else {
        console.log('⚠️ Start date NOT added. Reason:', 
          !startDate ? 'startDate is empty' : `program_status is ${program.program_status}`);
      }
      
      if (endDate) editData.end = endDate;
      if (pacingMethod) editData.pacing_method = pacingMethod;
      
      console.log('📤 Submitting edit with program_id:', actualProgramId);
      console.log('📤 Full payload:', JSON.stringify(editData, null, 2));
      
      const result = await editProgram({
        partner_program_id: actualProgramId,  // Use program_id from Yelp API
        data: editData,
      }).unwrap();

      // Set active job ID to start tracking
      setActiveJobId(result.job_id);
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title,
        description,
        variant: 'destructive',
      });
    }
  };

  if (!programId) {
    return <p className="text-red-500">Program ID not provided</p>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Edit Program
          {program?.program_status && (
            <span className={`text-sm px-2 py-1 rounded ${
              program.program_status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              program.program_status === 'INACTIVE' ? 'bg-blue-100 text-blue-700' :
              program.program_status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {program.program_status}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Modify advertising program parameters
          {program?.program_id && (
            <span className="block text-xs text-gray-500 mt-1">
              ID: {program.program_id}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget" className="text-base font-semibold flex items-center gap-2">
              💵 Budget (USD)
            </Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="25"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="200.00"
              className="text-lg"
            />
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium">
                ✅ Enter in DOLLARS (e.g., 200.00 for $200)
              </p>
              <p className="text-xs text-green-700 mt-1">
                Minimum: $25.00 | System automatically handles conversion
              </p>
            </div>
          </div>
          
          {/* Bidding Strategy Selection */}
          <div className="space-y-3 border-t border-b py-4">
            <Label className="text-base font-semibold">⚡ Bidding Strategy</Label>
            
            <div className="space-y-2">
              <label 
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isAutobid 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="bidding"
                  checked={isAutobid}
                  onChange={() => {
                    setIsAutobid(true);
                    setMaxBid(''); // Clear max_bid when switching to autobid
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">🤖 Automatic Bidding (Recommended)</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Yelp automatically optimizes your bids to get the most clicks within your budget
                  </p>
                </div>
              </label>
              
              <label 
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  !isAutobid 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="bidding"
                  checked={!isAutobid}
                  onChange={() => setIsAutobid(false)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">🎯 Manual Bidding (Advanced)</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Set a maximum price you're willing to pay per click. Gives you more control.
                  </p>
                </div>
              </label>
            </div>

            {/* Max Bid Input - только для manual bidding */}
            {!isAutobid && (
              <div className="ml-8 space-y-2 mt-3">
                <Label htmlFor="maxBid" className="text-base font-semibold flex items-center gap-2">
                  💰 Max Bid per Click (USD)
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="maxBid"
                  type="number"
                  step="0.01"
                  min="0.25"
                  value={maxBid}
                  onChange={(e) => setMaxBid(e.target.value)}
                  placeholder="5.00"
                  required={!isAutobid}
                  className="text-lg"
                />
                <p className="text-xs text-gray-600">
                  You'll never pay more than this amount per click. Minimum: $0.25
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                Start Date
                {program?.program_status === 'ACTIVE' && (
                  <span className="text-xs text-gray-500">(read-only)</span>
                )}
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={program?.program_status === 'ACTIVE'}
                className={program?.program_status === 'ACTIVE' ? 'bg-gray-100 cursor-not-allowed' : ''}
              />
              {program?.program_status === 'ACTIVE' ? (
                <p className="text-xs text-amber-600">
                  ⚠️ Start date cannot be changed for ACTIVE programs
                </p>
              ) : (
                <p className="text-xs text-green-600">
                  ✅ Can be updated for INACTIVE programs
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                ✅ Can be updated
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pacingMethod">Pacing Method</Label>
            <select 
              id="pacingMethod"
              value={pacingMethod}
              onChange={(e) => setPacingMethod(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Keep current</option>
              <option value="paced">Paced (spread budget evenly)</option>
              <option value="unpaced">Unpaced (spend as fast as possible)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categories">Ad Categories (comma-separated)</Label>
            <Input
              id="categories"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="category1, category2, category3"
            />
            <p className="text-xs text-gray-500">
              Leave empty to keep current categories, or enter comma-separated list
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-semibold mb-2">
              📝 Editable Fields (via Yelp API)
            </p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>✅ <strong>Budget</strong> - increase or decrease campaign budget</li>
              <li>✅ <strong>Bidding Strategy</strong> - switch between auto and manual bidding</li>
              <li>✅ <strong>Max Bid</strong> - set maximum bid per click (manual bidding only)</li>
              {program?.program_status === 'INACTIVE' ? (
                <li>✅ <strong>Start Date</strong> - can be changed for INACTIVE programs</li>
              ) : (
                <li>❌ <strong>Start Date</strong> - cannot be changed for ACTIVE programs</li>
              )}
              <li>✅ <strong>End Date</strong> - extend or shorten campaign duration</li>
              <li>✅ <strong>Pacing Method</strong> - paced or unpaced budget spending</li>
              <li>✅ <strong>Categories</strong> - update targeting categories</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2 pt-2 border-t border-blue-200">
              💡 Leave fields empty to keep current values. Only changed fields will be sent to Yelp.
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>

          {/* Job Tracker - показується внизу під кнопкою */}
          {activeJobId && (
            <JobTracker 
              jobId={activeJobId} 
              jobType="edit"
              programId={program?.program_id}
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

export default EditProgram;
