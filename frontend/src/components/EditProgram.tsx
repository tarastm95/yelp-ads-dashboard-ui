import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditProgramMutation, useGetProgramInfoQuery } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatErrorForToast } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const EditProgram: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [editProgram, { isLoading }] = useEditProgramMutation();
  const { data: program } = useGetProgramInfoQuery(programId || '', { skip: !programId });

  const [budget, setBudget] = useState('');
  const [maxBid, setMaxBid] = useState('');
  const [categories, setCategories] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pacingMethod, setPacingMethod] = useState('');

  useEffect(() => {
    if (program) {
      if (program.budget_amount !== undefined && program.budget_amount !== null) {
        setBudget(String(program.budget_amount));
      }
      if (program.max_bid !== undefined && program.max_bid !== null) {
        setMaxBid(String(program.max_bid));
      }
      if (program.targeting?.categories) {
        setCategories(program.targeting.categories.join(', '));
      }
      if (program.start_date) {
        setStartDate(program.start_date);
      }
      if (program.end_date) {
        setEndDate(program.end_date);
      }
      if (program.pacing_method) {
        setPacingMethod(program.pacing_method);
      }
    }
  }, [program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !program.partner_program_id) return;
    try {
      const editData: any = {};
      
      if (budget) editData.budget = parseFloat(budget);
      if (maxBid) editData.max_bid = parseFloat(maxBid);
      if (categories) editData.ad_categories = categories.split(',').map((c) => c.trim()).filter(Boolean);
      if (startDate) editData.start = startDate;
      if (endDate) editData.end = endDate;
      if (pacingMethod) editData.pacing_method = pacingMethod;
      
      const result = await editProgram({
        partner_program_id: program.partner_program_id,
        data: editData,
      }).unwrap();

      toast({
        title: 'Program updating',
        description: `Job ID: ${result.job_id}`,
      });

      navigate('/programs');
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Edit Program</CardTitle>
        <CardDescription>Modify advertising program parameters</CardDescription>
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
          <div className="space-y-2">
            <Label htmlFor="maxBid" className="text-base font-semibold flex items-center gap-2">
              💰 Max Bid per Click (USD)
            </Label>
            <Input
              id="maxBid"
              type="number"
              step="0.01"
              min="0.25"
              value={maxBid}
              onChange={(e) => setMaxBid(e.target.value)}
              placeholder="5.00"
              className="text-lg"
            />
            <p className="text-xs text-gray-500">
              Leave empty to keep current max bid (only for manual bidding programs)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-medium">
              ℹ️ Leave fields empty to keep current values
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Only changed fields will be updated in Yelp
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
        </form>
      </CardContent>
    </Card>
  );
};

export default EditProgram;
