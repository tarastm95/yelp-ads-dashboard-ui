import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyGetProgramsQuery } from '../store/api/yelpApi';
import type { BusinessProgram } from '../types/yelp';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 100;

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
  const cacheRef = useRef<Record<string, CacheEntry>>({});
  const pendingRef = useRef<Record<string, Promise<CacheEntry | undefined> | null>>({});
  const [loadingState, setLoadingState] = useState<LoadingState>({});
  const [errorState, setErrorState] = useState<ErrorState>({});
  const [cacheVersion, setCacheVersion] = useState(0);

  const ensureStatus = useCallback(async (programStatus: string, options: EnsureOptions = {}) => {
    const statusKey = programStatus || 'ALL';
    const now = Date.now();
    const cached = cacheRef.current[statusKey];

    if (!options.force && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      return cached;
    }

    if (pendingRef.current[statusKey]) {
      return pendingRef.current[statusKey] ?? undefined;
    }

    const fetchPromise = (async () => {
      setLoadingState((prev) => ({ ...prev, [statusKey]: true }));
      setErrorState((prev) => ({ ...prev, [statusKey]: undefined }));

      try {
        let offset = 0;
        let aggregated: BusinessProgram[] = [];
        let totalCount = 0;
        let warning: string | undefined;
        let staleCount: number | undefined;
        let fromCache: boolean | undefined;

        while (true) {
          const response = await trigger(
            { offset, limit: PAGE_SIZE, program_status: statusKey },
            true,
          ).unwrap();

          const pagePrograms = response?.programs ?? [];
          aggregated = aggregated.concat(pagePrograms);
          totalCount = response?.total_count ?? aggregated.length;
          warning = warning ?? (response as any)?.warning;
          staleCount = staleCount ?? (response as any)?.stale_count;
          if (typeof (response as any)?.from_cache !== 'undefined') {
            fromCache = (response as any).from_cache;
          }

          if (aggregated.length >= totalCount || pagePrograms.length < PAGE_SIZE) {
            break;
          }

          offset += PAGE_SIZE;
        }

        const entry: CacheEntry = {
          programs: aggregated,
          totalCount,
          fetchedAt: Date.now(),
          warning: warning ?? cacheRef.current[statusKey]?.warning,
          staleCount: typeof staleCount === 'number' ? staleCount : cacheRef.current[statusKey]?.staleCount,
          fromCache: typeof fromCache === 'boolean' ? fromCache : cacheRef.current[statusKey]?.fromCache,
        };

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
  }, [trigger]);

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
