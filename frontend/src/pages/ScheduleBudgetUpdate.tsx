import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetPartnerProgramInfoQuery, useScheduleBudgetUpdateMutation } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar } from 'lucide-react';

const ScheduleBudgetUpdate: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { data: programData, isLoading: isLoadingProgram } = useGetPartnerProgramInfoQuery(programId || '', { skip: !programId });
  const [scheduleBudgetUpdate, { isLoading: isScheduling }] = useScheduleBudgetUpdateMutation();
  
  const program = programData?.programs?.[0];

  const [budget, setBudget] = useState('');
  const [isAutobid, setIsAutobid] = useState(true);
  const [maxBid, setMaxBid] = useState('');
  const [pacingMethod, setPacingMethod] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');

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
      if (!program.program_metrics?.is_autobid && program.program_metrics?.max_bid !== undefined && program.program_metrics?.max_bid !== null) {
        const maxBidInDollars = Number(program.program_metrics.max_bid) / 100;
        setMaxBid(maxBidInDollars.toFixed(2));
      }
      
      // Pacing method
      if (program.program_metrics?.pacing_method) {
        setPacingMethod(program.program_metrics.pacing_method);
      }
    }
  }, [program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!programId) {
      toast({
        title: 'Error',
        description: 'Program ID not found',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    if (!scheduleDateTime) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date and time',
        variant: 'destructive',
      });
      return;
    }

    const selectedDate = new Date(scheduleDateTime);
    const now = new Date();
    
    if (selectedDate <= now) {
      toast({
        title: 'Validation Error',
        description: 'Scheduled time must be in the future',
        variant: 'destructive',
      });
      return;
    }

    if (!isAutobid && !maxBid) {
      toast({
        title: 'Max Bid Required',
        description: 'Please enter a max bid per click for manual bidding, or switch to auto-bidding.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updateData: any = {};
      
      if (budget) updateData.new_budget = parseFloat(budget);
      updateData.is_autobid = isAutobid;
      
      if (!isAutobid && maxBid) {
        updateData.max_bid = parseFloat(maxBid);
      }
      
      if (pacingMethod) {
        updateData.pacing_method = pacingMethod;
      }

      const isoDateTime = new Date(scheduleDateTime).toISOString();
      
      const result = await scheduleBudgetUpdate({
        program_id: programId,
        ...updateData,
        scheduled_datetime: isoDateTime,
      }).unwrap();

      toast({
        title: 'Update Scheduled',
        description: result.message || `Update scheduled for ${scheduleDateTime}`,
      });

      navigate('/scheduled-budget-updates');
    } catch (error: any) {
      toast({
        title: 'Schedule Failed',
        description: error.data?.error || error.message || 'Failed to schedule update',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingProgram) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading program...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Budget Update
          </CardTitle>
          <CardDescription>
            Schedule future updates to budget, bidding strategy, and pacing for program: {program?.program_id || programId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Budget */}
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

            {/* Bidding Strategy */}
            <div className="space-y-3 border-t border-b py-4">
              <Label className="text-base font-semibold">⚡ Bidding Strategy</Label>
              
              <div className="space-y-3">
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
                      setMaxBid('');
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

              {/* Max Bid Input */}
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

            {/* Pacing Method */}
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

            {/* Schedule DateTime */}
            <div className="space-y-2 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <Label htmlFor="datetime" className="text-base font-semibold">📅 Schedule Date & Time</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
                className="text-lg"
              />
              <p className="text-xs text-purple-700 mt-2">
                Select a date and time in the future when these changes should be automatically applied to the program
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-semibold mb-2">
                📝 Scheduled Changes
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                {budget && <li>✅ <strong>Budget</strong>: ${budget}</li>}
                {isAutobid && <li>✅ <strong>Bidding Strategy</strong>: Automatic Bidding</li>}
                {!isAutobid && maxBid && <li>✅ <strong>Bidding Strategy</strong>: Manual Bidding (Max Bid: ${maxBid})</li>}
                {pacingMethod && <li>✅ <strong>Pacing Method</strong>: {pacingMethod === 'paced' ? 'Paced' : 'Unpaced'}</li>}
                {scheduleDateTime && <li>✅ <strong>Scheduled for</strong>: {new Date(scheduleDateTime).toLocaleString()}</li>}
                {!budget && !pacingMethod && isAutobid && <li className="text-gray-600">No changes selected</li>}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isScheduling} className="flex-1 bg-purple-600 hover:bg-purple-700">
                {isScheduling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Update'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleBudgetUpdate;

