
import React, { useState, useEffect } from 'react';
import { useGetJobStatusQuery, useGetActiveJobsQuery } from '../store/api/yelpApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Program } from '../types/yelp';

const JobStatusMonitor: React.FC = () => {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState('');
  const [shouldPoll, setShouldPoll] = useState(false);

  // Get all active jobs with auto-polling every 10 seconds
  const { data: activeJobsData, isLoading: isLoadingActiveJobs, refetch } = useGetActiveJobsQuery(undefined, {
    pollingInterval: 10000, // Auto-refresh every 10 seconds
  });

  const { data: jobStatus, isLoading, error } = useGetJobStatusQuery(
    jobId,
    { 
      skip: !jobId || !shouldPoll,
      pollingInterval: 5000, // Poll every 5 seconds
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

  const getStatusIcon = (status: string | undefined | null) => {
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

  const getStatusColor = (status: string | undefined | null) => {
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

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const activeJobs = activeJobsData?.jobs || [];

  return (
    <div className="space-y-6">
      {/* Active Jobs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Active Jobs ({activeJobs.length})
              </CardTitle>
              <CardDescription>
                Programs currently being created or processed
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoadingActiveJobs}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingActiveJobs ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingActiveJobs && activeJobs.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading active jobs...
            </div>
          ) : activeJobs.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No active jobs</p>
              <p className="text-sm">All programs have completed processing</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-500 mb-4">
                Auto-refreshing every 10 seconds...
              </div>
              
              {activeJobs.map((job) => (
                <Card key={job.job_id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(job.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(job.status)}
                              {job.status}
                            </span>
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatTimestamp(job.created_date)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Job ID:</span>{' '}
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {job.job_id}
                            </code>
                          </div>
                          <div>
                            <span className="text-gray-500">Type:</span>{' '}
                            <span className="font-medium">{job.product_type}</span>
                          </div>
                          {job.budget_amount && (
                            <div>
                              <span className="text-gray-500">Budget:</span>{' '}
                              <span className="font-medium">${Number(job.budget_amount).toFixed(2)}</span>
                            </div>
                          )}
                          {job.start_date && (
                            <div>
                              <span className="text-gray-500">Start:</span>{' '}
                              <span className="font-medium">{job.start_date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setJobId(job.job_id);
                            setShouldPoll(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Monitor
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Job Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Manual Job Monitoring
          </CardTitle>
          <CardDescription>
            Track a specific job by entering its ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="job_id">Program/Job ID</Label>
              <Input
                id="job_id"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Enter program ID to monitor"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleStartMonitoring} 
                disabled={!jobId.trim() || shouldPoll}
              >
                Start Monitoring
              </Button>
              <Button
                variant="outline"
                onClick={handleStopMonitoring}
                disabled={!shouldPoll}
              >
                Stop
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Job Monitor Details */}
      {shouldPoll && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Job Details: {jobId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobStatus ? (
              <div className="space-y-4">
                {/* Adding debug information */}
                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                  <strong>Debug:</strong> status = "{jobStatus.status}", type = {typeof jobStatus.status}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(jobStatus.status || 'UNKNOWN')}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(jobStatus.status || 'UNKNOWN')}
                      {jobStatus.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </Badge>
                </div>

                {jobStatus.status === 'COMPLETED' && jobStatus.business_results && (
                  <div>
                    <h4 className="font-semibold mb-2">Result:</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(jobStatus.business_results, null, 2)}
                    </pre>
                  </div>
                )}

                {jobStatus.status === 'FAILED' && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Error:</h4>
                    <pre className="text-red-600 bg-red-50 p-3 rounded">
                      {JSON.stringify(jobStatus.business_results ?? {}, null, 2)}
                    </pre>
                  </div>
                )}

                {(jobStatus.status === 'PENDING' || jobStatus.status === 'IN_PROGRESS') && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Task running... Refreshing every 5 seconds</span>
                  </div>
                )}
              </div>
            ) : error ? (
              <p className="text-red-500">Failed to get task status</p>
            ) : (
              <p className="text-muted-foreground">Loading status...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobStatusMonitor;
