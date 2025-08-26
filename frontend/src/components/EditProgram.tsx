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
  const [categories, setCategories] = useState('');

  useEffect(() => {
    if (program) {
      if (program.budget_amount !== undefined && program.budget_amount !== null) {
        setBudget(String(program.budget_amount));
      }
      if (program.targeting?.categories) {
        setCategories(program.targeting.categories.join(', '));
      }
    }
  }, [program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !program.partner_program_id) return;
    try {
      const result = await editProgram({
        partner_program_id: program.partner_program_id,
        data: {
          budget_amount: budget ? parseFloat(budget) : undefined,
          targeting: categories
            ? { categories: categories.split(',').map((c) => c.trim()).filter(Boolean) }
            : undefined,
        },
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
            <Label htmlFor="budget">Budget (USD)</Label>
            <Input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categories">Categories</Label>
            <Input
              id="categories"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="cat1, cat2"
            />
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
