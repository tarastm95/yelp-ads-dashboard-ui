import React, { useState, useEffect } from 'react';
import { useGetJobStatusQuery } from '../store/api/yelpApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Loader2, X } from 'lucide-react';

interface InlineTaskMonitorProps {
  jobId: string;
  onClose: () => void;
  taskType: 'terminate' | 'pause' | 'resume';
}

const InlineTaskMonitor: React.FC<InlineTaskMonitorProps> = ({ jobId, onClose, taskType }) => {
  const [shouldStop, setShouldStop] = useState(false);
  
  const { data: jobStatus, isLoading, error } = useGetJobStatusQuery(
    jobId,
    { 
      skip: shouldStop,
      pollingInterval: 3000, // Poll every 3 seconds
    }
  );

  // Auto-close after completion
  useEffect(() => {
    if (jobStatus?.status === 'COMPLETED') {
      setTimeout(() => {
        onClose();
      }, 5000); // Close after 5 seconds
    }
  }, [jobStatus?.status, onClose]);

  const getStatusIcon = (status: string | undefined | null) => {
    switch (status) {
      case 'PENDING':
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return <Clock className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = (status: string | undefined | null) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500';
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'FAILED':
      case 'REJECTED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTaskLabel = () => {
    switch (taskType) {
      case 'terminate':
        return 'Terminating Program';
      case 'pause':
        return 'Pausing Program';
      case 'resume':
        return 'Resuming Program';
      default:
        return 'Processing';
    }
  };

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-700">Task Failed</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-red-600">Failed to get task status</p>
        <p className="text-xs text-gray-600 mt-1">Job ID: <code>{jobId}</code></p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="font-semibold text-blue-900">{getTaskLabel()}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(jobStatus?.status)} text-white`}>
            <span className="flex items-center gap-1">
              {getStatusIcon(jobStatus?.status)}
              {jobStatus?.status?.toUpperCase() || 'CHECKING...'}
            </span>
          </Badge>
          <span className="text-sm text-gray-600">
            {jobStatus?.status === 'COMPLETED' 
              ? '✓ Task completed successfully' 
              : jobStatus?.status === 'FAILED'
              ? '✗ Task failed'
              : '⏳ Processing... (refreshing every 3s)'}
          </span>
        </div>

        {/* Job ID */}
        <div className="text-xs text-gray-600">
          <span className="font-medium">Job ID:</span>{' '}
          <code className="bg-white px-2 py-1 rounded border">{jobId}</code>
        </div>

        {/* Success Message */}
        {jobStatus?.status === 'COMPLETED' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium text-sm">Success!</span>
            </div>
            <p className="text-xs text-green-600">
              {taskType === 'terminate' && 'Program has been terminated successfully.'}
              {taskType === 'pause' && 'Program has been paused successfully.'}
              {taskType === 'resume' && 'Program has been resumed successfully.'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This message will disappear in a few seconds...
            </p>
            {jobStatus.business_results && (
              <details className="mt-2">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                  View Details
                </summary>
                <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                  {JSON.stringify(jobStatus.business_results, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Error Message */}
        {jobStatus?.status === 'FAILED' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <XCircle className="h-4 w-4" />
              <span className="font-medium text-sm">Task Failed</span>
            </div>
            <p className="text-xs text-red-600">
              {jobStatus.message || 'An error occurred while processing the task.'}
            </p>
            {jobStatus.business_results && (
              <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                {JSON.stringify(jobStatus.business_results, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Processing Animation */}
        {(jobStatus?.status === 'PENDING' || jobStatus?.status === 'IN_PROGRESS' || jobStatus?.status === 'PROCESSING') && (
          <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <div className="flex-1">
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineTaskMonitor;

