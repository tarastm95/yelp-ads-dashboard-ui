import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetScheduledBudgetUpdatesQuery,
  useCancelScheduledBudgetUpdateMutation,
  useSyncProgramsMutation,
  yelpApi
} from '../store/api/yelpApi';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle, Calendar, Timer, DollarSign, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ScheduledBudgetUpdates: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data, isLoading, error, refetch } = useGetScheduledBudgetUpdatesQuery();
  
  const [syncPrograms, { isLoading: isSyncing }] = useSyncProgramsMutation();
  const [cancelScheduledBudgetUpdate] = useCancelScheduledBudgetUpdateMutation();
  
  // State for sync progress
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  
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
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              setSyncResult(data);
              
              // If complete or error, close after delay
              if (data.type === 'complete' || data.type === 'error') {
                console.log(`✅ [SSE] Sync ${data.type}:`, data);
                
                // Invalidate queries to refresh data
                dispatch(yelpApi.util.invalidateTags(['Program', 'ScheduledBudgetUpdate']));
                
                // Refresh scheduled budget updates data
                refetch();
                
                const hideDelay = data.type === 'error' ? 10000 : 5000;
                setTimeout(() => {
                  setShowSyncProgress(false);
                  setSyncResult(null);
                }, hideDelay);
                
                // Close reader
                reader.cancel();
                return;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line, e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('❌ [SSE] Sync error:', error);
      setSyncResult({
        type: 'error',
        message: error.message || 'Failed to sync programs'
      });
      
      const hideDelay = 10000;
      setTimeout(() => {
        setShowSyncProgress(false);
        setSyncResult(null);
      }, hideDelay);
    }
  };
  
  // Manual sync button handler
  const handleSyncClick = () => {
    handleSyncWithSSE(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'EXECUTED':
        return (
          <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Executed
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-gray-50 border-gray-300 text-gray-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading scheduled budget updates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500 mb-2">Error loading scheduled budget updates</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const updates = data?.results || [];
  const pendingUpdates = updates.filter(p => p.status === 'PENDING');
  const executedUpdates = updates.filter(p => p.status === 'EXECUTED');
  const failedUpdates = updates.filter(p => p.status === 'FAILED');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <DollarSign className="mr-2" />
            Scheduled Budget Updates
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track the status of budget updates scheduled for future execution
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
          <Button onClick={() => refetch()} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Sync Progress Bar */}
      {showSyncProgress && syncResult && (
        <Card className={
          syncResult.type === 'error'
            ? "border-red-200 bg-red-50"
            : syncResult.type === 'complete' && syncResult.status === 'up_to_date'
            ? "border-blue-200 bg-blue-50"
            : "border-green-200 bg-green-50"
        }>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(syncResult.type === 'start' || syncResult.type === 'info' || syncResult.type === 'progress') ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : syncResult.type === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  <h3 className={
                    syncResult.type === 'error' ? 'text-red-900' :
                    syncResult.type === 'complete' ? 'text-green-900' :
                    'text-blue-900'
                  }>
                    {syncResult.type === 'start' && 'Starting Synchronization'}
                    {syncResult.type === 'info' && `Found ${syncResult.to_sync || 0} programs to sync`}
                    {syncResult.type === 'progress' && 'Syncing Programs'}
                    {syncResult.type === 'complete' && syncResult.status === 'up_to_date' && 'Already Up to Date'}
                    {syncResult.type === 'complete' && syncResult.status === 'synced' && 'Sync Complete'}
                    {syncResult.type === 'error' && 'Sync Failed'}
                  </h3>
                </div>
              </div>
              
              {syncResult.type === 'progress' && (
                <div className="space-y-2">
                  <Progress 
                    value={syncResult.total ? (syncResult.synced / syncResult.total) * 100 : 0} 
                    className="h-2"
                  />
                  <div className="text-xs text-blue-600 font-medium">
                    {syncResult.synced} / {syncResult.total} programs
                  </div>
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

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingUpdates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Executed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{executedUpdates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedUpdates.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Updates List */}
      {updates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">
                No scheduled budget updates
              </p>
              <p className="text-sm text-gray-500">
                You haven't scheduled any budget updates yet
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => {
            const scheduledDate = new Date(update.scheduled_datetime);
            const executedDate = update.executed_at ? new Date(update.executed_at) : null;
            
            return (
              <Card key={update.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {update.program_info.program_name}
                        {getStatusBadge(update.status)}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1 font-mono">
                        Program ID: {update.program_id}
                      </p>
                      {update.program_info.business_name && (
                        <p className="text-sm text-gray-600 mt-1">
                          Business: {update.program_info.business_name}
                        </p>
                      )}
                    </div>
                    {update.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await cancelScheduledBudgetUpdate({ update_id: update.id }).unwrap();
                            toast({
                              title: 'Schedule Cancelled',
                              description: 'The scheduled budget update has been cancelled successfully',
                            });
                            refetch();
                          } catch (error: any) {
                            toast({
                              title: 'Failed to Cancel',
                              description: error.data?.error || error.message || 'Failed to cancel scheduled budget update',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="ml-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {update.new_budget && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">New Budget:</span>
                        <span className="font-semibold text-lg">
                          ${update.new_budget.toFixed(2)}
                        </span>
                        {update.program_info.current_budget && (
                          <span className="text-gray-400">
                            (Current: ${update.program_info.current_budget.toFixed(2)})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {update.is_autobid !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Bidding Strategy:</span>
                        <span className="font-semibold">
                          {update.is_autobid ? 'Automatic' : 'Manual'}
                        </span>
                      </div>
                    )}
                    
                    {update.max_bid && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Max Bid per Click:</span>
                        <span className="font-semibold">
                          ${update.max_bid.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    {update.pacing_method && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Pacing Method:</span>
                        <span className="font-semibold">
                          {update.pacing_method}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Scheduled for:</span>
                      <span className="font-semibold">
                        {scheduledDate.toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Countdown Timer - only for PENDING status */}
                    <CountdownTimer targetDate={scheduledDate} status={update.status} />

                    {executedDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600">Executed:</span>
                        <span className="font-semibold">
                          {executedDate.toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    {update.error_message && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <strong>Error:</strong> {update.error_message}
                        </p>
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mt-2">
                      Created: {new Date(update.created_at).toLocaleString('en-US')}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t mt-4 pt-4">
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 hover:border-purple-500 hover:bg-purple-50 transition-all font-medium h-9 text-sm"
                        onClick={() => navigate(`/schedule-budget-update/${update.program_id}`)}
                        disabled={!update.program_id}
                      >
                        Schedule Another Update
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium h-9 text-sm"
                        onClick={() => navigate(`/edit/${update.program_id}`)}
                        disabled={!update.program_id}
                      >
                        Edit Program
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium h-9 text-sm"
                        onClick={() => navigate(`/program-info/${update.program_id}`)}
                        disabled={!update.program_id}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Countdown Timer Component
const CountdownTimer: React.FC<{ targetDate: Date; status: string }> = ({ targetDate, status }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    // Only show countdown for PENDING status
    if (status !== 'PENDING') {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate, status]);

  // Don't show countdown if status is not PENDING or time has passed
  if (status !== 'PENDING' || !timeLeft || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0)) {
    return null;
  }

  const TimeUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg px-3 py-2 min-w-[70px] shadow-sm">
      <div className="text-2xl font-bold text-purple-700 leading-none">{String(value).padStart(2, '0')}</div>
      <div className="text-xs font-semibold text-purple-600 uppercase mt-1 tracking-wide">{label}</div>
    </div>
  );

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 via-purple-50 to-fuchsia-50 border-2 border-purple-200 rounded-xl shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-5 h-5 text-purple-600 animate-pulse" />
        <h4 className="text-sm font-bold text-purple-800 uppercase tracking-wide">Time Until Update</h4>
      </div>
      <div className="flex items-center justify-center gap-2">
        {timeLeft.days > 0 && <TimeUnit value={timeLeft.days} label="Days" />}
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <div className="text-2xl font-bold text-purple-400 mx-1">:</div>
        <TimeUnit value={timeLeft.minutes} label="Minutes" />
        <div className="text-2xl font-bold text-purple-400 mx-1">:</div>
        <TimeUnit value={timeLeft.seconds} label="Seconds" />
      </div>
    </div>
  );
};

export default ScheduledBudgetUpdates;

