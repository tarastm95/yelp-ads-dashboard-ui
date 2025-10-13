import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetJobStatusQuery, useGetPartnerProgramInfoQuery } from '../store/api/yelpApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, ArrowLeft, DollarSign, TrendingUp, MousePointer, Eye, 
  Calendar, Target, Zap, Activity, BarChart3, CheckCircle2, XCircle
} from 'lucide-react';

const ProgramStatus: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  // Function to determine ID type
  const isJobId = (id: string): boolean => {
    // For programs from the /programs API always use the program info endpoint
    // Job ID is used only for tracking program creation
    // Since we now work with the Yelp programs API, always treat as program_id
    return false; // Always use program info endpoint
  };

  const isJob = programId ? isJobId(programId) : false;

  // Use appropriate API depending on ID type
  const { 
    data: jobData, 
    isLoading: jobLoading, 
    error: jobError 
  } = useGetJobStatusQuery(programId || '', {
    skip: !programId || !isJob,
  });

  const { 
    data: programData, 
    isLoading: programLoading, 
    error: programError 
  } = useGetPartnerProgramInfoQuery(programId || '', {
    skip: !programId || isJob,
  });

  if (!programId) {
    return <p className="text-red-500">Program ID not specified</p>;
  }

  const isLoading = jobLoading || programLoading;
  const error = jobError || programError;
  const data = isJob ? jobData : programData;

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
          Back
        </Button>
        <div className="space-y-2">
          <p className="text-red-500">Error loading data</p>
          <p className="text-sm text-gray-600">
            ID: {programId} (identified as {isJob ? 'Job ID' : 'Program ID'})
          </p>
          {error && 'status' in error && (
            <p className="text-sm text-red-400">
              HTTP {error.status}: {error.data?.error?.message || 'Unknown error'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Helper function to calculate percentage
  const calculatePercentage = (value: number, total: number): number => {
    if (!total || total === 0) return 0;
    return Math.min(100, (value / total) * 100);
  };

  // Helper function to format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={() => navigate(`/program-features/${programId}`)} className="gap-2">
          <Target className="w-4 h-4" />
          Manage Features
        </Button>
      </div>
      
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="text-lg">
            {isJob ? 'Job status' : 'Program information'}
          </CardTitle>
          <CardDescription>
            {isJob ? 'Job ID' : 'Program ID'}: {programId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isJob ? (
            // Display for Job Status
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-lg">{data.status || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm">{data.created_at || 'Unknown'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Full data</label>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto mt-2">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            // Display for Program Info - MODERN DESIGN
            <div className="space-y-6">
              {data.programs && data.programs.length > 0 ? (
                <div className="space-y-6">
                  {data.programs.map((program: any, index: number) => {
                    const metrics = program.program_metrics;
                    const budget = metrics?.budget ? Number(metrics.budget) / 100 : 0;
                    const adCost = metrics?.ad_cost ? Number(metrics.ad_cost) / 100 : 0;
                    const remaining = budget - adCost;
                    const budgetUsedPercent = calculatePercentage(adCost, budget);
                    
                    return (
                      <div key={index} className="space-y-6">
                        {/* Header with Status Badges */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-3xl font-bold text-gray-900">{program.program_type} Campaign</h2>
                            <p className="text-gray-500 mt-1">Monitor your advertising performance</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={`${
                              program.program_status === 'ACTIVE' ? 'bg-green-500' :
                              program.program_status === 'INACTIVE' ? 'bg-gray-500' :
                              'bg-yellow-500'
                            } text-white`}>
                              {program.program_status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                              {program.program_status}
                            </Badge>
                            <Badge variant={program.program_pause_status === 'PAUSED' ? 'destructive' : 'default'}>
                              {program.program_pause_status}
                            </Badge>
                          </div>
                        </div>

                        {/* Budget Overview - Hero Section */}
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
                          <CardContent className="p-8">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-blue-100 text-sm font-medium mb-2">CAMPAIGN BUDGET</p>
                                <div className="flex items-baseline gap-3">
                                  <h3 className="text-5xl font-bold">${budget.toFixed(2)}</h3>
                                  <span className="text-xl text-blue-100">{metrics?.currency}</span>
                                </div>
                              </div>
                              <div className="bg-white/20 rounded-full p-4">
                                <DollarSign className="w-8 h-8" />
                              </div>
                            </div>

                            {/* Budget Progress Bar */}
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-blue-100">Budget Usage</span>
                                <span className="font-bold">{budgetUsedPercent.toFixed(1)}%</span>
                              </div>
                              <div className="relative">
                                <div className="bg-white/20 rounded-full h-4 overflow-hidden">
                                  <div 
                                    className="bg-white h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                                    style={{ width: `${budgetUsedPercent}%` }}
                                  >
                                    {budgetUsedPercent > 10 && (
                                      <span className="text-blue-600 text-xs font-bold">{budgetUsedPercent.toFixed(0)}%</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-between text-sm">
                                <div>
                                  <p className="text-blue-100">Spent</p>
                                  <p className="text-lg font-bold">${adCost.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-blue-100">Remaining</p>
                                  <p className="text-lg font-bold">${remaining.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Clicks */}
                          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <MousePointer className="w-8 h-8 text-purple-500" />
                                <Badge variant="outline" className="text-purple-600 border-purple-300">
                                  Clicks
                                </Badge>
                              </div>
                              <div>
                                <p className="text-3xl font-bold text-gray-900">
                                  {formatNumber(metrics?.billed_clicks || 0)}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Total clicks</p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Impressions */}
                          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <Eye className="w-8 h-8 text-green-500" />
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                  Views
                                </Badge>
                              </div>
                              <div>
                                <p className="text-3xl font-bold text-gray-900">
                                  {formatNumber(metrics?.billed_impressions || 0)}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Total impressions</p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* CTR (Click-through Rate) */}
                          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <TrendingUp className="w-8 h-8 text-orange-500" />
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  CTR
                                </Badge>
                              </div>
                              <div>
                                <p className="text-3xl font-bold text-gray-900">
                                  {metrics?.billed_impressions && metrics.billed_impressions > 0
                                    ? ((metrics.billed_clicks / metrics.billed_impressions) * 100).toFixed(2)
                                    : '0.00'
                                  }%
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Click rate</p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* CPC (Cost per Click) */}
                          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <Activity className="w-8 h-8 text-blue-500" />
                                <Badge variant="outline" className="text-blue-600 border-blue-300">
                                  CPC
                                </Badge>
                              </div>
                              <div>
                                <p className="text-3xl font-bold text-gray-900">
                                  ${metrics?.billed_clicks && metrics.billed_clicks > 0
                                    ? (adCost / metrics.billed_clicks).toFixed(2)
                                    : '0.00'
                                  }
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Cost per click</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Campaign Details */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Calendar className="w-5 h-5" />
                              Campaign Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">Start Date</label>
                                  <p className="text-lg font-semibold mt-1">{program.start_date}</p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">End Date</label>
                                  <p className="text-lg font-semibold mt-1">{program.end_date || 'Ongoing'}</p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">Business ID</label>
                                  <code className="text-sm bg-gray-100 px-3 py-1.5 rounded mt-1 block font-mono">
                                    {program.yelp_business_id}
                                  </code>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">Auto-bidding</label>
                                  <div className="flex items-center gap-2 mt-1">
                                    {metrics?.is_autobid ? (
                                      <Badge className="bg-green-500"><Zap className="w-3 h-3 mr-1" /> Enabled</Badge>
                                    ) : (
                                      <Badge variant="outline">Manual Bidding</Badge>
                                    )}
                                  </div>
                                </div>
                                {!metrics?.is_autobid && metrics?.max_bid && (
                                  <div>
                                    <label className="text-xs text-gray-500 uppercase tracking-wide">Max Bid</label>
                                    <p className="text-lg font-semibold mt-1">
                                      ${(Number(metrics.max_bid) / 100).toFixed(2)}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">Billing Period</label>
                                  <p className="text-lg font-semibold mt-1">{metrics?.fee_period || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Performance Metrics */}
                        {metrics && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Performance Metrics
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              {/* Impressions Progress */}
                              <div>
                                <div className="flex justify-between items-baseline mb-2">
                                  <label className="text-sm font-medium text-gray-700">Impressions</label>
                                  <span className="text-2xl font-bold text-gray-900">
                                    {(metrics.billed_impressions || 0).toLocaleString()}
                                  </span>
                                </div>
                                <Progress value={Math.min(100, (metrics.billed_impressions || 0) / 100)} className="h-3" />
                                <p className="text-xs text-gray-500 mt-1">Ad views</p>
                              </div>

                              {/* Clicks Progress */}
                              <div>
                                <div className="flex justify-between items-baseline mb-2">
                                  <label className="text-sm font-medium text-gray-700">Clicks</label>
                                  <span className="text-2xl font-bold text-gray-900">
                                    {(metrics.billed_clicks || 0).toLocaleString()}
                                  </span>
                                </div>
                                <Progress value={Math.min(100, (metrics.billed_clicks || 0) / 10)} className="h-3" />
                                <p className="text-xs text-gray-500 mt-1">User interactions</p>
                              </div>

                              {/* Ad Cost Progress */}
                              <div>
                                <div className="flex justify-between items-baseline mb-2">
                                  <label className="text-sm font-medium text-gray-700">Total Spend</label>
                                  <span className="text-2xl font-bold text-gray-900">
                                    ${adCost.toFixed(2)}
                                  </span>
                                </div>
                                <Progress 
                                  value={budgetUsedPercent} 
                                  className={`h-3 ${
                                    budgetUsedPercent >= 90 ? '[&>div]:bg-red-500' :
                                    budgetUsedPercent >= 70 ? '[&>div]:bg-yellow-500' :
                                    '[&>div]:bg-green-500'
                                  }`}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {budgetUsedPercent.toFixed(1)}% of ${budget.toFixed(2)} budget
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      
                        {/* Active Features */}
                        {program.active_features && program.active_features.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Active Features ({program.active_features.length})
                              </CardTitle>
                              <CardDescription>
                                Currently enabled campaign optimizations
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                {program.active_features.map((feature: string) => (
                                  <Badge key={feature} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5">
                                    {feature.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                              <Button 
                                variant="outline" 
                                className="mt-4 w-full"
                                onClick={() => navigate(`/program-features/${programId}`)}
                              >
                                <Target className="w-4 h-4 mr-2" />
                                Manage Features
                              </Button>
                            </CardContent>
                          </Card>
                        )}

                        {/* Future Budget Changes */}
                        {program.future_budget_changes && program.future_budget_changes.length > 0 && (
                          <Card className="border-l-4 border-l-yellow-500">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="w-5 h-5 text-yellow-500" />
                                Scheduled Budget Changes
                              </CardTitle>
                              <CardDescription>
                                Upcoming budget adjustments
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {program.future_budget_changes.map((change: any, idx: number) => (
                                  <div key={idx} className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-gray-600">Effective Date</p>
                                        <p className="text-lg font-semibold">{change.date}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm text-gray-600">New Budget</p>
                                        <p className="text-lg font-semibold text-yellow-700">
                                          ${(Number(change.budget) / 100).toFixed(2)} {change.currency}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Program IDs */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Technical Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Program ID</label>
                                <code className="text-sm bg-gray-100 px-3 py-1.5 rounded mt-1 block font-mono break-all">
                                  {program.program_id}
                                </code>
                              </div>
                              {program.partner_business_id && (
                                <div>
                                  <label className="text-xs text-gray-500 uppercase tracking-wide">Partner Business ID</label>
                                  <code className="text-sm bg-gray-100 px-3 py-1.5 rounded mt-1 block font-mono break-all">
                                    {program.partner_business_id}
                                  </code>
                                </div>
                              )}
                            </div>
                            
                            {/* JSON data (collapsed) */}
                            <details className="mt-4">
                              <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                View Full JSON Data
                              </summary>
                              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto mt-3 max-h-96 font-mono">
                                {JSON.stringify(program, null, 2)}
                              </pre>
                            </details>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-500">Response data</label>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto mt-2">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramStatus;
