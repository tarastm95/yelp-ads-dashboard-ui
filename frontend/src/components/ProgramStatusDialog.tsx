import React, { useState, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useLazyGetJobStatusQuery } from '../store/api/yelpApi';

interface ProgramStatusDialogProps {
  jobId: string;
}

const ProgramStatusDialog: React.FC<ProgramStatusDialogProps> = ({ jobId }) => {
  const [open, setOpen] = useState(false);
  const [triggerFetch, { data, isLoading, error }] = useLazyGetJobStatusQuery();

  useEffect(() => {
    if (open) {
      triggerFetch(jobId);
    }
  }, [open, jobId, triggerFetch]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'IN_PROGRESS':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-1" /> Статус
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Статус задачи: {jobId}</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Загрузка...</span>
          </div>
        )}
        {error && <p className="text-red-500">Ошибка загрузки статуса</p>}
        {data && (
          <div className="space-y-4">
            <Badge className={getStatusColor(data.status)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(data.status)}
                {data.status}
              </span>
            </Badge>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProgramStatusDialog;
