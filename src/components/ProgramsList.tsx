
import React from 'react';
import { useGetProgramsQuery, useTerminateProgramMutation } from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProgramsList: React.FC = () => {
  const { data: programs, isLoading, error } = useGetProgramsQuery();
  const [terminateProgram] = useTerminateProgramMutation();
  const navigate = useNavigate();

  const handleTerminate = async (programId: string) => {
    try {
      const result = await terminateProgram(programId).unwrap();
      toast({
        title: "Программа завершается",
        description: `Job ID: ${result.job_id}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка завершения программы",
        description: "Попробуйте еще раз",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'terminated':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

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
        <Button onClick={() => navigate('/create')}>
          Создать программу
        </Button>
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
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {program.product_type}
                    </CardTitle>
                    <CardDescription>
                      ID: {program.program_id}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(program.status)}>
                    {program.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Business ID</p>
                    <p className="font-mono text-sm">{program.business_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Бюджет</p>
                    <p className="font-medium">${program.budget_amount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Создано</p>
                    <p className="text-sm">{new Date(program.created_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Изменено</p>
                    <p className="text-sm">{new Date(program.modified_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/program/${program.program_id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Просмотр
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/edit/${program.program_id}`)}
                    disabled={program.status === 'terminated'}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Редактировать
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleTerminate(program.program_id)}
                    disabled={program.status === 'terminated'}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Завершить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramsList;
