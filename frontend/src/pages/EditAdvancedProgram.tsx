import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditProgramMutation, useGetPartnerProgramInfoQuery } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const EditAdvancedProgram: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [editProgram, { isLoading }] = useEditProgramMutation();
  const { data: programData } = useGetPartnerProgramInfoQuery(programId || '', { skip: !programId });
  const program = programData?.programs?.[0];
  const [programIdInput, setProgramIdInput] = useState('');

  const [form, setForm] = useState({
    start: '',
    end: '',
    budget: '',
    future_budget_date: '',
    max_bid: '',
    pacing_method: 'paced',
    ad_categories: ''
  });

  useEffect(() => {
    if (program) {
      if (program.start_date) setForm(f => ({ ...f, start: program.start_date }));
      if (program.end_date) setForm(f => ({ ...f, end: program.end_date }));
      if (program.budget_amount !== undefined && program.budget_amount !== null) {
        setForm(f => ({ ...f, budget: String(program.budget_amount) }));
      }
      if (program.targeting?.categories) {
        setForm(f => ({ ...f, ad_categories: program.targeting.categories.join(', ') }));
      }
    }
  }, [program]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !program.partner_program_id) return;
    try {
      const result = await editProgram({
        partner_program_id: program.partner_program_id,
        data: {
          start: form.start || undefined,
          end: form.end || undefined,
          budget: form.budget ? parseInt(form.budget, 10) : undefined,
          future_budget_date: form.future_budget_date || undefined,
          max_bid: form.max_bid ? parseInt(form.max_bid, 10) : undefined,
          pacing_method: form.pacing_method || undefined,
          ad_categories: form.ad_categories
            ? form.ad_categories.split(',').map(c => c.trim()).filter(Boolean)
            : undefined,
        },
      }).unwrap();

      toast({
        title: 'Program updating',
        description: `Job ID: ${result.job_id}`,
      });

      navigate('/programs');
    } catch (error) {
      toast({
        title: 'Program edit error',
        description: 'Check the entered data',
        variant: 'destructive',
      });
    }
  };

  if (!programId) {
    const handleProgramIdSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (programIdInput) {
        navigate(`/edit-advanced/${programIdInput}`);
      }
    };

    return (
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader>
          <CardTitle>Enter Program ID</CardTitle>
          <CardDescription>
            Enter the program ID to edit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProgramIdSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="program_id">Program ID</Label>
              <Input
                id="program_id"
                value={programIdInput}
                onChange={(e) => setProgramIdInput(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Load
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Advanced editing</CardTitle>
        <CardDescription>Modify CPC program parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start">Start Date</Label>
            <Input id="start" type="date" value={form.start}
              onChange={e => handleChange('start', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End Date</Label>
            <Input id="end" type="date" value={form.end}
              onChange={e => handleChange('end', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Monthly Budget (cents)</Label>
            <Input id="budget" type="number" value={form.budget}
              onChange={e => handleChange('budget', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="future_budget_date">Future Budget Start</Label>
            <Input id="future_budget_date" type="date" value={form.future_budget_date}
              onChange={e => handleChange('future_budget_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_bid">Max Bid (cents)</Label>
            <Input id="max_bid" type="number" value={form.max_bid}
              onChange={e => handleChange('max_bid', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pacing_method">Pacing Method</Label>
            <select id="pacing_method" className="w-full border rounded p-2" value={form.pacing_method}
              onChange={e => handleChange('pacing_method', e.target.value)}>
              <option value="paced">paced</option>
              <option value="unpaced">unpaced</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ad_categories">Ad Categories</Label>
            <Input id="ad_categories" value={form.ad_categories}
              onChange={e => handleChange('ad_categories', e.target.value)} placeholder="cat1, cat2" />
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

export default EditAdvancedProgram;
