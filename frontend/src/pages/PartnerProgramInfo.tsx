import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetPartnerProgramInfoQuery } from '../store/api/yelpApi';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const PartnerProgramInfo: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetPartnerProgramInfoQuery(programId || '', {
    skip: !programId,
  });

  if (!programId) {
    return <p className="text-red-500">Program ID not specified</p>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data || data.programs.length === 0) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <p className="text-red-500">Error loading program data</p>
      </div>
    );
  }

  const program = data.programs[0];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="outline" onClick={() => navigate(-1)}>
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{program.program_type}</CardTitle>
          <CardDescription>ID: {program.program_id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Business ID</p>
            <p className="font-mono text-sm">{program.yelp_business_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{program.program_status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pause</p>
            <p className="font-medium">{program.program_pause_status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Start</p>
            <p className="font-medium">{program.start_date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">End</p>
            <p className="font-medium">{program.end_date}</p>
          </div>
          {program.program_metrics && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="font-medium">
                ${(Number(program.program_metrics.budget) / 100).toFixed(2)} {program.program_metrics.currency}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerProgramInfo;
