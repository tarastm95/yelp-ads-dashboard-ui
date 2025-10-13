import React, { useState, useEffect } from 'react';
import { 
  useGetProgramsQuery, 
  useTerminateProgramMutation,
  usePauseProgramMutation,
  useResumeProgramMutation,
  useDuplicateProgramMutation
} from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit, Square, Play, Trash2, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, DollarSign, MousePointer, Eye, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatErrorForToast } from '@/lib/utils';
import ApiErrorMessage from './ApiErrorMessage';
import DuplicateProgramDialog, { DuplicateFormData } from './DuplicateProgramDialog';
import { BusinessProgram } from '../types/yelp';

const ProgramsList: React.FC = () => {
  const navigate = useNavigate();
  
  // Restore pagination state from sessionStorage
  const savedOffset = sessionStorage.getItem('programsList_offset');
  const savedLimit = sessionStorage.getItem('programsList_limit');
  const savedStatus = sessionStorage.getItem('programsList_status');
  
  const [offset, setOffset] = useState(savedOffset ? parseInt(savedOffset) : 0);
  const [limit, setLimit] = useState(savedLimit ? parseInt(savedLimit) : 20);
  const [programStatus, setProgramStatus] = useState(savedStatus || 'CURRENT');
  const [isChangingPage, setIsChangingPage] = useState(false); // Page switching state
  
  // Create a unique key to force refresh
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  
  // State for quick page jump
  const [jumpToPage, setJumpToPage] = useState('');
  
  // Save pagination state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('programsList_offset', offset.toString());
    sessionStorage.setItem('programsList_limit', limit.toString());
    sessionStorage.setItem('programsList_status', programStatus);
  }, [offset, limit, programStatus]);

  // Generate page numbers with ellipsis
  const generatePageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7; // Max visible pages
    
    if (totalPages <= maxVisiblePages) {
      // Show all if few pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Determine range around current page
      let startPage = Math.max(2, currentPage - 2);
      let endPage = Math.min(totalPages - 1, currentPage + 2);
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Add pages around current
      for (let i = startPage; i <= endPage; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Navigate to page
  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit;
    setIsChangingPage(true);
    setOffset(newOffset);
    setForceRefreshKey(prev => prev + 1);
  };

  // Handle quick page jump
  const handleJumpToPage = () => {
    const pageNumber = parseInt(jumpToPage);
    const totalPages = data?.total_count ? Math.ceil(data.total_count / limit) : 1;
    
    if (pageNumber && pageNumber >= 1 && pageNumber <= totalPages) {
      goToPage(pageNumber);
      setJumpToPage('');
    }
  };
  
  // Regular programs with auto-refresh every 30 seconds
  const { data, isLoading, error, isError, refetch } = useGetProgramsQuery({
    offset: offset, 
    limit: limit,
    program_status: programStatus,
    // Add force refresh key
    _forceKey: forceRefreshKey
  }, {
    pollingInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Reset page switching state when data loaded or error
  useEffect(() => {
    if (!isLoading) {
      setIsChangingPage(false);
    }
  }, [isLoading]);

  // Additional safety: reset state after timeout if something wrong
  useEffect(() => {
    if (isChangingPage) {
      const timeoutId = setTimeout(() => {
        setIsChangingPage(false);
      }, 10000); // max 10 seconds
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isChangingPage]);
  
  // State declarations FIRST (before using them)
  const [terminateProgram] = useTerminateProgramMutation();
  const [pauseProgram] = usePauseProgramMutation();
  const [resumeProgram] = useResumeProgramMutation();
  const [duplicateProgram, { isLoading: isDuplicating }] = useDuplicateProgramMutation();
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  
  // State for duplicate dialog
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [programToDuplicate, setProgramToDuplicate] = useState<BusinessProgram | null>(null);
  
  // Track locally terminated programs (for immediate removal)
  // Restore from sessionStorage on mount
  const getInitialTerminatedIds = (): Set<string> => {
    try {
      const saved = sessionStorage.getItem('terminatedProgramIds');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  };
  
  const [terminatedProgramIds, setTerminatedProgramIds] = useState<Set<string>>(getInitialTerminatedIds());
  
  // Save terminated IDs to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('terminatedProgramIds', JSON.stringify(Array.from(terminatedProgramIds)));
  }, [terminatedProgramIds]);
  
  // Get programs from API and filter out terminated/inactive ones
  const allPrograms = data?.programs || [];
  const programs = allPrograms.filter(program => {
    // FIRST: Filter out locally terminated programs (optimistic update)
    if (terminatedProgramIds.has(program.program_id)) {
      return false;
    }
    
    // SECOND: Filter out INACTIVE and TERMINATED programs when viewing CURRENT
    if (programStatus === 'CURRENT') {
      return program.program_status !== 'INACTIVE' && 
             program.program_status !== 'TERMINATED' &&
             program.program_status !== 'EXPIRED';
    }
    return true; // For other filters, show all
  });
  
  // Auto-navigate to previous page if current page becomes empty after filtering
  useEffect(() => {
    if (!isLoading && programs.length === 0 && offset > 0 && data?.total_count && data.total_count > 0) {
      // Current page is empty but there are programs on other pages
      const newPage = Math.max(1, Math.floor(offset / limit));
      if (newPage > 1) {
        const newOffset = (newPage - 1) * limit;
        setOffset(newOffset);
        setForceRefreshKey(prev => prev + 1);
      }
    }
  }, [programs.length, offset, limit, isLoading, data?.total_count]);

  const handleAction = async (
    action: () => Promise<any>, 
    programId: string, 
    successMessage: string,
    actionName: string
  ) => {
    setLoadingActions(prev => ({ ...prev, [`${programId}-${actionName}`]: true }));
    try {
      await action();
      toast({
        title: successMessage,
        description: `Program ID: ${programId}`,
      });
      refetch(); // Refresh programs list
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title,
        description,
        variant: 'destructive',
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [`${programId}-${actionName}`]: false }));
    }
  };

  const handleEdit = (programId: string) => {
    navigate(`/edit/${programId}`);
  };

  const handleTerminate = async (programId: string) => {
    setLoadingActions(prev => ({ ...prev, [`${programId}-terminate`]: true }));
    try {
      await terminateProgram(programId).unwrap();
      
      // Immediately add to terminated list for optimistic update
      setTerminatedProgramIds(prev => new Set(prev).add(programId));
      
      toast({
        title: "Program Terminated",
        description: `Program ${programId} has been removed from the list`,
      });
      
      // Refresh in background to sync with Yelp
      setTimeout(() => refetch(), 3000);
      
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title: title || "Termination Failed",
        description,
        variant: 'destructive',
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [`${programId}-terminate`]: false }));
    }
  };

  const handlePause = (programId: string) => {
    handleAction(
      () => pauseProgram(programId).unwrap(),
      programId,
      "Program paused",
      "pause"
    );
  };

  const handleResume = (programId: string) => {
    handleAction(
      () => resumeProgram(programId).unwrap(),
      programId,
      "Program resumed",
      "resume"
    );
  };

  const handleDuplicateClick = (program: BusinessProgram) => {
    setProgramToDuplicate(program);
    setShowDuplicateDialog(true);
  };

  const handleDuplicateConfirm = async (data: DuplicateFormData) => {
    try {
      const result = await duplicateProgram(data).unwrap();
      
      toast({
        title: 'Campaign Layer Created!',
        description: (
          <div className="space-y-1">
            <p>{result.message}</p>
            <p className="text-xs">Job ID: {result.job_id}</p>
            {result.copied_features.length > 0 && (
              <p className="text-xs">Copied {result.copied_features.length} features</p>
            )}
          </div>
        ),
      });
      
      setShowDuplicateDialog(false);
      setProgramToDuplicate(null);
      
      // Navigate to jobs page to monitor
      navigate('/jobs');
      
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title: title || 'Duplication Failed',
        description,
        variant: 'destructive',
      });
    }
  };

  // Show main loader only on initial load (not during page switch)
  if (isLoading && !isChangingPage) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError && error && 'status' in error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <p className="text-red-500">Error loading programs</p>
          <p className="text-sm text-gray-600 mt-2">
            <ApiErrorMessage error={error as any} />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Advertising Programs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage programs via Yelp Advertising API
          </p>
        </div>
        <Button onClick={() => navigate('/create')}>Create Program</Button>
      </div>



      {/* Filters and pagination */}
      <div>
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded">
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-sm font-medium">Status:</label>
              <select 
                value={programStatus} 
                onChange={(e) => {
                  setIsChangingPage(true);
                  setProgramStatus(e.target.value);
                  setOffset(0); // Reset to first page
                  // Force update data via forceKey
                  setForceRefreshKey(prev => prev + 1);
                }}
                className="ml-2 border rounded px-2 py-1"
              >
                <option value="CURRENT">CURRENT</option>
                <option value="PAST">PAST</option>
                <option value="FUTURE">FUTURE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ALL">ALL</option>
              </select>
            </div>

          </div>
        </div>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No programs with status "{programStatus}". Try adjusting the filter or create a new program.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Show loader instead of list during page switching */}
          {(isLoading || isChangingPage) ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {isChangingPage ? 'Switching page...' : 'Loading programs...'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {isChangingPage 
                    ? `Loading page ${Math.floor(offset / limit) + 1}...`
                    : 'Please wait...'
                  }
                </p>
              </div>
            </div>
          ) : (
            /* Programs list */
          <div className="grid gap-4">
            {programs.map((program, index) => {
              const isTerminating = loadingActions[`${program.program_id}-terminate`];
              
              return (
              <Card key={program.program_id || `program-${index}`} className={`relative hover:shadow-lg transition-shadow ${isTerminating ? 'opacity-60' : ''}`}>
                {/* Terminating Overlay */}
                {isTerminating && (
                  <div className="absolute inset-0 bg-red-50/90 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm">
                    <div className="text-center p-6">
                      <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-3" />
                      <p className="text-lg font-bold text-red-900">Terminating Program...</p>
                      <p className="text-sm text-red-700 mt-2">Please wait (~2-3 seconds)</p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-lg">
                      {program.program_type} Program
                    </span>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        program.program_status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        program.program_status === 'INACTIVE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {program.program_status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        program.program_pause_status === 'NOT_PAUSED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {program.program_pause_status}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Program ID:</strong>
                        <p className="font-mono text-xs break-all">{program.program_id}</p>
                      </div>
                      <div>
                        <strong>Business ID:</strong>
                        <p className="font-mono text-xs break-all">{program.yelp_business_id || 'N/A'}</p>
                      </div>
                      <div>
                        <strong>Dates:</strong>
                        <p>{program.start_date} - {program.end_date}</p>
                      </div>
                      <div>
                        <strong>Budget:</strong>
                        <p>
                          {program.program_metrics
                            ? `$${(Number(program.program_metrics.budget) / 100).toFixed(2)} ${program.program_metrics.currency}`
                            : 'N/A (program not active yet)'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Performance Metrics Section - Always show */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Performance Metrics</h4>
                      
                      {/* Always show basic info even without full metrics */}
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Eye className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700 uppercase">Impressions</span>
                          </div>
                          <p className="text-xl font-bold text-gray-900">
                            {program.program_metrics?.billed_impressions?.toLocaleString() || '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">Ad views</p>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <MousePointer className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700 uppercase">Clicks</span>
                          </div>
                          <p className="text-xl font-bold text-gray-900">
                            {program.program_metrics?.billed_clicks?.toLocaleString() || '0'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">User interactions</p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700 uppercase">Total Spend</span>
                          </div>
                          <p className="text-xl font-bold text-gray-900">
                            ${program.program_metrics?.ad_cost ? (Number(program.program_metrics.ad_cost) / 100).toFixed(2) : '0.00'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {program.program_metrics?.budget && program.program_metrics?.ad_cost
                              ? `${((Number(program.program_metrics.ad_cost) / Number(program.program_metrics.budget)) * 100).toFixed(1)}% of $${(Number(program.program_metrics.budget) / 100).toFixed(2)} budget`
                              : program.program_metrics?.budget
                                ? `of $${(Number(program.program_metrics.budget) / 100).toFixed(2)} budget`
                                : 'Budget pending'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Budget Progress Bar */}
                      {program.program_metrics?.budget && (
                        <div className="bg-gray-50 p-3 rounded-lg border">
                          <div className="flex justify-between text-xs mb-2">
                            <span className="font-medium text-gray-700">Budget Usage</span>
                            <span className="font-bold text-gray-900">
                              {program.program_metrics?.ad_cost
                                ? ((Number(program.program_metrics.ad_cost) / Number(program.program_metrics.budget)) * 100).toFixed(1)
                                : '0.0'
                              }%
                            </span>
                          </div>
                          <Progress 
                            value={program.program_metrics?.ad_cost ? Math.min(100, (Number(program.program_metrics.ad_cost) / Number(program.program_metrics.budget)) * 100) : 0} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs mt-2 text-gray-600">
                            <span>Spent: ${program.program_metrics?.ad_cost ? (Number(program.program_metrics.ad_cost) / 100).toFixed(2) : '0.00'}</span>
                            <span>Remaining: ${program.program_metrics?.ad_cost ? ((Number(program.program_metrics.budget) - Number(program.program_metrics.ad_cost)) / 100).toFixed(2) : (Number(program.program_metrics.budget) / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Info message if program not active */}
                      {!program.program_metrics && (
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mt-3">
                          <p className="text-sm text-yellow-800">
                            ℹ️ This program is <strong>{program.program_status}</strong>. Full metrics will be available once it becomes ACTIVE.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-3">
                      {/* EDIT - edit program */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleEdit(program.program_id)}
                        disabled={!program.program_id}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>

                      {/* DUPLICATE - create layer */}
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleDuplicateClick(program)}
                        disabled={!program.program_id}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Layer
                      </Button>

                      {/* TERMINATE - terminate program */}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleTerminate(program.program_id)}
                        disabled={
                          loadingActions[`${program.program_id}-terminate`] ||
                          !program.program_id ||
                          program.program_status === 'INACTIVE' || 
                          program.program_status === 'TERMINATED' ||
                          program.program_status === 'EXPIRED'
                        }
                      >
                        {loadingActions[`${program.program_id}-terminate`] ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        {program.program_status === 'INACTIVE' || program.program_status === 'TERMINATED' || program.program_status === 'EXPIRED' ? 
                          'Inactive' : 'Terminate'
                        }
                      </Button>

                      {/* PAUSE/RESUME - pause/resume program */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => 
                          program.program_pause_status === 'PAUSED' ? 
                            handleResume(program.program_id) : 
                            handlePause(program.program_id)
                        }
                        disabled={
                          loadingActions[`${program.program_id}-pause`] ||
                          loadingActions[`${program.program_id}-resume`] ||
                          !program.program_id ||
                          program.program_status === 'TERMINATED'
                        }
                      >
                        {(loadingActions[`${program.program_id}-pause`] || 
                          loadingActions[`${program.program_id}-resume`]) ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : program.program_pause_status === 'PAUSED' ? (
                          <Play className="w-4 h-4 mr-1" />
                        ) : (
                          <Square className="w-4 h-4 mr-1" />
                        )}
                        {program.program_pause_status === 'PAUSED' ? 'Resume' : 'Pause'}
                      </Button>

                      {/* INFO - view program information */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/program-info/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        Details
                      </Button>

                      {/* FEATURES - Program features */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/program-features/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Features
                      </Button>

                      {/* STATUS - View status */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/program-status/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        Program Status
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
          )}

          {/* Modern pagination with page numbers */}
          {!(isLoading || isChangingPage) && data?.total_count && (
            <div className="flex flex-col items-center space-y-4 bg-gray-50 p-4 rounded">
              {/* Results info and quick page size change */}
              <div className="flex flex-col sm:flex-row items-center justify-between w-full space-y-2 sm:space-y-0">
                <div className="text-sm text-gray-600 text-center sm:text-left">
                  Showing {programs.length} of {data.total_count} programs
                  {allPrograms.length !== programs.length && (
                    <span className="text-orange-600 font-medium ml-1">({allPrograms.length - programs.length} filtered)</span>
                  )}
                  <span className="hidden sm:inline text-gray-500"> • Page {Math.floor(offset / limit) + 1} of {Math.ceil((data?.total_count || 0) / limit)}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Per page:</span>
                  {[10, 20, 50].map((pageSize) => (
                    <Button
                      key={pageSize}
                      variant={limit === pageSize ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsChangingPage(true);
                        setLimit(pageSize);
                        setOffset(0);
                        setForceRefreshKey(prev => prev + 1);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      {pageSize}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Pagination progress indicator */}
              {(() => {
                const currentPage = Math.floor(offset / limit) + 1;
                const totalPages = Math.ceil(data.total_count / limit);
                const progress = (currentPage / totalPages) * 100;
                
                if (totalPages > 1) {
                  return (
                    <div className="w-full max-w-md">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Page {currentPage}</span>
                        <span>of {totalPages}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-center gap-1">
                {(() => {
                  const currentPage = Math.floor(offset / limit) + 1;
                  const totalPages = Math.ceil(data.total_count / limit);
                  
                  if (totalPages <= 1) return null;
                  
                  return (
                    <>
                      {/* First page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="px-2"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Previous page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Quick jump -5 pages (only on desktop if many pages) */}
                      {totalPages > 10 && currentPage > 6 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => goToPage(Math.max(1, currentPage - 5))}
                          className="px-2 text-xs hidden sm:inline-flex"
                          title="Back 5 pages"
                        >
                          -5
                        </Button>
                      )}
                      
                      {/* Page numbers */}
                      {generatePageNumbers(currentPage, totalPages).map((page, index) => (
                        <div key={index}>
                          {page === '...' ? (
                            <span className="px-3 py-1 text-gray-500">...</span>
                          ) : (
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page as number)}
                              className="min-w-[2.5rem]"
                            >
                              {page}
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      {/* Quick jump +5 pages (only on desktop if many pages) */}
                      {totalPages > 10 && currentPage < totalPages - 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => goToPage(Math.min(totalPages, currentPage + 5))}
                          className="px-2 text-xs hidden sm:inline-flex"
                          title="Forward 5 pages"
                        >
                          +5
                        </Button>
                      )}
                      
                      {/* Next page */}
              <Button
                variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2"
                      >
                        <ChevronRight className="h-4 w-4" />
              </Button>
              
                      {/* Last page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-2"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </>
                  );
                })()}
              </div>
              
                            {/* Quick page jump */}
              {(() => {
                const totalPages = data?.total_count ? Math.ceil(data.total_count / limit) : 1;
                if (totalPages > 10) {
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2 text-sm">
                      <span className="text-gray-600">Go to page:</span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={jumpToPage}
                          onChange={(e) => setJumpToPage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleJumpToPage();
                            }
                          }}
                          className="w-20 h-8 text-center"
                          placeholder="#"
                        />
                        <Button
                          size="sm"
                          onClick={handleJumpToPage}
                          disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                        >
                          Go
                        </Button>
                      </div>
                    </div>
                  );
                }
              return null;
              })()}
            </div>
          )}
        </div>
      )}

      {/* Duplicate Program Dialog */}
      <DuplicateProgramDialog
        isOpen={showDuplicateDialog}
        onClose={() => {
          setShowDuplicateDialog(false);
          setProgramToDuplicate(null);
        }}
        program={programToDuplicate}
        onConfirm={handleDuplicateConfirm}
        isLoading={isDuplicating}
      />
    </div>
  );
};

export default ProgramsList;