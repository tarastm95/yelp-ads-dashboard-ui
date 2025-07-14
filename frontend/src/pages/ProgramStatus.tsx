import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetJobStatusQuery } from '../store/api/yelpApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const ProgramStatus: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetJobStatusQuery(programId || '', {
    skip: !programId,
  });

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

  if (error || !data) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Назад
        </Button>
        <p className="text-red-500">Ошибка загрузки статуса программы</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="outline" onClick={() => navigate(-1)}>
        Назад
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Статус программы</CardTitle>
          <CardDescription>ID: {programId}</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramStatus;
