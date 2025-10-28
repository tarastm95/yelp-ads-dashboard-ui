import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useTerminateProgramMutation,
  usePauseProgramMutation,
  useResumeProgramMutation,
  useDuplicateProgramMutation,
  useUpdateProgramCustomNameMutation,
  useSyncProgramsMutation,
  useGetAvailableFiltersQuery,  // 🧠 NEW: Smart Filters
  useGetProgramFeaturesQuery,
  yelpApi
} from '../store/api/yelpApi';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit, Square, Play, Trash2, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, DollarSign, MousePointer, Eye, TrendingUp, Clock, Sparkles } from 'lucide-react';
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
import { useDebouncedCallback } from 'use-debounce';
import ProgramSkeleton from './ProgramSkeleton';

// Component to display active features for a program
const ActiveFeatures: React.FC<{ programId: string }> = ({ programId }) => {
  const { data, isLoading } = useGetProgramFeaturesQuery(programId, {
    skip: !programId,
  });

  // Function to determine if a feature is active (same logic as ProgramFeatures.tsx)
  const isFeatureActive = (featureType: string, featureData: any): boolean => {
    if (!featureData) return false;
    
    switch (featureType) {
      case 'CUSTOM_RADIUS_TARGETING':
        return featureData.custom_radius !== null && featureData.custom_radius !== undefined;
      case 'CALL_TRACKING':
        return featureData.enabled === true;
      case 'LINK_TRACKING':
        return !!(featureData.website || featureData.menu || featureData.url);
      case 'CUSTOM_LOCATION_TARGETING':
        return featureData.businesses?.some((b: any) => b.locations?.length > 0) || false;
      case 'NEGATIVE_KEYWORD_TARGETING':
        return featureData.blocked_keywords?.length > 0 || false;
      case 'STRICT_CATEGORY_TARGETING':
        return featureData.enabled === true;
      case 'AD_SCHEDULING':
        return featureData.uses_opening_hours === true;
      case 'CUSTOM_AD_TEXT':
        return !!(featureData.custom_text || featureData.custom_review_id);
      case 'CUSTOM_AD_PHOTO':
        return !!featureData.custom_photo_id;
      case 'AD_GOAL':
        return featureData.ad_goal !== 'DEFAULT';
      case 'BUSINESS_LOGO':
        return !!featureData.business_logo_url;
      case 'YELP_PORTFOLIO':
        return featureData.projects?.length > 0 || false;
      case 'BUSINESS_HIGHLIGHTS':
        return featureData.active_business_highlights?.length > 0 || false;
      case 'VERIFIED_LICENSE':
        return featureData.licenses?.length > 0 || false;
      case 'SERVICE_OFFERINGS_TARGETING':
        return featureData.enabled_service_offerings?.length > 0 || false;
      default:
        return true;
    }
  };

  if (isLoading || !data) return null;

  const features = data.features || {};
  const activeFeatures = Object.keys(features).filter(featureType => 
    isFeatureActive(featureType, features[featureType])
  );

  if (activeFeatures.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="text-center mb-2">
        <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
          Active Features ({activeFeatures.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2 justify-center items-center">
        {activeFeatures.map((featureType) => (
          <Badge 
            key={featureType} 
            variant="outline" 
            className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100 px-2.5 py-1 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1 inline" />
            {featureType.replace(/_/g, ' ')}
          </Badge>
        ))}
      </div>
    </div>
  );
};

const ProgramsList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
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
  
  // ⚠️ ВАЖЛИВО: Завжди починаємо з 'all', щоб не фільтрувати по business_id з попереднього сеансу
  // Якщо БД порожня (перша синхронізація), фільтр залишиться 'all'
  // Якщо БД непорожня, користувач зможе вибрати конкретний бізнес вручну
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  
  // Тимчасові фільтри (редагуються користувачем до натискання "Пошук")
  const [tempProgramStatus, setTempProgramStatus] = useState(savedStatus || 'CURRENT');
  const [tempProgramType, setTempProgramType] = useState(savedProgramType || 'ALL');
  const [tempSelectedBusinessId, setTempSelectedBusinessId] = useState<string>('all');
  
  // Debug: Log initial business filter
  useEffect(() => {
    console.log(`🔍 [MOUNT] Initial business filter: "${selectedBusinessId}" (always 'all' to prevent filtering on first load)`);
  }, []);
  
  useEffect(() => {
    console.log('🔄 [FILTER-CHANGE] Temp filters changed:', tempProgramStatus, tempProgramType);
  }, [tempProgramStatus, tempProgramType]);
  
  // Функція для застосування фільтрів (викликається кнопкою "Пошук")
  const handleApplyFilters = async () => {
    console.log('🔍 [SEARCH] Applying filters:', {
      status: tempProgramStatus,
      type: tempProgramType,
      business: tempSelectedBusinessId
    });
    
    // Це НЕ початкове завантаження, а пошук через кнопку Search
    setIsInitialPageLoad(false);
    
    // ✅ ALWAYS sync when user clicks Search button (they expect fresh data)
    console.log('🔄 [SYNC] User clicked Search - syncing to get fresh data...');
    setIsInitialSyncRequired(true);
    setIsInitialSyncComplete(false);
    await handleSyncWithSSE(false);
    
    // Update last sync time
    const now = Date.now();
    localStorage.setItem('lastSyncTime', now.toString());
    
    // Після синхронізації застосовуємо фільтри
    await ensureStatus(tempProgramStatus);

    setProgramStatus(tempProgramStatus);
    setProgramType(tempProgramType);
    setSelectedBusinessId(tempSelectedBusinessId);
    setOffset(0);
  };
  
  // State for quick page jump
  const [jumpToPage, setJumpToPage] = useState('');
  
  // ✅ OPTIMIZED: Debounced sessionStorage writes (500ms delay)
  const debouncedSaveState = useDebouncedCallback(
    (state: { offset: number; limit: number; status: string; programType: string; businessId: string }) => {
      sessionStorage.setItem('programsList_offset', state.offset.toString());
      sessionStorage.setItem('programsList_limit', state.limit.toString());
      sessionStorage.setItem('programsList_status', state.status);
      sessionStorage.setItem('programsList_programType', state.programType);
      sessionStorage.setItem('programsList_businessId', state.businessId);
    },
    500 // 500ms delay - only save after user stops changing filters
  );
  
  // Save pagination state to sessionStorage whenever it changes (debounced)
  useEffect(() => {
    debouncedSaveState({ 
      offset, 
      limit, 
      status: programStatus, 
      programType, 
      businessId: selectedBusinessId 
    });
  }, [offset, limit, programStatus, programType, selectedBusinessId, debouncedSaveState]);

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
    () => {
      console.log('🔍 [ProgramsList] Filtering programs:', {
        allProgramsCount: allPrograms.length,
        filters: { programStatus, programType, businessId: selectedBusinessId }
      });
      
      const filtered = filterPrograms(allPrograms, {
        programStatus,
        programType,
        businessId: selectedBusinessId,
      });
      
      console.log('🔍 [ProgramsList] Filter result:', {
        filteredCount: filtered.length,
        sample: filtered.slice(0, 3).map(p => ({
          program_id: p.program_id,
          program_status: p.program_status,
          program_type: p.program_type,
          yelp_business_id: p.yelp_business_id
        }))
      });
      
      return filtered;
    },
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

  // 🧠 РОЗУМНІ ФІЛЬТРИ: API запит для отримання доступних опцій
  const { data: availableFiltersData, isLoading: isLoadingAvailableFilters } = useGetAvailableFiltersQuery({
    programStatus: tempProgramStatus,
    programType: tempProgramType,
    businessId: tempSelectedBusinessId,
  });

  // Логування відповіді від API
  useEffect(() => {
    if (availableFiltersData) {
      console.log('🧠 [SMART FILTER API] Response:', {
        totalPrograms: availableFiltersData.total_programs,
        statusesCount: availableFiltersData.statuses.length,
        programTypesCount: availableFiltersData.program_types.length,
        businessesCount: availableFiltersData.businesses.length,
        appliedFilters: availableFiltersData.applied_filters
      });
    }
  }, [availableFiltersData]);

  // 🧠 РОЗУМНІ ФІЛЬТРИ: Використовуємо дані з API (замість frontend фільтрації)
  const availableFilters = React.useMemo(() => {
    if (!availableFiltersData) {
      // Fallback: показуємо всі опції поки API не відповість
      return {
        statuses: ['ALL', 'CURRENT', 'PAST', 'FUTURE', 'PAUSED'],
        programTypes: ['ALL', 'BP', 'EP', 'CPC', 'RCA', 'CTA', 'SLIDESHOW', 'BH', 'VL', 'LOGO', 'PORTFOLIO'],
        businesses: ['all'],
        totalAvailable: 0,
      };
    }

    // Маппимо дані з API до старого формату
    return {
      statuses: availableFiltersData.statuses,
      programTypes: availableFiltersData.program_types,
      businesses: ['all', ...availableFiltersData.businesses.map(b => b.business_id)],
      totalAvailable: availableFiltersData.total_programs,
    };
  }, [availableFiltersData]);

  // Перевірка чи є програми для поточної комбінації фільтрів
  const hasAvailablePrograms = React.useMemo(() => {
    return availableFilters.totalAvailable > 0 || allPrograms.length === 0;
  }, [availableFilters.totalAvailable, allPrograms.length]);

  const isLoading = isLoadingPrograms;
  const isFetching = isFetchingPrograms;
  const error = programsError as any;
  const isError = Boolean(programsError);

  // Debug logs for ProgramsList state (після оголошення isLoading, isFetching, error)
  useEffect(() => {
    console.log('📊 [ProgramsList] State update:', {
      programStatus,
      tempProgramStatus,
      allProgramsCount: allPrograms.length,
      cachedProgramsCount: cachedPrograms.length,
      totalFiltered,
      totalBusinessOptions: businessOptions.length,
      isLoading,
      isFetching,
      error: !!error,
      cacheVersion
    });
  }, [programStatus, tempProgramStatus, allPrograms.length, cachedPrograms.length, totalFiltered, businessOptions.length, isLoading, isFetching, error, cacheVersion]);

  useEffect(() => {
    console.log('📊 [ProgramsList] Programs data:', {
      allPrograms: allPrograms.slice(0, 3).map(p => ({
        program_id: p.program_id,
        yelp_business_id: p.yelp_business_id,
        business_name: p.business_name,
        custom_name: p.custom_name
      })),
      totalCount: allPrograms.length
    });
  }, [allPrograms]);

  // Debug log for businessOptions
  useEffect(() => {
    console.log('📊 [DEBUG] businessOptions:', businessOptions.slice(0, 5));
  }, [businessOptions]);

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
  const [isInitialSyncRequired, setIsInitialSyncRequired] = useState(true);
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false);
  const [isInitialPageLoad, setIsInitialPageLoad] = useState(true); // Флаг для відрізнення початкового завантаження від Search
  
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
  
  // 🔍 DEBUG: Логування credentials state
  useEffect(() => {
    console.log('🔐 [ProgramsList] Credentials state:', {
      fromRedux: !!(reduxUsername && reduxPassword),
      fromStorage: !(reduxUsername && reduxPassword),
      hasUsername: !!username,
      hasPassword: !!password,
      username: username ? `${username.substring(0, 10)}...` : 'empty'
    });
  }, [username, password, reduxUsername, reduxPassword]);
  
  // Check if user is authenticated
  const isAuthenticated = !!(username && password);
  
  // SSE-based sync with real-time progress
  const handleSyncWithSSE = async (isAutomatic: boolean = false) => {
    try {
      console.log(`🔄 [SSE] ${isAutomatic ? 'Automatic' : 'Manual'} sync triggered`);
      console.log(`🔄 [SSE] Current state before sync:`, {
        allProgramsCount: allPrograms.length,
        programStatus,
        isLoading,
        isFetching
      });
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
                console.log(`🔄 [SSE] Sync ${eventData.type}:`, eventData);
                
                // Mark initial sync as complete
                setIsInitialSyncComplete(true);
                setIsInitialSyncRequired(false);
                
                // Refresh business IDs and programs after sync
                // ⚠️ ВАЖЛИВО: Чекаємо поки credentials будуть доступні!
                const waitForCredentialsAndRefresh = () => {
                  // Перевіряємо чи є credentials
                  if (!username || !password) {
                    console.log('⏳ [SSE] Waiting for credentials before refresh...', {
                      hasUsername: !!username,
                      hasPassword: !!password
                    });
                    // Retry через 500ms
                    setTimeout(waitForCredentialsAndRefresh, 500);
                    return;
                  }
                  
                  console.log(`🔄 [SSE] Refreshing data after sync with credentials...`);
                  console.log(`🔄 [SSE] Before refresh:`, {
                    allProgramsCount: allPrograms.length,
                    programStatus,
                    tempProgramStatus,
                    hasCredentials: true
                  });
                  
                  // ⚡ ВАЖЛИВО: Invalidate RTK Query cache перед refresh
                  // Це потрібно щоб RTK Query не використовував старі закешовані параметри (business_id)
                  console.log('🔄 [SSE] Invalidating RTK Query cache...');
                  dispatch(yelpApi.util.invalidateTags(['Program']));
                  
                  // Даємо час для invalidate перед refresh (50ms)
                  setTimeout(() => {
                    refreshPrograms();
                    void ensureStatus(programStatus, { force: true });
                    if (tempProgramStatus !== programStatus) {
                      void ensureStatus(tempProgramStatus, { force: true });
                    }
                    console.log('🔄 [SSE] Refreshing cached programs');
                  }, 50);
                };
                
                // Запускаємо через 500ms (щоб дати час Redux persist завантажити state)
                setTimeout(waitForCredentialsAndRefresh, 500);
                
                // Якщо це початкове завантаження сторінки - приховуємо прогрес одразу
                // Якщо це синхронізація через Search - показуємо результат 5 секунд
                if (isInitialPageLoad) {
                  // Початкове завантаження - приховуємо одразу після завершення
                  setTimeout(() => {
                    setShowSyncProgress(false);
                    setSyncResult(null);
                    console.log('✅ [SSE] Initial page load sync completed - hiding progress immediately');
                  }, 500);
                } else {
                  // Синхронізація через Search - показуємо результат 5 секунд
                  setTimeout(() => {
                    setShowSyncProgress(false);
                    setSyncResult(null);
                    console.log('✅ [SSE] Search sync completed - hiding progress after 5s');
                  }, 5000);
                }
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
      
      // Mark sync as complete even on error
      setIsInitialSyncComplete(true);
      setIsInitialSyncRequired(false);
      
      // Якщо це початкове завантаження - приховуємо швидше
      // Якщо це Search - показуємо помилку довше
      const hideDelay = isInitialPageLoad ? 2000 : 5000;
      
      // Hide after error
      setTimeout(() => {
        setShowSyncProgress(false);
        setSyncResult(null);
      }, hideDelay);
    }
  };
  
  // Manual sync button handler
  const handleSyncClick = () => {
    setIsInitialPageLoad(false); // Мануальна синхронізація - показуємо результат
    handleSyncWithSSE(false);
  };
  
  // Track changes after sync completion
  useEffect(() => {
    if (isInitialSyncComplete && !isLoading && !isFetching) {
      console.log(`📊 [ProgramsList] After sync completion:`, {
        allProgramsCount: allPrograms.length,
        cachedProgramsCount: cachedPrograms.length,
        filteredCount: filteredPrograms.length,
        paginatedCount: paginatedPrograms.length,
        businessOptionsCount: businessOptions.length,
        programStatus,
        tempProgramStatus
      });
    }
  }, [isInitialSyncComplete, isLoading, isFetching, allPrograms.length, cachedPrograms.length, filteredPrograms.length, paginatedPrograms.length, businessOptions.length, programStatus, tempProgramStatus]);

  // Auto-sync on component mount - ALWAYS sync when page loads
  useEffect(() => {
    if (isAuthenticated) {
      // ✅ ALWAYS sync when user visits /programs page (they expect fresh data)
      console.log('🚀 [AUTO-SYNC] Component mounted - syncing to get fresh data...');
      setIsInitialSyncRequired(true);
      setIsInitialSyncComplete(false);
      setShowSyncProgress(true);
      handleSyncWithSSE(true).then(() => {
        localStorage.setItem('lastSyncTime', Date.now().toString());
      });
    } else {
      // If not authenticated, allow showing programs without sync
      setIsInitialSyncRequired(false);
      setIsInitialSyncComplete(true);
    }
  }, []); // Run only once on mount
  
  // ✅ OPTIMIZED: Memoize programs to prevent unnecessary re-renders
  const programs = useMemo(() => paginatedPrograms, [paginatedPrograms]);

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

  // Show sync progress if initial sync is required and not complete
  if (isInitialSyncRequired && !isInitialSyncComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
        <div className="w-full max-w-2xl">
          {/* Sync Progress - Centered Design */}
          {syncResult ? (
            <Card className={`shadow-2xl border-0 ${
              syncResult.type === 'error'
                ? "bg-gradient-to-br from-red-50 to-red-100"
                : syncResult.type === 'complete' && syncResult.status === 'up_to_date'
                ? "bg-gradient-to-br from-green-50 to-green-100"
                : "bg-gradient-to-br from-blue-50 to-indigo-100"
            }`}>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Icon and Title - Centered */}
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Large animated icon */}
                    <div className={`relative ${
                      (syncResult.type === 'start' || syncResult.type === 'info' || syncResult.type === 'progress') 
                        ? 'animate-pulse' 
                        : ''
                    }`}>
                      {(syncResult.type === 'start' || syncResult.type === 'info' || syncResult.type === 'progress') ? (
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                          <Loader2 className="h-16 w-16 animate-spin text-blue-600 relative z-10" />
                        </div>
                      ) : syncResult.type === 'error' ? (
                        <div className="h-16 w-16 rounded-full flex items-center justify-center bg-red-600 shadow-lg">
                          <span className="text-white text-3xl">✗</span>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-full flex items-center justify-center bg-green-600 shadow-lg animate-bounce">
                          <span className="text-white text-3xl">✓</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Title */}
                    <div className="space-y-2">
                      <h3 className={`text-2xl font-bold ${
                        syncResult.type === 'error' ? 'text-red-900' :
                        syncResult.type === 'complete' ? 'text-green-900' :
                        'text-blue-900'
                      }`}>
                        {syncResult.type === 'start' && 'Starting Synchronization'}
                        {syncResult.type === 'info' && `Found ${syncResult.to_sync || 0} programs to sync`}
                        {syncResult.type === 'progress' && 'Syncing Programs'}
                        {syncResult.type === 'complete' && syncResult.status === 'up_to_date' && 'Already Up to Date'}
                        {syncResult.type === 'complete' && syncResult.status === 'synced' && 'Sync Complete'}
                        {syncResult.type === 'error' && 'Sync Failed'}
                      </h3>
                      
                      {/* Subtitle */}
                      <p className={`text-base ${
                        syncResult.type === 'error' ? 'text-red-700' :
                        syncResult.type === 'complete' ? 'text-green-700' :
                        'text-blue-700'
                      }`}>
                        {syncResult.type === 'progress' && (
                          <span className="font-semibold">
                            {syncResult.synced} / {syncResult.total} programs
                          </span>
                        )}
                        {syncResult.message && syncResult.type !== 'progress' && syncResult.message}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress percentage - Large display */}
                  {syncResult.type === 'progress' && (
                    <div className="text-center">
                      <div className="text-5xl font-bold text-blue-600 mb-2">
                        {syncResult.percentage || 0}%
                      </div>
                      <p className="text-sm text-blue-600 font-medium">
                        {syncResult.added || 0} new programs added
                      </p>
                    </div>
                  )}
                  
                  {/* Progress bar - Modern design */}
                  {syncResult.type === 'progress' && (
                    <div className="space-y-3">
                      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out rounded-full shadow-lg"
                          style={{ width: `${syncResult.percentage || 0}%` }}
                        >
                          <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex justify-between text-xs text-gray-600 font-medium">
                        <span>Synchronized: {syncResult.synced}</span>
                        <span>Total: {syncResult.total}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Additional info */}
                  {syncResult.type === 'info' && (
                    <div className="text-center space-y-2 text-sm text-blue-700">
                      {syncResult.total_api && <p>API Total: {syncResult.total_api} programs</p>}
                      {syncResult.total_db !== undefined && <p>Database: {syncResult.total_db} programs</p>}
                    </div>
                  )}
                  
                  {syncResult.type === 'complete' && (
                    <div className="text-center space-y-1 text-sm text-green-700 font-medium">
                      {syncResult.status === 'synced' && (
                        <>
                          <p>✅ Successfully added {syncResult.added || 0} new programs</p>
                          <p>Total programs in database: {syncResult.total_synced || 0}</p>
                        </>
                      )}
                      {syncResult.status === 'up_to_date' && (
                        <p>All {syncResult.total_synced || 0} programs are synchronized</p>
                      )}
                    </div>
                  )}
                  
                  {syncResult.type === 'error' && (
                    <div className="text-center text-sm text-red-700 bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="font-medium">Error: {syncResult.message}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-blue-50 to-indigo-100">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <Loader2 className="h-16 w-16 animate-spin text-blue-600 relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-2">Initializing</h3>
                    <p className="text-blue-700">Preparing synchronization...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

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

      {/* Filters - Modern Design */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-lg">📊</span>
                Status:
              </label>
              <select 
                value={tempProgramStatus} 
                onChange={(e) => setTempProgramStatus(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-white hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm font-medium shadow-sm cursor-pointer"
              >
                <option value="ALL">ALL</option>
                <option value="CURRENT" disabled={!availableFilters.statuses.includes('CURRENT')} className={!availableFilters.statuses.includes('CURRENT') ? 'text-gray-400' : ''}>
                  CURRENT {!availableFilters.statuses.includes('CURRENT') && '(No programs)'}
                </option>
                <option value="PAST" disabled={!availableFilters.statuses.includes('PAST')} className={!availableFilters.statuses.includes('PAST') ? 'text-gray-400' : ''}>
                  PAST {!availableFilters.statuses.includes('PAST') && '(No programs)'}
                </option>
                <option value="FUTURE" disabled={!availableFilters.statuses.includes('FUTURE')} className={!availableFilters.statuses.includes('FUTURE') ? 'text-gray-400' : ''}>
                  FUTURE {!availableFilters.statuses.includes('FUTURE') && '(No programs)'}
                </option>
                <option value="PAUSED" disabled={!availableFilters.statuses.includes('PAUSED')} className={!availableFilters.statuses.includes('PAUSED') ? 'text-gray-400' : ''}>
                  PAUSED {!availableFilters.statuses.includes('PAUSED') && '(No programs)'}
                </option>
              </select>
            </div>

            {/* Business Filter */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-lg">🏢</span>
                Business:
              </label>
              <Select
                value={tempSelectedBusinessId}
                onValueChange={setTempSelectedBusinessId}
              >
                <SelectTrigger className="w-full h-11 border-2 border-gray-300 rounded-lg px-4 bg-white hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm font-medium shadow-sm">
                  <SelectValue placeholder="Select business">
                    {tempSelectedBusinessId === 'all' ? (
                      <span className="font-semibold">📊 All Businesses ({totalBusinessOptions})</span>
                    ) : (
                      <span>
                        {businessOptions.find(b => b.id === tempSelectedBusinessId) 
                          ? `${formatBusinessOptionLabel(businessOptions.find(b => b.id === tempSelectedBusinessId)!)} • ${businessOptions.find(b => b.id === tempSelectedBusinessId)!.programCount} programs`
                          : tempSelectedBusinessId
                        }
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[400px] overflow-y-auto">
                  <SelectItem value="all" className="font-semibold cursor-pointer">
                    📊 All Businesses ({totalBusinessOptions})
                  </SelectItem>
                  {isBusinessOptionsLoading && businessOptions.length === 0 && (
                    <SelectItem value="loading" disabled>
                      Loading businesses...
                    </SelectItem>
                  )}
                  {businessOptions.map((business) => {
                    const isAvailable = availableFilters.businesses.includes(business.id);
                    return (
                      <SelectItem
                        key={business.id}
                        value={business.id}
                        disabled={!isAvailable}
                        className={`cursor-pointer py-2 ${!isAvailable ? 'opacity-50 text-gray-400' : ''}`}
                      >
                        {formatBusinessOptionLabel(business)} • {business.programCount} programs
                        {!isAvailable && ' (No programs for selected filters)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Program Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-lg">🎯</span>
                Program Type:
              </label>
              <select 
                value={tempProgramType} 
                onChange={(e) => setTempProgramType(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-white hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm font-medium shadow-sm cursor-pointer"
              >
                <option value="ALL">ALL</option>
                <option value="BP" disabled={!availableFilters.programTypes.includes('BP')} className={!availableFilters.programTypes.includes('BP') ? 'text-gray-400' : ''}>
                  BP – Branded Profile {!availableFilters.programTypes.includes('BP') && '(No programs)'}
                </option>
                <option value="EP" disabled={!availableFilters.programTypes.includes('EP')} className={!availableFilters.programTypes.includes('EP') ? 'text-gray-400' : ''}>
                  EP – Enhanced Profile {!availableFilters.programTypes.includes('EP') && '(No programs)'}
                </option>
                <option value="CPC" disabled={!availableFilters.programTypes.includes('CPC')} className={!availableFilters.programTypes.includes('CPC') ? 'text-gray-400' : ''}>
                  CPC – Cost Per Click ads {!availableFilters.programTypes.includes('CPC') && '(No programs)'}
                </option>
                <option value="RCA" disabled={!availableFilters.programTypes.includes('RCA')} className={!availableFilters.programTypes.includes('RCA') ? 'text-gray-400' : ''}>
                  RCA – Remove Competitor Ads {!availableFilters.programTypes.includes('RCA') && '(No programs)'}
                </option>
                <option value="CTA" disabled={!availableFilters.programTypes.includes('CTA')} className={!availableFilters.programTypes.includes('CTA') ? 'text-gray-400' : ''}>
                  CTA – Call To Action {!availableFilters.programTypes.includes('CTA') && '(No programs)'}
                </option>
                <option value="SLIDESHOW" disabled={!availableFilters.programTypes.includes('SLIDESHOW')} className={!availableFilters.programTypes.includes('SLIDESHOW') ? 'text-gray-400' : ''}>
                  SLIDESHOW – Slideshow {!availableFilters.programTypes.includes('SLIDESHOW') && '(No programs)'}
                </option>
                <option value="BH" disabled={!availableFilters.programTypes.includes('BH')} className={!availableFilters.programTypes.includes('BH') ? 'text-gray-400' : ''}>
                  BH – Business Highlights {!availableFilters.programTypes.includes('BH') && '(No programs)'}
                </option>
                <option value="VL" disabled={!availableFilters.programTypes.includes('VL')} className={!availableFilters.programTypes.includes('VL') ? 'text-gray-400' : ''}>
                  VL – Verified License {!availableFilters.programTypes.includes('VL') && '(No programs)'}
                </option>
                <option value="LOGO" disabled={!availableFilters.programTypes.includes('LOGO')} className={!availableFilters.programTypes.includes('LOGO') ? 'text-gray-400' : ''}>
                  LOGO – Logo Feature {!availableFilters.programTypes.includes('LOGO') && '(No programs)'}
                </option>
                <option value="PORTFOLIO" disabled={!availableFilters.programTypes.includes('PORTFOLIO')} className={!availableFilters.programTypes.includes('PORTFOLIO') ? 'text-gray-400' : ''}>
                  PORTFOLIO – Portfolio Feature {!availableFilters.programTypes.includes('PORTFOLIO') && '(No programs)'}
                </option>
              </select>
            </div>
          </div>

          {/* ⚠️ Warning якщо немає програм для вибраної комбінації */}
          {!hasAvailablePrograms && allPrograms.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800">
                  No programs available for selected combination
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Try changing Status, Business, or Program Type filters. 
                  Currently {availableFilters.totalAvailable} programs match your selection.
                </p>
              </div>
            </div>
          )}

          {/* Search Button - Full Width Below */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={handleApplyFilters}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-base"
              disabled={isLoading || isFetching}
            >
              {isLoading || isFetching ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  🔍 Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
          {/* ✅ OPTIMIZED: Show skeleton loading instead of spinner */}
          {(isLoading || isFetching) ? (
            <div className="grid gap-2">
              {Array.from({ length: limit }).map((_, i) => (
                <ProgramSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          ) : (
            /* List View */
          <div className="grid gap-2">
            {programs.map((program, index) => {
              const isTerminating = loadingActions[`${program.program_id}-terminate`];
              
              return (
              <>
              <Card key={program.program_id || `program-${index}`} className={`relative transition-all duration-200 border-l-4 ${
                program.program_status === 'ACTIVE' ? 'border-l-green-500' :
                program.program_status === 'INACTIVE' ? 'border-l-gray-400' :
                program.program_status === 'TERMINATED' ? 'border-l-red-500' :
                'border-l-blue-500'
              } ${isTerminating ? 'opacity-60' : ''}`}>
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
                
                <CardContent className="p-2">
                  {/* Info Row - Modern Beautiful Design */}
                  <div className="flex items-center gap-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 px-4 py-3 rounded-lg border border-gray-200/50 w-full shadow-sm">
                    {/* Program Type & ID */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0 min-w-[160px]">
                      <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Type</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-indigo-700 text-base">{program.program_type}</span>
                        <span className="text-sm font-mono text-gray-500">{program.program_id}</span>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Status</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm px-2.5 py-1 rounded-md font-semibold ${
                          program.program_status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          program.program_status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' :
                          program.program_status === 'TERMINATED' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {program.program_status}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded-md font-medium ${
                          program.program_pause_status === 'NOT_PAUSED' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {program.program_pause_status === 'NOT_PAUSED' ? '▶' : '⏸'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Business */}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                      <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Business</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-700 text-base">{program.business_name || 'N/A'}</span>
                        <span className="text-sm font-mono text-gray-500">{program.yelp_business_id || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Budget */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Budget</span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-green-700 text-lg">${program.program_metrics ? (Number(program.program_metrics.budget) / 100).toFixed(2) : '0.00'}</span>
                        <span className="text-sm text-gray-500">{program.program_metrics?.currency || 'USD'}</span>
                      </div>
                    </div>
                    
                    {/* Dates */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0 min-w-[200px]">
                      <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Period</span>
                      <span className="text-purple-700 text-sm font-medium whitespace-nowrap">{program.start_date} → {program.end_date}</span>
                    </div>
                  </div>
                  <div className="border-t mt-2 pt-2">
                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      {/* EDIT */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-2 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium h-9 text-sm"
                        onClick={() => handleEdit(program.program_id)}
                        disabled={!program.program_id}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>

                      {/* DUPLICATE */}
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 font-medium h-9 text-sm"
                        onClick={() => handleDuplicateClick(program)}
                        disabled={!program.program_id}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Layer
                      </Button>

                      {/* PAUSE/RESUME */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={`w-full border-2 transition-all font-medium h-9 text-sm ${
                          program.program_pause_status === 'PAUSED'
                            ? 'border-green-500 hover:bg-green-50 text-green-700'
                            : 'border-yellow-500 hover:bg-yellow-50 text-yellow-700'
                        }`}
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
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : program.program_pause_status === 'PAUSED' ? (
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {program.program_pause_status === 'PAUSED' ? 'Resume' : 'Pause'}
                      </Button>

                      {/* INFO */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-2 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium h-9 text-sm"
                        onClick={() => navigate(`/program-info/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Details
                      </Button>

                      {/* FEATURES */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-2 hover:border-purple-500 hover:bg-purple-50 transition-all font-medium h-9 text-sm"
                        onClick={() => navigate(`/program-features/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Features
                      </Button>

                      {/* TERMINATE */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-2 border-red-500 text-red-700 hover:bg-red-50 transition-all md:col-span-1 col-span-2 font-medium h-9 text-sm"
                        onClick={() => handleTerminate(program.program_id)}
                        disabled={
                          loadingActions[`${program.program_id}-terminate`] ||
                          !program.program_id ||
                          program.program_status === 'TERMINATED' ||
                          program.program_status === 'EXPIRED' ||
                          (program.end_date && new Date(program.end_date) < new Date())
                        }
                      >
                        {loadingActions[`${program.program_id}-terminate`] ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {program.program_status === 'TERMINATED' || 
                         program.program_status === 'EXPIRED' ||
                         (program.end_date && new Date(program.end_date) < new Date()) ? 
                          'Expired' : 'Terminate'
                        }
                      </Button>

                      {/* STATUS - View status */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-9 text-sm"
                        onClick={() => navigate(`/program-status/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        Program Status
                      </Button>
                    </div>
                  </div>

                  {/* Active Features */}
                  {program.program_id && <ActiveFeatures programId={program.program_id} />}
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
