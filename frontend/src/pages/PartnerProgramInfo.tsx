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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, ArrowLeft, DollarSign, TrendingUp, MousePointer, Eye, 
  Calendar, Target, Zap, Settings, CheckCircle2, XCircle, Clock,
  BarChart3, Activity, Info
} from 'lucide-react';

const PartnerProgramInfo: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetPartnerProgramInfoQuery(programId || '', {
    skip: !programId,
  });

  if (!programId) {
    return <p className="text-red-500">Program ID not specified</p>;
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
          Back
        </Button>
        <p className="text-red-500">Error loading program data</p>
      </div>
    );
  }

  const program = data.programs[0];
  const metrics = program.program_metrics;
  const budget = metrics ? Number(metrics.budget) / 100 : 0;
  const adCost = metrics ? Number(metrics.ad_cost) / 100 : 0;
  const remaining = budget - adCost;
  const budgetUsedPercent = budget > 0 ? Math.min(100, (adCost / budget) * 100) : 0;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Programs
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/program-status/${programId}`)} className="gap-2">
            <BarChart3 className="w-4 h-4" />
            View Status
          </Button>
          <Button onClick={() => navigate(`/program-features/${programId}`)} className="gap-2">
            <Settings className="w-4 h-4" />
            Features
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{program.program_type} Campaign</h1>
          <p className="text-gray-500 mt-2">Complete program information and analytics</p>
          <code className="text-sm bg-gray-100 px-3 py-1 rounded mt-2 inline-block font-mono">
            {program.program_id}
          </code>
        </div>
        <div className="flex gap-2">
          <Badge className={`${
            program.program_status === 'ACTIVE' ? 'bg-green-500' :
            program.program_status === 'INACTIVE' ? 'bg-gray-500' :
            'bg-yellow-500'
          } text-white text-lg px-4 py-2`}>
            {program.program_status === 'ACTIVE' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
            {program.program_status}
          </Badge>
          <Badge variant={program.program_pause_status === 'PAUSED' ? 'destructive' : 'default'} className="text-lg px-4 py-2">
            <Clock className="w-4 h-4 mr-2" />
            {program.program_pause_status}
          </Badge>
        </div>
      </div>

      {/* Budget Hero Card */}
      {metrics && (
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-2xl">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Total Budget */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-purple-200" />
                  <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">Total Budget</p>
                </div>
                <p className="text-4xl font-bold">${budget.toFixed(2)}</p>
                <p className="text-purple-100 text-sm mt-1">{metrics.currency}</p>
              </div>

              {/* Spent */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-200" />
                  <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">Spent</p>
                </div>
                <p className="text-4xl font-bold">${adCost.toFixed(2)}</p>
                <p className="text-purple-100 text-sm mt-1">{budgetUsedPercent.toFixed(1)}% used</p>
              </div>

              {/* Remaining */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-200" />
                  <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">Remaining</p>
                </div>
                <p className="text-4xl font-bold">${remaining.toFixed(2)}</p>
                <p className="text-purple-100 text-sm mt-1">{(100 - budgetUsedPercent).toFixed(1)}% left</p>
              </div>
            </div>

            {/* Budget Progress */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-100">Budget Usage</span>
                <span className="font-bold">{budgetUsedPercent.toFixed(1)}%</span>
              </div>
              <div className="bg-white/20 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${budgetUsedPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Stats Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Impressions */}
          <Card className="border-t-4 border-t-green-500 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Eye className="w-10 h-10 text-green-500" />
                <Badge variant="outline" className="text-green-600 border-green-300">
                  Views
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(metrics.billed_impressions || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Impressions</p>
              <Progress value={Math.min(100, (metrics.billed_impressions || 0) / 100)} className="h-2 mt-3" />
            </CardContent>
          </Card>

          {/* Clicks */}
          <Card className="border-t-4 border-t-blue-500 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <MousePointer className="w-10 h-10 text-blue-500" />
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  Clicks
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(metrics.billed_clicks || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total clicks</p>
              <Progress value={Math.min(100, (metrics.billed_clicks || 0) / 10)} className="h-2 mt-3" />
            </CardContent>
          </Card>

          {/* CTR */}
          <Card className="border-t-4 border-t-orange-500 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-10 h-10 text-orange-500" />
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Rate
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.billed_impressions && metrics.billed_impressions > 0
                  ? ((metrics.billed_clicks / metrics.billed_impressions) * 100).toFixed(2)
                  : '0.00'
                }%
              </p>
              <p className="text-sm text-gray-500 mt-1">Click-through rate</p>
              <Progress 
                value={metrics.billed_impressions > 0 ? (metrics.billed_clicks / metrics.billed_impressions) * 100 * 10 : 0} 
                className="h-2 mt-3" 
              />
            </CardContent>
          </Card>

          {/* CPC */}
          <Card className="border-t-4 border-t-purple-500 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-10 h-10 text-purple-500" />
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  Cost
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ${metrics.billed_clicks && metrics.billed_clicks > 0
                  ? (adCost / metrics.billed_clicks).toFixed(2)
                  : '0.00'
                }
              </p>
              <p className="text-sm text-gray-500 mt-1">Cost per click</p>
              <Progress value={50} className="h-2 mt-3" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Timeline & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Campaign Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Start Date</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{program.start_date}</p>
              </div>
              <ArrowLeft className="w-8 h-8 text-blue-300 rotate-180" />
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">End Date</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{program.end_date || 'Ongoing'}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Business ID</p>
              <code className="text-sm bg-white px-3 py-2 rounded border font-mono block">
                {program.yelp_business_id}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Bidding Settings */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Bidding Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Bidding Strategy</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {metrics.is_autobid ? 'Auto-bidding' : 'Manual Bidding'}
                  </p>
                </div>
                {metrics.is_autobid ? (
                  <Badge className="bg-green-500 text-white text-base px-3 py-1.5">
                    <Zap className="w-4 h-4 mr-1" />
                    Auto
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-base px-3 py-1.5">
                    Manual
                  </Badge>
                )}
              </div>

              {!metrics.is_autobid && metrics.max_bid && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Maximum Bid</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">
                    ${(Number(metrics.max_bid) / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Per click limit</p>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Billing Period</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{metrics.fee_period || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Features */}
      {program.active_features && program.active_features.length > 0 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  Active Features ({program.active_features.length})
                </CardTitle>
                <CardDescription className="mt-1">
                  Optimizations currently enabled for this campaign
                </CardDescription>
              </div>
              <Button onClick={() => navigate(`/program-features/${programId}`)}>
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {program.active_features.map((feature: string) => (
                <div key={feature} className="bg-green-50 border border-green-200 p-3 rounded-lg hover:bg-green-100 transition-colors">
                  <p className="text-sm font-semibold text-green-800">
                    {feature.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Features */}
      {program.available_features && program.available_features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-500" />
              Available Features ({program.available_features.length})
            </CardTitle>
            <CardDescription>
              All features you can enable for this campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {program.available_features.map((feature: string) => {
                const isActive = program.active_features?.includes(feature);
                return (
                  <Badge 
                    key={feature}
                    className={`justify-center py-2 ${
                      isActive 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {feature.replace(/_/g, ' ').substring(0, 15)}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerProgramInfo;
