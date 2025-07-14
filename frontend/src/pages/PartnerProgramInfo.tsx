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
    return <p className="text-red-500">Program ID не указан</p>;
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
          Назад
        </Button>
        <p className="text-red-500">Ошибка загрузки данных программы</p>
      </div>
    );
  }

  const program = data.programs[0];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="outline" onClick={() => navigate(-1)}>
        Назад
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
            <p className="text-sm text-muted-foreground">Статус</p>
            <p className="font-medium">{program.program_status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Пауза</p>
            <p className="font-medium">{program.program_pause_status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Начало</p>
            <p className="font-medium">{program.start_date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Конец</p>
            <p className="font-medium">{program.end_date}</p>
          </div>
          {program.program_metrics && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Бюджет</p>
              <p className="font-medium">{program.program_metrics.budget}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerProgramInfo;
