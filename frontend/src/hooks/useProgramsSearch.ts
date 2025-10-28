import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyGetProgramsQuery, useLazyGetAllProgramsFastQuery } from '../store/api/yelpApi';
import type { BusinessProgram } from '../types/yelp';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 100;
const FAST_LOAD_THRESHOLD = 500; // ⚡ Використовувати fast loading якщо програм >= 500

type CacheEntry = {
  programs: BusinessProgram[];
  totalCount: number;
  fetchedAt: number;
  warning?: string;
  staleCount?: number;
  fromCache?: boolean;
};

type LoadingState = Record<string, boolean>;
type ErrorState = Record<string, unknown>;

type EnsureOptions = {
  force?: boolean;
};

export interface UseProgramsSearchResult {
  programs: BusinessProgram[];
  totalCount: number;
  fetchedAt: number | null;
  warning: string | null;
  staleCount: number | null;
  fromCache: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refresh: () => Promise<CacheEntry | undefined>;
  ensureStatus: (status: string, options?: EnsureOptions) => Promise<CacheEntry | undefined>;
  getCachedEntry: (status: string) => CacheEntry | undefined;
  isStatusFetching: (status: string) => boolean;
  getStatusError: (status: string) => unknown;
  cacheVersion: number;
}

export const useProgramsSearch = (status: string): UseProgramsSearchResult => {
  const [trigger] = useLazyGetProgramsQuery();
  const [triggerFast] = useLazyGetAllProgramsFastQuery();
  const cacheRef = useRef<Record<string, CacheEntry>>({});
  const pendingRef = useRef<Record<string, Promise<CacheEntry | undefined> | null>>({});
  const [loadingState, setLoadingState] = useState<LoadingState>({});
  const [errorState, setErrorState] = useState<ErrorState>({});
  const [cacheVersion, setCacheVersion] = useState(0);

  const ensureStatus = useCallback(async (programStatus: string, options: EnsureOptions = {}) => {
    const statusKey = programStatus || 'ALL';
    const now = Date.now();
    const cached = cacheRef.current[statusKey];

    console.log(`🔍 [useProgramsSearch] ensureStatus called for status: "${statusKey}"`, {
      force: options.force,
      hasCached: !!cached,
      cacheAge: cached ? now - cached.fetchedAt : 'N/A',
      cacheTTL: CACHE_TTL_MS
    });

    if (!options.force && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      console.log(`✅ [useProgramsSearch] Using cached data for "${statusKey}":`, {
        programsCount: cached.programs.length,
        totalCount: cached.totalCount,
        fromCache: cached.fromCache
      });
      return cached;
    }

    if (pendingRef.current[statusKey]) {
      console.log(`⏳ [useProgramsSearch] Request already pending for "${statusKey}"`);
      return pendingRef.current[statusKey] ?? undefined;
    }

    const fetchPromise = (async () => {
      console.log(`🚀 [useProgramsSearch] Starting fetch for status: "${statusKey}"`);
      setLoadingState((prev) => ({ ...prev, [statusKey]: true }));
      setErrorState((prev) => ({ ...prev, [statusKey]: undefined }));

      try {
        // ⚡ СПОЧАТКУ: Завантажуємо першу сторінку щоб дізнатись total_count
        console.log(`📡 [useProgramsSearch] Fetching first page for "${statusKey}"...`);
        const firstPage = await trigger(
          { offset: 0, limit: PAGE_SIZE, program_status: statusKey },
          true,
        ).unwrap();

        console.log(`📊 [useProgramsSearch] First page response:`, {
          total_count: firstPage?.total_count,
          programsLength: firstPage?.programs?.length,
          from_db: (firstPage as any)?.from_db,
          loaded_all: (firstPage as any)?.loaded_all
        });

        const totalCount = firstPage?.total_count ?? firstPage?.programs?.length ?? 0;
        
        // ⚡ ВИБІР СТРАТЕГІЇ: Fast loading для великих datasets
        const shouldUseFastLoad = totalCount >= FAST_LOAD_THRESHOLD;

        console.log(`📋 [useProgramsSearch] Strategy decision:`, {
          totalCount,
          threshold: FAST_LOAD_THRESHOLD,
          shouldUseFastLoad
        });

        if (shouldUseFastLoad) {
          console.log(`⚡ [useProgramsSearch] Fast loading ${totalCount} programs in ONE request...`);
          
          // Використовуємо fast endpoint для завантаження всіх програм одразу
          const fastResponse = await triggerFast(
            { program_status: statusKey },
            true,
          ).unwrap();

          console.log(`⚡ [useProgramsSearch] Fast response:`, {
            programsLength: fastResponse?.programs?.length,
            total_count: fastResponse?.total_count,
            from_db: (fastResponse as any)?.from_db,
            loaded_all: (fastResponse as any)?.loaded_all
          });

          const entry: CacheEntry = {
            programs: fastResponse?.programs ?? [],
            totalCount: fastResponse?.total_count ?? 0,
            fetchedAt: Date.now(),
            fromCache: (fastResponse as any)?.from_db ?? false,
          };

          console.log(`💾 [useProgramsSearch] Caching fast load result:`, {
            programsCount: entry.programs.length,
            totalCount: entry.totalCount
          });

          cacheRef.current[statusKey] = entry;
          setCacheVersion((prev) => prev + 1);
          return entry;
        }

        // 📄 ПАГІНАЦІЯ: Для малих datasets (<500) використовуємо звичайну пагінацію
        console.log(`📄 [useProgramsSearch] Paginated loading ${totalCount} programs...`);
        
        let offset = PAGE_SIZE; // Починаємо з другої сторінки (першу вже завантажили)
        let aggregated: BusinessProgram[] = firstPage?.programs ?? [];
        let warning: string | undefined = (firstPage as any)?.warning;
        let staleCount: number | undefined = (firstPage as any)?.stale_count;
        let fromCache: boolean | undefined = (firstPage as any)?.from_cache;

        console.log(`📄 [useProgramsSearch] Starting pagination with:`, {
          initialPrograms: aggregated.length,
          totalCount,
          offset,
          PAGE_SIZE
        });

        while (aggregated.length < totalCount && offset < totalCount) {
          console.log(`📄 [useProgramsSearch] Fetching page at offset ${offset}...`);
          const response = await trigger(
            { offset, limit: PAGE_SIZE, program_status: statusKey },
            true,
          ).unwrap();

          const pagePrograms = response?.programs ?? [];
          console.log(`📄 [useProgramsSearch] Page response:`, {
            offset,
            pageProgramsLength: pagePrograms.length,
            aggregatedLength: aggregated.length,
            totalCount
          });

          aggregated = aggregated.concat(pagePrograms);
          warning = warning ?? (response as any)?.warning;
          staleCount = staleCount ?? (response as any)?.stale_count;
          if (typeof (response as any)?.from_cache !== 'undefined') {
            fromCache = (response as any).from_cache;
          }

          if (pagePrograms.length < PAGE_SIZE) {
            console.log(`📄 [useProgramsSearch] Last page reached (${pagePrograms.length} < ${PAGE_SIZE})`);
            break;
          }

          offset += PAGE_SIZE;
        }

        console.log(`📄 [useProgramsSearch] Pagination complete:`, {
          finalAggregatedLength: aggregated.length,
          totalCount,
          warning,
          staleCount,
          fromCache
        });

        const entry: CacheEntry = {
          programs: aggregated,
          totalCount,
          fetchedAt: Date.now(),
          warning,
          staleCount,
          fromCache,
        };

        console.log(`💾 [useProgramsSearch] Caching paginated result:`, {
          programsCount: entry.programs.length,
          totalCount: entry.totalCount
        });

        cacheRef.current[statusKey] = entry;
        setCacheVersion((prev) => prev + 1);
        return entry;
      } catch (error) {
        setErrorState((prev) => ({ ...prev, [statusKey]: error }));
        throw error;
      } finally {
        setLoadingState((prev) => ({ ...prev, [statusKey]: false }));
        pendingRef.current[statusKey] = null;
      }
    })();

    pendingRef.current[statusKey] = fetchPromise;
    return fetchPromise;
  }, [trigger, triggerFast]);

  useEffect(() => {
    ensureStatus(status).catch(() => {
      /* handled via error state */
    });
  }, [status, ensureStatus]);

  const refresh = useCallback(() => ensureStatus(status, { force: true }), [status, ensureStatus]);

  const getCachedEntry = useCallback((statusKey: string) => cacheRef.current[statusKey], []);

  const isStatusFetching = useCallback((statusKey: string) => {
    return Boolean(loadingState[statusKey]);
  }, [loadingState]);

  const getStatusError = useCallback((statusKey: string) => errorState[statusKey], [errorState]);

  const activeEntry = getCachedEntry(status);
  const hasEntry = Boolean(activeEntry);
  const fetchingActive = isStatusFetching(status);
  const activeError = getStatusError(status);

  return useMemo(() => ({
    programs: activeEntry?.programs ?? [],
    totalCount: activeEntry?.totalCount ?? 0,
    fetchedAt: activeEntry?.fetchedAt ?? null,
    warning: activeEntry?.warning ?? null,
    staleCount: typeof activeEntry?.staleCount === 'number' ? activeEntry.staleCount : null,
    fromCache: Boolean(activeEntry?.fromCache),
    isLoading: !hasEntry && fetchingActive,
    isFetching: fetchingActive,
    error: activeError,
    refresh,
    ensureStatus,
    getCachedEntry,
    isStatusFetching,
    getStatusError,
    cacheVersion,
  }), [
    activeEntry,
    activeError,
    cacheVersion,
    ensureStatus,
    fetchingActive,
    getCachedEntry,
    hasEntry,
    isStatusFetching,
    refresh,
  ]);
};

export default useProgramsSearch;
