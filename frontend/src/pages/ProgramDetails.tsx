import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProgramInfoQuery } from '../store/api/yelpApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const ProgramDetails: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const {
    data: program,
    isLoading,
    error,
  } = useGetProgramInfoQuery(programId || '', { skip: !programId });

  if (!programId) {
    return <p className="text-red-500">Program ID не указан</p>;
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
          <p className="text-red-500">Ошибка загрузки данных программы</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="outline" onClick={() => navigate(-1)}>
        Назад
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
            <p className="text-sm text-muted-foreground">Статус</p>
            <p className="font-medium">{program.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Бюджет</p>
            <p className="font-medium">${program.budget_amount ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Создано</p>
            <p className="text-sm">{new Date(program.created_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Изменено</p>
            <p className="text-sm">{new Date(program.modified_date).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramDetails;
