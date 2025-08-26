import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetJobStatusQuery, useGetPartnerProgramInfoQuery } from '../store/api/yelpApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="outline" onClick={() => navigate(-1)}>
        Back
      </Button>
      
      <Card>
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
            // Display for Program Info
            <div className="space-y-4">
              {data.programs && data.programs.length > 0 ? (
                <div className="space-y-4">
                  {data.programs.map((program: any, index: number) => (
                    <div key={index} className="border rounded p-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Program status</label>
                          <p className="text-lg">{program.program_status}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Program type</label>
                          <p className="text-lg">{program.program_type}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Pause status</label>
                          <p className="text-lg">{program.program_pause_status}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Business ID</label>
                          <p className="text-sm font-mono">{program.yelp_business_id}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Start date</label>
                          <p>{program.start_date}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">End date</label>
                          <p>{program.end_date}</p>
                        </div>
                      </div>
                      
                      {program.program_metrics && (
                        <div className="border-t pt-4">
                          <label className="text-sm font-medium text-gray-500">Program metrics</label>
                          <div className="grid grid-cols-3 gap-4 mt-2">
                            <div>
                              <label className="text-xs text-gray-400">Budget</label>
                              <p>{program.program_metrics.budget} {program.program_metrics.currency}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">Autobid</label>
                              <p>{program.program_metrics.is_autobid ? 'Yes' : 'No'}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">Max bid</label>
                              <p>{program.program_metrics.max_bid || 'Not set'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Active features */}
                      {program.active_features && program.active_features.length > 0 && (
                        <div className="border-t pt-4">
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Active features</label>
                          <div className="flex flex-wrap gap-2">
                            {program.active_features.map((feature: string) => (
                              <span key={feature} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Available features */}
                      {program.available_features && program.available_features.length > 0 && (
                        <div className="border-t pt-4">
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Available features</label>
                          <div className="flex flex-wrap gap-2">
                            {program.available_features.map((feature: string) => {
                              const isActive = program.active_features?.includes(feature);
                              return (
                                <span 
                                  key={feature} 
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    isActive 
                                      ? 'bg-green-100 text-green-800 font-medium' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {feature}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Additional metrics */}
                      {program.program_metrics && (
                        <div className="border-t pt-4">
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Additional metrics</label>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {program.program_metrics.fee_period && (
                              <div>
                                <label className="text-xs text-gray-400">Billing period</label>
                                <p>{program.program_metrics.fee_period}</p>
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-gray-400">Impressions (billed)</label>
                              <p>{program.program_metrics.billed_impressions || 0}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">Clicks (billed)</label>
                              <p>{program.program_metrics.billed_clicks || 0}</p>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">Ad cost</label>
                              <p>{program.program_metrics.ad_cost || 0} {program.program_metrics.currency}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Future budget changes */}
                      {program.future_budget_changes && program.future_budget_changes.length > 0 && (
                        <div className="border-t pt-4">
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Scheduled budget changes</label>
                          <div className="space-y-2">
                            {program.future_budget_changes.map((change: any, index: number) => (
                              <div key={index} className="bg-blue-50 p-3 rounded">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-500">Date:</span> {change.date}
                                  </div>
                                  <div>
                                    <span className="text-gray-500">New budget:</span> {change.budget} {change.currency}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional information */}
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Additional information</label>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          {program.partner_business_id && (
                            <div>
                              <span className="text-gray-500">Partner Business ID:</span> 
                              <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">{program.partner_business_id}</code>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Program ID:</span> 
                            <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">{program.program_id}</code>
                          </div>
                        </div>
                      </div>

                      {/* JSON data (collapsed) */}
                      <details className="border-t pt-4">
                        <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                          Show full JSON data
                        </summary>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mt-2 max-h-96">
                          {JSON.stringify(program, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
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
