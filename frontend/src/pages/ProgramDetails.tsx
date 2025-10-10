import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetPartnerProgramInfoQuery, usePauseProgramMutation, useResumeProgramMutation } from '../store/api/yelpApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, FolderOpen, Camera, BarChart3 } from 'lucide-react';

const ProgramDetails: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [pauseProgram] = usePauseProgramMutation();
  const [resumeProgram] = useResumeProgramMutation();

  const {
    data: programData,
    isLoading,
    error,
  } = useGetPartnerProgramInfoQuery(programId || '', { skip: !programId });
  
  const program = programData?.programs?.[0];

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

  if (error || !program) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <p className="text-red-500">Error loading program data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="outline" onClick={() => navigate(-1)}>
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{program.product_type}</CardTitle>
          <CardDescription>ID: {program.program_id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Business ID</p>
            <p className="font-mono text-sm">{program.business_id || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{program.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="font-medium">${program.budget_amount ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm">{new Date(program.created_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Modified</p>
            <p className="text-sm">{new Date(program.modified_date).toLocaleDateString()}</p>
          </div>
          <div className="space-y-4 pt-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/program-features/${program.program_id}`)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Program features
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate(`/portfolio/${program.program_id}`)}
                className="flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Portfolio
              </Button>
            </div>
            
            {/* Program Controls */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => pauseProgram(program.program_id)}>
                Pause
              </Button>
              <Button variant="outline" onClick={() => resumeProgram(program.program_id)}>
                Resume
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramDetails;
