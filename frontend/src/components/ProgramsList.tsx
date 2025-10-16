import React, { useState, useEffect } from 'react';
import {
  useTerminateProgramMutation,
  usePauseProgramMutation,
  useResumeProgramMutation,
  useDuplicateProgramMutation,
  useUpdateProgramCustomNameMutation,
  useSyncProgramsMutation
} from '../store/api/yelpApi';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
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
import InlineTaskMonitor from './InlineTaskMonitor';
import { BusinessProgram } from '../types/yelp';
import useProgramsSearch from '../hooks/useProgramsSearch';
import {
  buildBusinessOptions,
  filterPrograms,
  formatBusinessOptionLabel,
} from '../lib/programFilters';

const ProgramsList: React.FC = () => {
  const navigate = useNavigate();
  
  // Restore pagination state from sessionStorage
  const savedOffset = sessionStorage.getItem('programsList_offset');
  const savedLimit = sessionStorage.getItem('programsList_limit');
  const savedStatus = sessionStorage.getItem('programsList_status');
  const savedProgramType = sessionStorage.getItem('programsList_programType');
  
  const [offset, setOffset] = useState(savedOffset ? parseInt(savedOffset) : 0);
  const [limit, setLimit] = useState(savedLimit ? parseInt(savedLimit) : 20);
  
  // Активні фільтри (використовуються для запиту)
  const [programStatus, setProgramStatus] = useState(savedStatus || 'CURRENT');
  const [programType, setProgramType] = useState(savedProgramType || 'ALL');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    sessionStorage.getItem('programsList_businessId') || 'all'
  );
  
  // Тимчасові фільтри (редагуються користувачем до натискання "Пошук")
  const [tempProgramStatus, setTempProgramStatus] = useState(savedStatus || 'CURRENT');
  const [tempProgramType, setTempProgramType] = useState(savedProgramType || 'ALL');
  const [tempSelectedBusinessId, setTempSelectedBusinessId] = useState<string>(
    sessionStorage.getItem('programsList_businessId') || 'all'
  );
  
  
  useEffect(() => {
    console.log('🔄 [FILTER-CHANGE] Temp filters changed:', tempProgramStatus, tempProgramType);
  }, [tempProgramStatus, tempProgramType]);

  useEffect(() => {
    console.log('📊 [DEBUG] businessOptions:', businessOptions);
  }, [businessOptions]);
  
  // Функція для застосування фільтрів (викликається кнопкою "Пошук")
  const handleApplyFilters = async () => {
    console.log('🔍 [SEARCH] Applying filters:', {
      status: tempProgramStatus,
      type: tempProgramType,
      business: tempSelectedBusinessId
    });
    await ensureStatus(tempProgramStatus);

    setProgramStatus(tempProgramStatus);
    setProgramType(tempProgramType);
    setSelectedBusinessId(tempSelectedBusinessId);
    setOffset(0);
  };
  
  // State for quick page jump
  const [jumpToPage, setJumpToPage] = useState('');
  
  // Save pagination state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('programsList_offset', offset.toString());
    sessionStorage.setItem('programsList_limit', limit.toString());
    sessionStorage.setItem('programsList_status', programStatus);
    sessionStorage.setItem('programsList_programType', programType);
    sessionStorage.setItem('programsList_businessId', selectedBusinessId);
  }, [offset, limit, programStatus, programType, selectedBusinessId]);

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

  const {
    programs: cachedPrograms,
    totalCount: cachedTotal,
    fetchedAt,
    warning,
    staleCount,
    fromCache,
    isLoading: isLoadingPrograms,
    isFetching: isFetchingPrograms,
    error: programsError,
    refresh: refreshPrograms,
    ensureStatus,
    getCachedEntry,
    isStatusFetching,
    cacheVersion,
  } = useProgramsSearch(programStatus);

  useEffect(() => {
    if (tempProgramStatus !== programStatus) {
      ensureStatus(tempProgramStatus).catch(() => {
        // Prefetch errors surfaced via hook error state
      });
    }
  }, [tempProgramStatus, programStatus, ensureStatus]);

  const allPrograms = cachedPrograms;

  const filteredPrograms = React.useMemo(
    () => filterPrograms(allPrograms, {
      programStatus,
      programType,
      businessId: selectedBusinessId,
    }),
    [allPrograms, programStatus, programType, selectedBusinessId],
  );

  const paginatedPrograms = React.useMemo(
    () => filteredPrograms.slice(offset, offset + limit),
    [filteredPrograms, offset, limit],
  );

  const totalFiltered = filteredPrograms.length;

  useEffect(() => {
    if (offset >= totalFiltered && totalFiltered > 0) {
      const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
      const newOffset = (totalPages - 1) * limit;
      setOffset(newOffset);
    }
  }, [offset, totalFiltered, limit]);

  const goToPage = React.useCallback((page: number) => {
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    setOffset((safePage - 1) * limit);
  }, [totalFiltered, limit]);

  const handleJumpToPage = React.useCallback(() => {
    const pageNumber = parseInt(jumpToPage, 10);
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));

    if (pageNumber && pageNumber >= 1 && pageNumber <= totalPages) {
      goToPage(pageNumber);
      setJumpToPage('');
    }
  }, [jumpToPage, totalFiltered, limit, goToPage]);

  const tempStatusEntry = getCachedEntry(tempProgramStatus);
  const sourceForBusinessOptions = tempProgramStatus === programStatus
    ? allPrograms
    : tempStatusEntry?.programs ?? [];

  const businessOptions = React.useMemo(
    () => buildBusinessOptions(sourceForBusinessOptions, tempProgramType),
    [sourceForBusinessOptions, tempProgramType, cacheVersion],
  );

  const isBusinessOptionsLoading = tempProgramStatus !== programStatus
    ? isStatusFetching(tempProgramStatus) && !tempStatusEntry
    : isFetchingPrograms;

  const totalBusinessOptions = businessOptions.length;
  const filteredOutCount = Math.max(0, cachedPrograms.length - totalFiltered);

  const isLoading = isLoadingPrograms;
  const isFetching = isFetchingPrograms;
  const error = programsError as any;
  const isError = Boolean(programsError);

  // State declarations FIRST (before using them)
  const [terminateProgram] = useTerminateProgramMutation();
  const [pauseProgram] = usePauseProgramMutation();
  const [resumeProgram] = useResumeProgramMutation();
  const [duplicateProgram, { isLoading: isDuplicating }] = useDuplicateProgramMutation();
  const [syncPrograms, { isLoading: isSyncing, data: syncData, error: syncError }] = useSyncProgramsMutation();
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  
  // State for duplicate dialog
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [programToDuplicate, setProgramToDuplicate] = useState<BusinessProgram | null>(null);
  
  // State for active tasks monitoring
  const [activeTasks, setActiveTasks] = useState<Record<string, { jobId: string; taskType: 'terminate' | 'pause' | 'resume' }>>({});
  
  // State for sync progress
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  
  // State for editing custom name
  const [editingCustomName, setEditingCustomName] = useState<string | null>(null);
  const [customNameValue, setCustomNameValue] = useState<string>('');
  
  // Mutation for updating custom name
  const [updateProgramCustomName] = useUpdateProgramCustomNameMutation();
  
  // Track locally terminated programs (for immediate removal)
  // Restore from sessionStorage on mount
  // Removed terminatedProgramIds logic - no more local filtering
  
  // Get credentials from Redux state
  const { username: reduxUsername, password: reduxPassword } = useSelector((state: RootState) => state.auth);
  
  // Fallback to localStorage if Redux state is empty
  const getCredentialsFromStorage = () => {
    try {
      const state = JSON.parse(localStorage.getItem('persist:root') || '{}');
      const authState = state.auth ? JSON.parse(state.auth) : {};
      return {
        username: authState.username || '',
        password: authState.password || ''
      };
    } catch (error) {
      console.error('Error parsing localStorage:', error);
      return { username: '', password: '' };
    }
  };
  
  const { username, password } = reduxUsername && reduxPassword 
    ? { username: reduxUsername, password: reduxPassword }
    : getCredentialsFromStorage();
  
  // Check if user is authenticated
  const isAuthenticated = !!(username && password);
  
  // SSE-based sync with real-time progress
  const handleSyncWithSSE = async (isAutomatic: boolean = false) => {
    try {
      console.log(`🔄 [SSE] ${isAutomatic ? 'Automatic' : 'Manual'} sync triggered`);
      setShowSyncProgress(true);
      setSyncResult({ type: 'start', message: 'Checking for updates...' });
      
      if (!username || !password) {
        console.error('❌ [SSE] No credentials found! Redirecting to login...');
        if (!isAutomatic) {
          alert('Please login first to sync programs');
        }
        navigate('/login');
        return;
      }
      
      // Create EventSource for SSE
      // Note: EventSource doesn't support custom headers, so we need to use fetch with streaming
      const response = await fetch('/api/reseller/programs/sync-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No reader available');
      }
      
      console.log('📡 [SSE] Connected to sync stream');
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ [SSE] Stream completed');
          break;
        }
        
        // Decode chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        // Parse SSE events
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
              console.log('📊 [SSE] Event received:', eventData);
              
              // Update state with progress
              setSyncResult(eventData);
              
              // If complete or error, schedule hiding
              if (eventData.type === 'complete' || eventData.type === 'error') {
                // Refresh business IDs and programs after sync
                setTimeout(() => {
                  refreshPrograms();
                  void ensureStatus(programStatus, { force: true });
                  if (tempProgramStatus !== programStatus) {
                    void ensureStatus(tempProgramStatus, { force: true });
                  }
                  console.log('🔄 [SSE] Refreshing cached programs');
                }, 500);
                
                // Hide progress bar after delay
                setTimeout(() => {
                  setShowSyncProgress(false);
                  setSyncResult(null);
                  console.log('✅ [SSE] Progress bar hidden');
                }, 5000);
              }
              
            } catch (e) {
              console.error('❌ [SSE] Failed to parse event:', e);
            }
          }
        }
      }
      
    } catch (error: any) {
      console.error('❌ [SSE] Sync failed:', error);
      setSyncResult({
        type: 'error',
        message: error?.message || 'Sync failed'
      });
      
      // Hide after error
      setTimeout(() => {
        setShowSyncProgress(false);
        setSyncResult(null);
      }, 5000);
    }
  };
  
  // Manual sync button handler
  const handleSyncClick = () => {
    handleSyncWithSSE(false);
  };
  
  // Auto-sync on component mount
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🚀 [AUTO-SYNC] Component mounted, starting automatic sync...');
      handleSyncWithSSE(true);
    }
  }, []); // Run only once on mount
  
  const programs = paginatedPrograms;

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
      refreshPrograms(); // Refresh programs list
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
      const result = await terminateProgram(programId).unwrap();
      
      // Якщо є job_id - показуємо моніторинг
      if (result?.job_id) {
        setActiveTasks(prev => ({
          ...prev,
          [programId]: { jobId: result.job_id, taskType: 'terminate' }
        }));
        
        toast({
          title: "Program Termination Started",
          description: `Task ${result.job_id} is now being monitored`,
        });
      } else {
        toast({
          title: "Program Terminated",
          description: `Program ${programId} has been terminated`,
        });
        
        // Refresh in background
        setTimeout(() => {
          refreshPrograms();
        }, 3000);
      }
      
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

  const handlePause = async (programId: string) => {
    setLoadingActions(prev => ({ ...prev, [`${programId}-pause`]: true }));
    try {
      const result = await pauseProgram(programId).unwrap();
      
      // Якщо є job_id - показуємо моніторинг
      if (result?.job_id) {
        setActiveTasks(prev => ({
          ...prev,
          [programId]: { jobId: result.job_id, taskType: 'pause' }
        }));
        
        toast({
          title: "Program Pause Started",
          description: `Task ${result.job_id} is now being monitored`,
        });
      } else {
        toast({
          title: "Program Paused",
          description: `Program ${programId} has been paused`,
        });
      }
      
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title: title || "Pause Failed",
        description,
        variant: 'destructive',
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [`${programId}-pause`]: false }));
    }
  };

  const handleResume = async (programId: string) => {
    setLoadingActions(prev => ({ ...prev, [`${programId}-resume`]: true }));
    try {
      const result = await resumeProgram(programId).unwrap();
      
      // Якщо є job_id - показуємо моніторинг
      if (result?.job_id) {
        setActiveTasks(prev => ({
          ...prev,
          [programId]: { jobId: result.job_id, taskType: 'resume' }
        }));
        
        toast({
          title: "Program Resume Started",
          description: `Task ${result.job_id} is now being monitored`,
        });
      } else {
        toast({
          title: "Program Resumed",
          description: `Program ${programId} has been resumed`,
        });
      }
      
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title: title || "Resume Failed",
        description,
        variant: 'destructive',
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [`${programId}-resume`]: false }));
    }
  };

  const handleDuplicateClick = (program: BusinessProgram) => {
    setProgramToDuplicate(program);
    setShowDuplicateDialog(true);
  };
  
  const handleCustomNameEdit = (programId: string, currentName: string | null | undefined) => {
    setEditingCustomName(programId);
    setCustomNameValue(currentName || '');
  };
  
  const handleCustomNameSave = async (programId: string) => {
    try {
      await updateProgramCustomName({
        program_id: programId,
        custom_name: customNameValue.trim() || '',
      }).unwrap();
      
      toast({
        title: "Name Updated",
        description: "Program custom name has been updated successfully",
      });
      
      setEditingCustomName(null);
      refreshPrograms(); // Refresh the list to show new name
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title: title || "Update Failed",
        description,
        variant: 'destructive',
      });
    }
  };
  
  const handleCustomNameCancel = () => {
    setEditingCustomName(null);
    setCustomNameValue('');
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

  // Show main loader only on initial load (not during page switch or business change)
  if (isLoading) {
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
        <div className="flex gap-2">
          {isAuthenticated ? (
            <Button onClick={handleSyncClick} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync Programs'}
            </Button>
          ) : (
            <Button onClick={() => navigate('/login')} variant="outline">
              Login to Sync
            </Button>
          )}
          <Button onClick={() => navigate('/create')}>Create Program</Button>
        </div>
      </div>

      {/* Sync Progress Bar - SSE Version */}
      {showSyncProgress && syncResult && (
        <Card className={
          syncResult.type === 'error'
            ? "border-red-200 bg-red-50"
            : syncResult.type === 'complete' && syncResult.status === 'up_to_date'
            ? "border-green-200 bg-green-50"
            : "border-blue-200 bg-blue-50"
        }>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Loading spinner or checkmark */}
                  {(syncResult.type === 'start' || syncResult.type === 'info' || syncResult.type === 'progress') ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : syncResult.type === 'error' ? (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center bg-red-600">
                      <span className="text-white text-xs">✗</span>
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center bg-green-600">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  
                  <div>
                    <h3 className={`font-semibold ${
                      syncResult.type === 'error' ? 'text-red-900' :
                      syncResult.type === 'complete' ? 'text-green-900' :
                      'text-blue-900'
                    }`}>
                      {/* Display title based on event type */}
                      {syncResult.type === 'start' && '🔄 Starting synchronization...'}
                      {syncResult.type === 'info' && `📊 Found ${syncResult.to_sync || 0} programs to sync`}
                      {syncResult.type === 'progress' && `⏳ Syncing programs... ${syncResult.synced}/${syncResult.total}`}
                      {syncResult.type === 'complete' && syncResult.status === 'up_to_date' && '✅ Already up to date'}
                      {syncResult.type === 'complete' && syncResult.status === 'synced' && `✅ Synced ${syncResult.added} new programs`}
                      {syncResult.type === 'error' && '❌ Sync failed'}
                    </h3>
                    <p className={`text-sm ${
                      syncResult.type === 'error' ? 'text-red-700' :
                      syncResult.type === 'complete' ? 'text-green-700' :
                      'text-blue-700'
                    }`}>
                      {syncResult.message || ''}
                    </p>
                  </div>
                </div>
                
                {/* Show percentage for progress */}
                {syncResult.type === 'progress' && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {syncResult.percentage || 0}%
                    </div>
                    <p className="text-xs text-blue-600">
                      {syncResult.added || 0} new
                    </p>
                  </div>
                )}
              </div>
              
              {/* Progress bar - only show during sync */}
              {syncResult.type === 'progress' && (
                <Progress 
                  value={syncResult.percentage || 0} 
                  className="h-2"
                />
              )}
              
              {/* Details */}
              {syncResult.type === 'progress' && (
                <div className="text-xs text-blue-600">
                  <p>Synchronized {syncResult.synced || 0} of {syncResult.total || 0} programs</p>
                  <p>Added {syncResult.added || 0} new programs</p>
                </div>
              )}
              
              {syncResult.type === 'info' && (
                <div className="text-xs text-blue-600">
                  <p>API Total: {syncResult.total_api || 0} programs</p>
                  <p>Database: {syncResult.total_db || 0} programs</p>
                  {syncResult.to_sync > 0 && <p>Need to sync: {syncResult.to_sync} programs</p>}
                </div>
              )}
              
              {syncResult.type === 'complete' && (
                <div className="text-xs text-green-600">
                  {syncResult.status === 'up_to_date' && <p>All {syncResult.total_synced || 0} programs are already synchronized</p>}
                  {syncResult.status === 'synced' && (
                    <>
                      <p>✅ Successfully added {syncResult.added || 0} new programs</p>
                      <p>Total programs in database: {syncResult.total_synced || 0}</p>
                    </>
                  )}
                </div>
              )}
              
              {syncResult.type === 'error' && (
                <div className="text-xs text-red-600">
                  <p>Error: {syncResult.message}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and pagination */}
      <div>
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded">
          <div className="flex gap-4 items-center flex-wrap">
            <div>
              <label className="text-sm font-medium">Status:</label>
              <select 
                value={tempProgramStatus} 
                onChange={(e) => setTempProgramStatus(e.target.value)}
                className="ml-2 border rounded px-2 py-1"
              >
                <option value="CURRENT">CURRENT</option>
                <option value="PAST">PAST</option>
                <option value="FUTURE">FUTURE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ALL">ALL</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Business:</label>
              <select
                value={tempSelectedBusinessId}
                onChange={(e) => setTempSelectedBusinessId(e.target.value)}
                className="ml-2 border-2 border-gray-300 rounded-lg px-4 py-2 bg-white hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 min-w-[300px] text-sm font-medium shadow-sm"
              >
                <option value="all" className="font-semibold">
                  📊 All Businesses ({totalBusinessOptions})
                </option>
                {isBusinessOptionsLoading && businessOptions.length === 0 && (
                  <option value="loading" disabled>
                    Loading businesses...
                  </option>
                )}
                {businessOptions.map((business) => (
                  <option
                    key={business.id}
                    value={business.id}
                    className="py-2"
                  >
                    🏢 {formatBusinessOptionLabel(business)} ({business.programCount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Program Type:</label>
              <select 
                value={tempProgramType} 
                onChange={(e) => setTempProgramType(e.target.value)}
                className="ml-2 border rounded px-2 py-1"
              >
                <option value="ALL">ALL</option>
                <option value="BP">BP – Branded Profile</option>
                <option value="EP">EP – Enhanced Profile</option>
                <option value="CPC">CPC – Cost Per Click ads</option>
                <option value="RCA">RCA – Remove Competitor Ads</option>
                <option value="CTA">CTA – Call To Action</option>
                <option value="SLIDESHOW">SLIDESHOW – Slideshow</option>
                <option value="BH">BH – Business Highlights</option>
                <option value="VL">VL – Verified License</option>
                <option value="LOGO">LOGO – Logo Feature</option>
                <option value="PORTFOLIO">PORTFOLIO – Portfolio Feature</option>
              </select>
            </div>

            {/* Search button */}
            <Button
              onClick={handleApplyFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2"
              disabled={isLoading || isFetching}
            >
              🔍 Search
            </Button>

          </div>
        </div>
      </div>

      {/* Warning banner for stale programs */}
      {warning && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-900">Stale Programs Detected</h3>
                <p className="text-sm text-yellow-800 mt-1">{warning}</p>
                {typeof staleCount === 'number' && (
                  <p className="text-xs text-yellow-700 mt-2">
                    {staleCount} program{staleCount > 1 ? 's' : ''} in your database no longer exist in the Yelp API.
                  </p>
                )}
              </div>
              <Button
                onClick={handleSyncClick}
                disabled={isSyncing}
                className="flex-shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white"
                size="sm"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {programs.length === 0 && !isLoading && !isFetching ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No programs with status "{programStatus}". Try adjusting the filter or create a new program.
            </p>
          </CardContent>
        </Card>
      ) : programs.length === 0 && (isLoading || isFetching) ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Loading programs...
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Please wait...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Show loader instead of list during background fetching */}
          {(isLoading || isFetching) ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Loading programs...
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Please wait...
                </p>
              </div>
            </div>
          ) : (
            /* List View */
          <div className="grid gap-4">
            {programs.map((program, index) => {
              const isTerminating = loadingActions[`${program.program_id}-terminate`];
              
              return (
              <>
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
                  
                  {/* Custom Name Section */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {editingCustomName === program.program_id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={customNameValue}
                              onChange={(e) => setCustomNameValue(e.target.value)}
                              placeholder="Enter custom name..."
                              className="flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCustomNameSave(program.program_id);
                                } else if (e.key === 'Escape') {
                                  handleCustomNameCancel();
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleCustomNameSave(program.program_id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCustomNameCancel}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <span className="text-xs text-gray-500 uppercase font-semibold">Custom Name:</span>
                              <p className="text-sm font-medium mt-1">
                                {program.custom_name || <span className="text-gray-400 italic">No custom name set</span>}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCustomNameEdit(program.program_id, program.custom_name)}
                              className="ml-auto"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Program ID:</strong>
                        <p className="font-mono text-xs break-all">{program.program_id}</p>
                      </div>
                      <div>
                        <strong>Business:</strong>
                        <div className="flex flex-col gap-1">
                          {program.business_name && (
                            <p className="font-medium text-blue-600">
                              {program.business_url ? (
                                <a 
                                  href={program.business_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-1"
                                >
                                  {program.business_name}
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                program.business_name
                              )}
                            </p>
                          )}
                          <p className="font-mono text-xs text-gray-500 break-all">
                            ID: {program.yelp_business_id || 'N/A'}
                          </p>
                        </div>
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
                      {(() => {
                        // Get budget from metrics (backend enriches data from Yelp API for INACTIVE programs)
                        const budgetInCents = program.program_metrics?.budget || 0;
                        const adCostInCents = program.program_metrics?.ad_cost || 0;
                        const budgetInDollars = budgetInCents / 100;
                        const adCostInDollars = adCostInCents / 100;
                        const spendPercentage = budgetInCents > 0 ? (adCostInCents / budgetInCents) * 100 : 0;
                        
                        return (
                          <>
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
                                  ${adCostInDollars.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {budgetInCents > 0
                                    ? adCostInCents > 0
                                      ? `${spendPercentage.toFixed(1)}% of $${budgetInDollars.toFixed(2)} budget`
                                      : `of $${budgetInDollars.toFixed(2)} budget`
                                    : 'Budget pending'
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Budget Progress Bar - show if we have budget */}
                            {budgetInCents > 0 && (
                              <div className="bg-gray-50 p-3 rounded-lg border">
                                <div className="flex justify-between text-xs mb-2">
                                  <span className="font-medium text-gray-700">Budget Usage</span>
                                  <span className="font-bold text-gray-900">
                                    {spendPercentage.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress 
                                  value={Math.min(100, spendPercentage)} 
                                  className="h-2"
                                />
                                <div className="flex justify-between text-xs mt-2 text-gray-600">
                                  <span>Spent: ${adCostInDollars.toFixed(2)}</span>
                                  <span>Remaining: ${(budgetInDollars - adCostInDollars).toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      
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
                          // Забороняємо terminate тільки для:
                          // 1. TERMINATED/EXPIRED статусів
                          // 2. Програм з end_date в минулому (завершені)
                          program.program_status === 'TERMINATED' ||
                          program.program_status === 'EXPIRED' ||
                          (program.end_date && new Date(program.end_date) < new Date())
                        }
                      >
                        {loadingActions[`${program.program_id}-terminate`] ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        {program.program_status === 'TERMINATED' || 
                         program.program_status === 'EXPIRED' ||
                         (program.end_date && new Date(program.end_date) < new Date()) ? 
                          'Expired' : 'Terminate'
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
              
              {/* Inline Task Monitor */}
              {activeTasks[program.program_id] && (
                <InlineTaskMonitor
                  jobId={activeTasks[program.program_id].jobId}
                  taskType={activeTasks[program.program_id].taskType}
                  onClose={() => {
                    setActiveTasks(prev => {
                      const newState = { ...prev };
                      delete newState[program.program_id];
                      return newState;
                    });
                    // Refetch programs after closing monitor
                    refreshPrograms();
                  }}
                />
              )}
              </>
            );
            })}
          </div>
          )}

          {/* Modern pagination with page numbers */}
          {totalFiltered > 0 && (
            <div className="flex flex-col items-center space-y-4 bg-gray-50 p-4 rounded">
              {/* Results info and quick page size change */}
              <div className="flex flex-col sm:flex-row items-center justify-between w-full space-y-2 sm:space-y-0">
                <div className="text-sm text-gray-600 text-center sm:text-left">
                  Showing {programs.length} of {totalFiltered} matching programs
                  {filteredOutCount > 0 && (
                    <span className="text-orange-600 font-medium ml-1">({filteredOutCount} filtered out)</span>
                  )}
                  {cachedTotal && cachedTotal !== totalFiltered && (
                    <span className="text-gray-500 ml-1">• Synced total: {cachedTotal}</span>
                  )}
                  {fromCache && (
                    <span className="text-xs text-gray-500 block sm:inline sm:ml-1">(served from local cache)</span>
                  )}
                  {fetchedAt && (
                    <span className="hidden sm:inline text-gray-500"> • Page {Math.floor(offset / limit) + 1} of {Math.max(1, Math.ceil(totalFiltered / limit))}</span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Per page:</span>
                  {[10, 20, 50].map((pageSize) => (
                    <Button
                      key={pageSize}
                      variant={limit === pageSize ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setLimit(pageSize);
                        setOffset(0);
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
                const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
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
                  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));

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

              {/* Quick Jump Input with "Go" button */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max={Math.max(1, Math.ceil(totalFiltered / limit))}
                  placeholder="Jump to..."
                  value={jumpToPage}
                  onChange={(e) => setJumpToPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && jumpToPage) {
                      const page = parseInt(jumpToPage, 10);
                      const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
                      if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
                        goToPage(page);
                        setJumpToPage('');
                      }
                    }
                  }}
                  className="w-24 h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (jumpToPage) {
                      const page = parseInt(jumpToPage, 10);
                      const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
                      if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
                        goToPage(page);
                        setJumpToPage('');
                      }
                    }
                  }}
                  disabled={!jumpToPage || Number.isNaN(parseInt(jumpToPage, 10)) || parseInt(jumpToPage, 10) < 1 || parseInt(jumpToPage, 10) > Math.max(1, Math.ceil(totalFiltered / limit))}
                  className="h-8 px-3 text-xs"
                >
                  Go
                </Button>
              </div>
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
