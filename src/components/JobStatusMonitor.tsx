
import React, { useState, useEffect } from 'react';
import { useGetJobStatusQuery } from '../store/api/yelpApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const JobStatusMonitor: React.FC = () => {
  const [jobId, setJobId] = useState('');
  const [shouldPoll, setShouldPoll] = useState(false);

  const { data: jobStatus, isLoading, error } = useGetJobStatusQuery(
    jobId,
    { 
      skip: !jobId || !shouldPoll,
      pollingInterval: 5000, // Опрос каждые 5 секунд
    }
  );

  const handleStartMonitoring = () => {
    if (jobId.trim()) {
      setShouldPoll(true);
    }
  };

  const handleStopMonitoring = () => {
    setShouldPoll(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Мониторинг статуса задач
          </CardTitle>
          <CardDescription>
            Отслеживайте выполнение операций Yelp API в реальном времени
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="job_id">Job ID</Label>
              <Input
                id="job_id"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Введите Job ID для мониторинга"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleStartMonitoring} 
                disabled={!jobId.trim() || shouldPoll}
              >
                Начать мониторинг
              </Button>
              <Button 
                variant="outline"
                onClick={handleStopMonitoring} 
                disabled={!shouldPoll}
              >
                Остановить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {shouldPoll && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Статус задачи: {jobId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobStatus ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(jobStatus.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(jobStatus.status)}
                      {jobStatus.status.toUpperCase()}
                    </span>
                  </Badge>
                </div>

                {jobStatus.status === 'completed' && jobStatus.result && (
                  <div>
                    <h4 className="font-semibold mb-2">Результат:</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(jobStatus.result, null, 2)}
                    </pre>
                  </div>
                )}

                {jobStatus.status === 'failed' && jobStatus.error_message && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Ошибка:</h4>
                    <p className="text-red-600 bg-red-50 p-3 rounded">
                      {jobStatus.error_message}
                    </p>
                  </div>
                )}

                {jobStatus.status === 'pending' && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Задача выполняется... Обновление каждые 5 секунд</span>
                  </div>
                )}
              </div>
            ) : error ? (
              <p className="text-red-500">Ошибка получения статуса задачи</p>
            ) : (
              <p className="text-muted-foreground">Загрузка статуса...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobStatusMonitor;
