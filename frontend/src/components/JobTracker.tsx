import React, { useEffect, useState } from 'react';
import { useGetJobStatusQuery } from '../store/api/yelpApi';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface JobTrackerProps {
  jobId: string;
  jobType: 'create' | 'edit' | 'duplicate' | 'terminate';
  programId?: string; // Program ID for reference
  onComplete?: (success: boolean, programId?: string) => void;
}

const JobTracker: React.FC<JobTrackerProps> = ({ 
  jobId, 
  jobType, 
  programId,
  onComplete 
}) => {
  const [pollingInterval, setPollingInterval] = useState(2000); // Poll every 2 seconds
  const [hasCompleted, setHasCompleted] = useState(false);

  const { data: jobStatus, isLoading, isError } = useGetJobStatusQuery(jobId, {
    pollingInterval: hasCompleted ? 0 : pollingInterval, // Stop polling after completion
    skip: !jobId,
  });

  const status = jobStatus?.status;

  useEffect(() => {
    if (status === 'COMPLETED' || status === 'FAILED') {
      if (!hasCompleted) {
        setHasCompleted(true);
        setPollingInterval(0); // Stop polling

        // Get program_id from business_results if available
        const createdProgramId = jobStatus?.business_results?.[0]?.program_id;
        
        // Just call onComplete callback, no automatic redirect
        onComplete?.(status === 'COMPLETED', createdProgramId || programId);
      }
    }
  }, [status, hasCompleted, jobStatus, jobType, programId, onComplete]);

  const getStatusIcon = () => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-8 w-8 text-red-500" />;
      case 'IN_PROGRESS':
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      default:
        return <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'COMPLETED':
        return jobType === 'create' ? 'Program created successfully!' : 'Program updated successfully!';
      case 'FAILED':
        return `Failed to ${jobType} program. Please try again.`;
      case 'IN_PROGRESS':
        return `${jobType === 'create' ? 'Creating' : 'Updating'} program...`;
      case 'PENDING':
        return 'Job is pending...';
      default:
        return 'Checking job status...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200';
      case 'FAILED':
        return 'bg-red-50 border-red-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 border-blue-200';
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">
                Error checking job status
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Job ID: {jobId}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${getStatusColor()} transition-all duration-300`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {getStatusText()}
            </h3>
            
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Job ID:</span> {jobId}
              </p>
              
              {status && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Status:</span>{' '}
                  <span className={`font-semibold ${
                    status === 'COMPLETED' ? 'text-green-600' :
                    status === 'FAILED' ? 'text-red-600' :
                    status === 'IN_PROGRESS' ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}>
                    {status}
                  </span>
                </p>
              )}

              {status === 'COMPLETED' && jobStatus?.business_results?.[0]?.program_id && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Program ID:</span>{' '}
                  <span className="font-mono text-xs">
                    {jobStatus.business_results[0].program_id}
                  </span>
                </p>
              )}

              {jobStatus?.created_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Created: {new Date(jobStatus.created_at).toLocaleString()}
                </p>
              )}

              {jobStatus?.completed_at && (
                <p className="text-xs text-gray-500">
                  Completed: {new Date(jobStatus.completed_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar for in-progress jobs */}
        {(status === 'PENDING' || status === 'IN_PROGRESS') && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 animate-pulse rounded-full"
                style={{ 
                  width: status === 'PENDING' ? '30%' : '70%',
                  transition: 'width 0.5s ease-in-out'
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {status === 'PENDING' ? 'Waiting in queue...' : 'Processing your request...'}
            </p>
          </div>
        )}

        {/* Error details for failed jobs */}
        {status === 'FAILED' && jobStatus?.business_results?.[0] && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
            <p className="text-sm text-red-800 font-medium">Error Details:</p>
            <p className="text-xs text-red-700 mt-1">
              {JSON.stringify(jobStatus.business_results[0], null, 2)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobTracker;

