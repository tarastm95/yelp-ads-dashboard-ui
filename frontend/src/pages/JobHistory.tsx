import React, { useState } from 'react';
import { useGetJobHistoryQuery } from '../store/api/yelpApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, History, CheckCircle, XCircle, AlertCircle, Clock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const JobHistory: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const { data, isLoading, refetch } = useGetJobHistoryQuery({ 
    days, 
    status: statusFilter,
    limit: 100 
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'REJECTED':
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'PROCESSING':
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'REJECTED':
      case 'FAILED':
        return 'bg-red-500';
      case 'PROCESSING':
      case 'PENDING':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const jobs = data?.jobs || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-8 h-8" />
            Job History
          </h1>
          <p className="text-gray-500 mt-1">View all program creation and update operations</p>
        </div>
        <Button onClick={() => refetch()} disabled={isLoading}>
          <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Time Range:</label>
              <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24h</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED">✅ Completed</SelectItem>
                  <SelectItem value="REJECTED">❌ Rejected</SelectItem>
                  <SelectItem value="FAILED">⚠️ Failed</SelectItem>
                  <SelectItem value="PROCESSING">⏳ Processing</SelectItem>
                  <SelectItem value="PENDING">🕐 Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-gray-600">
              Found {jobs.length} jobs
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No jobs found</p>
            <p className="text-sm text-gray-400 mt-2">
              Try adjusting filters or check back later
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            // Parse error from status_data if REJECTED/FAILED
            let errorDetails = null;
            if (job.status_data && (job.status === 'REJECTED' || job.status === 'FAILED')) {
              try {
                const businessResults = job.status_data.business_results;
                if (businessResults && businessResults[0]?.error) {
                  errorDetails = businessResults[0].error;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
            
            return (
              <Card 
                key={job.job_id} 
                className={`border-l-4 ${
                  job.status === 'COMPLETED' ? 'border-l-green-500' :
                  job.status === 'REJECTED' || job.status === 'FAILED' ? 'border-l-red-500' :
                  'border-l-yellow-500'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span>{job.name || 'Program'} Operation</span>
                        <Badge className={`${getStatusColor(job.status)} text-white`}>
                          {job.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Job ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{job.job_id}</code>
                      </CardDescription>
                      {job.partner_program_id && (
                        <CardDescription className="mt-1">
                          Program ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{job.partner_program_id}</code>
                        </CardDescription>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(job.created_date)}</p>
                      {job.partner_program_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => navigate(`/program-status/${job.partner_program_id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {/* Show error details for REJECTED/FAILED */}
                {errorDetails && (
                  <CardContent>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-900">
                            {errorDetails.code || errorDetails.id || 'Error'}
                          </p>
                          <p className="text-sm text-red-700 mt-1">
                            {errorDetails.message || errorDetails.description || 'Unknown error occurred'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
                
                {/* Show program details if available */}
                {(job.budget_amount || job.start_date) && (
                  <CardContent className="border-t pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {job.budget_amount && (
                        <div>
                          <p className="text-gray-500">Budget</p>
                          <p className="font-semibold">${Number(job.budget_amount).toFixed(2)}</p>
                        </div>
                      )}
                      {job.start_date && (
                        <div>
                          <p className="text-gray-500">Start Date</p>
                          <p className="font-semibold">{job.start_date}</p>
                        </div>
                      )}
                      {job.end_date && (
                        <div>
                          <p className="text-gray-500">End Date</p>
                          <p className="font-semibold">{job.end_date}</p>
                        </div>
                      )}
                      {job.product_type && (
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="font-semibold">{job.product_type}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobHistory;

