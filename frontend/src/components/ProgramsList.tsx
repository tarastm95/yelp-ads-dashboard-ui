import React from 'react';
import { useGetProgramsQuery } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ProgramsList: React.FC = () => {
  const { data: programs, isLoading, error } = useGetProgramsQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <p className="text-red-500">Ошибка загрузки программ</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Рекламные программы</h2>
        <Button onClick={() => navigate('/create')}>Создать программу</Button>
      </div>

      {programs?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Нет активных программ. Создайте первую программу.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {programs?.map((program) => (
            <Card key={program.program_id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {program.product_type} (ID: {program.program_id})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Статус: {program.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  Бюджет: ${program.budget_amount || 'N/A'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramsList;
