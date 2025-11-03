
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import {
  Program,
  CreateProgramRequest,
  EditProgramRequest,
  JobStatus,
  BusinessMatch,
  DailyReport,
  MonthlyReport,
  BusinessUpdate,
  BusinessProgramsResponse,
  ProgramInfoResponse,
  BusinessProgram,
  ProgramFeaturesResponse,
  ProgramFeaturesUpdateRequest,
} from '../../types/yelp';

// Portfolio API types
export interface PortfolioProject {
  project_id: string;
  name: string;
  description: string;
  call_to_action: 'WEBSITE' | 'CALL' | 'BOOK_APPOINTMENT' | 'GET_QUOTE' | 'LEARN_MORE';
  service_offerings: string[];
  cost?: 'UNDER_100' | '100_500' | '500_1000' | '1000_5000' | '5000_PLUS';
  duration?: 'UNDER_1_WEEK' | '1_2_WEEKS' | '2_4_WEEKS' | '1_3_MONTHS' | '3_PLUS_MONTHS';
  completion_year?: number;
  completion_month?: number;
  published: boolean;
}

export interface PortfolioPhoto {
  photo_id: string;
  photo_url?: string;
  biz_photo_id?: string;
  caption: string;
  is_before_photo: boolean;
  is_cover_photo: boolean;
}

export interface PortfolioProjectCreateRequest {
  name: string;
  description: string;
  call_to_action: PortfolioProject['call_to_action'];
  service_offerings: string[];
  cost?: PortfolioProject['cost'];
  duration?: PortfolioProject['duration'];
  completion_year?: number;
  completion_month?: number;
}

export interface PortfolioPhotoUploadRequest {
  photo_url?: string;
  biz_photo_id?: string;
  is_before_photo: boolean;
  caption: string;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api', // Proxy through backend
  prepareHeaders: (headers, { getState }) => {
    headers.set('Content-Type', 'application/json');
    const { auth } = (getState() as RootState);
    
    // 🔍 DEBUG: Детальні логи для authentication
    console.log('🔐 [prepareHeaders] Auth state:', {
      hasUsername: !!auth.username,
      hasPassword: !!auth.password,
      username: auth.username ? `${auth.username.substring(0, 10)}...` : 'empty',
    });
    
    if (auth.username && auth.password) {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      headers.set('Authorization', `Basic ${encoded}`);
      console.log('✅ [prepareHeaders] Authorization header set:', {
        headerPresent: headers.has('Authorization'),
        encodedLength: encoded.length
      });
    } else {
      console.warn('⚠️ [prepareHeaders] No credentials! Skipping Authorization header');
    }
    
    return headers;
  },
});

const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError & { statusText?: string }
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    const statusText = (result.meta as any)?.response?.statusText;
    (result.error as any).statusText = statusText;
  }
  return result;
};

export const yelpApi = createApi({
  reducerPath: 'yelpApi',
  baseQuery,
  tagTypes: ['Program', 'Report', 'JobStatus', 'ProgramFeatures', 'PortfolioProject', 'PortfolioPhoto', 'CustomSuggestedKeywords', 'ScheduledPause', 'ScheduledBudgetUpdate'],
  endpoints: (builder) => ({
    // 1. Create a new ad product
    createProgram: builder.mutation<{ job_id: string }, CreateProgramRequest>({
      query: (data) => ({
        url: '/reseller/program/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Program'],
    }),

    // 2. Edit product
    editProgram: builder.mutation<{ job_id: string }, { partner_program_id: string; data: EditProgramRequest }>({
      query: ({ partner_program_id, data }) => ({
        url: `/reseller/program/${partner_program_id}/edit`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { partner_program_id }) => [
        { type: 'Program', id: partner_program_id },
        'Program',
        'JobStatus'
      ],
    }),

    // 3. Terminate product
    terminateProgram: builder.mutation<{ job_id: string }, string>({
      query: (partner_program_id) => ({
        url: `/reseller/program/${partner_program_id}/end`,
        method: 'POST',
      }),
      invalidatesTags: ['Program'],
    }),
    
    // Update program custom name
    updateProgramCustomName: builder.mutation<
      { program_id: string; custom_name: string | null; message: string },
      { program_id: string; custom_name: string }
    >({
      query: ({ program_id, custom_name }) => ({
        url: `/reseller/program/${program_id}/custom-name`,
        method: 'POST',
        body: { custom_name },
      }),
      invalidatesTags: ['Program'],
    }),

    // Duplicate program (create a layer)
    duplicateProgram: builder.mutation<
      { job_id: string; program_id: string | null; original_program_id: string; copied_features: string[]; message: string },
      { program_id: string; start_date: string; end_date?: string; budget: number; copy_features?: boolean; is_autobid?: boolean; max_bid?: number }
    >({
      query: ({ program_id, ...data }) => ({
        url: `/reseller/program/${program_id}/duplicate`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Program', 'JobStatus'],
    }),

    pauseProgram: builder.mutation<{ status: number }, string>({
      query: (program_id) => ({
        url: `/program/${program_id}/pause/v1`,
        method: 'POST',
      }),
      invalidatesTags: ['Program'],
    }),

    resumeProgram: builder.mutation<{ status: number }, string>({
      query: (program_id) => ({
        url: `/program/${program_id}/resume/v1`,
        method: 'POST',
      }),
      invalidatesTags: ['Program'],
    }),

    schedulePauseProgram: builder.mutation<
      { id: number; program_id: string; scheduled_datetime: string; status: string; message: string },
      { program_id: string; scheduled_datetime: string }
    >({
      query: ({ program_id, scheduled_datetime }) => ({
        url: `/program/${program_id}/schedule-pause/v1`,
        method: 'POST',
        body: { scheduled_datetime },
      }),
      invalidatesTags: ['Program', 'ScheduledPause'],
    }),

    getScheduledPauses: builder.query<
      {
        count: number;
        results: Array<{
          id: number;
          program_id: string;
          program_info: {
            program_name: string;
            business_id: string | null;
            business_name: string | null;
            program_status: string | null;
            program_pause_status: string | null;
            start_date: string | null;
            end_date: string | null;
          };
          scheduled_datetime: string;
          status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED';
          executed_at: string | null;
          error_message: string | null;
          created_at: string;
        }>;
      },
      void
    >({
      query: () => ({
        url: '/reseller/scheduled-pauses',
        method: 'GET',
      }),
      providesTags: ['ScheduledPause'],
    }),

    cancelScheduledPause: builder.mutation<
      { message: string; status: string },
      { pause_id: number }
    >({
      query: ({ pause_id }) => ({
        url: `/reseller/scheduled-pause/${pause_id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['ScheduledPause', 'Program'],
    }),

      scheduleBudgetUpdate: builder.mutation<
        { id: number; program_id: string; scheduled_datetime: string; status: string; message: string },
        { program_id: string; new_budget?: number; is_autobid?: boolean; max_bid?: number; pacing_method?: string; scheduled_datetime: string }
      >({
        query: ({ program_id, new_budget, is_autobid, max_bid, pacing_method, scheduled_datetime }) => ({
          url: `/program/${program_id}/schedule-budget-update/v1`,
          method: 'POST',
          body: { new_budget, is_autobid, max_bid, pacing_method, scheduled_datetime },
        }),
      invalidatesTags: ['Program', 'ScheduledBudgetUpdate'],
    }),

    getScheduledBudgetUpdates: builder.query<
      {
        count: number;
           results: Array<{
             id: number;
             program_id: string;
             program_info: {
               program_name: string;
               business_id: string | null;
               business_name: string | null;
               program_status: string | null;
               current_budget: number | null;
             };
             new_budget: number | null;
             is_autobid: boolean | null;
             max_bid: number | null;
             pacing_method: string | null;
             scheduled_datetime: string;
             status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED';
             executed_at: string | null;
             error_message: string | null;
             created_at: string;
           }>;
      },
      void
    >({
      query: () => ({
        url: '/reseller/scheduled-budget-updates',
        method: 'GET',
      }),
      providesTags: ['ScheduledBudgetUpdate'],
    }),

    cancelScheduledBudgetUpdate: builder.mutation<
      { message: string; status: string },
      { update_id: number }
    >({
      query: ({ update_id }) => ({
        url: `/reseller/scheduled-budget-update/${update_id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['ScheduledBudgetUpdate', 'Program'],
    }),

    // 4. Check job status
    getJobStatus: builder.query<JobStatus, string>({
      query: (id) => `/reseller/status/${id}`,
      providesTags: ['JobStatus'],
    }),

    // Get all active/pending jobs
    getActiveJobs: builder.query<{ jobs: Program[]; count: number }, void>({
      query: () => '/reseller/active-jobs',
      providesTags: ['JobStatus', 'Program'],
    }),

    // Get job history with filters
    getJobHistory: builder.query<{ jobs: Program[]; count: number; filters: { days: number; status: string; limit: number } }, { days?: number; status?: string; limit?: number }>({
      query: ({ days = 7, status = 'ALL', limit = 100 } = {}) => ({
        url: '/reseller/job-history',
        params: { days, status, limit },
      }),
      providesTags: ['JobStatus', 'Program'],
    }),

    // 5. Get product information
    getPrograms: builder.query<{ programs: BusinessProgram[]; total_count?: number; from_cache?: boolean; warning?: string; stale_count?: number }, { offset?: number; limit?: number; program_status?: string; business_id?: string; program_type?: string; _forceKey?: number }>({
      query: ({ offset = 0, limit = 20, program_status = 'CURRENT', business_id, program_type, _forceKey } = {}) => ({
        url: '/reseller/programs',
        params: { 
          offset, 
          limit, 
          program_status,
          ...(business_id ? { business_id } : {}), // Only include business_id if provided
          ...(program_type ? { program_type } : {}), // Only include program_type if provided
        }, // do not send _forceKey to the server
      }),
      // ✅ OPTIMIZED: Cache for 5 minutes instead of 0
      keepUnusedDataFor: 300, // 5 minutes
      // ✅ OPTIMIZED: Don't refetch automatically on mount
      refetchOnMountOrArgChange: false,
      // ✅ OPTIMIZED: Don't refetch on window focus or reconnect
      refetchOnFocus: false,
      refetchOnReconnect: false,
      // Simpler tags without complex logic
      providesTags: ['Program'],
      // Each parameter set is a separate query key, including forceKey, business_id, and program_type
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return `${endpointName}_${queryArgs.offset}_${queryArgs.limit}_${queryArgs.program_status}_${queryArgs.business_id || 'all'}_${queryArgs.program_type || 'all'}_${queryArgs._forceKey || 0}`;
      },
    }),

    // ⚡ ШВИДКЕ ЗАВАНТАЖЕННЯ: отримати ВСІ програми одним запитом
    getAllProgramsFast: builder.query<{ programs: BusinessProgram[]; total_count: number; loaded_all: boolean }, { program_status?: string }>({
      query: ({ program_status = 'ALL' } = {}) => ({
        url: '/reseller/programs',
        params: { 
          all: 'true',  // ⚡ Завантажити все одразу
          program_status,
          offset: 0,
          limit: 10000  // Large fallback (буде проігноровано через all=true)
        },
      }),
      keepUnusedDataFor: 60, // Кешуємо на 1 хвилину
      providesTags: ['Program'],
    }),

    getProgramInfo: builder.query<Program, string>({
      query: (program_id) => `/reseller/get_program_info?program_id=${program_id}`,
      providesTags: (result, error, program_id) => [
        { type: 'Program', id: program_id },
        'Program'
      ],
    }),

    getBusinessIds: builder.query<{ 
      total: number; 
      businesses: Array<{
        business_id: string;
        business_name: string;
        program_count: number;
        active_count: number;
      }>;
      filtered_by_status?: string;
    }, { programStatus?: string; programType?: string } | undefined>({
      query: (args) => {
        // Якщо передано статус або тип - додаємо як параметри
        const params = new URLSearchParams();
        if (args?.programStatus) {
          params.append('program_status', args.programStatus);
        }
        if (args?.programType) {
          params.append('program_type', args.programType);
        }
        const queryString = params.toString();
        return `/reseller/business-ids${queryString ? `?${queryString}` : ''}`;
      },
      keepUnusedDataFor: 10, // Короткий кеш бо дані залежать від статусу та типу
      providesTags: (result, error, args) => [
        { type: 'Program' as const, id: `business-ids-${args?.programStatus || 'all'}-${args?.programType || 'all'}` }
      ],
    }),

    // 🧠 РОЗУМНІ ФІЛЬТРИ: Отримати доступні опції на основі поточного вибору
    getAvailableFilters: builder.query<{
      statuses: string[];
      program_types: string[];
      businesses: Array<{
        business_id: string;
        business_name: string;
        program_count: number;
      }>;
      total_programs: number;
      applied_filters: {
        program_status: string;
        program_type: string;
        business_id: string;
      };
    }, { programStatus?: string; programType?: string; businessId?: string }>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args.programStatus && args.programStatus !== 'ALL') {
          params.append('program_status', args.programStatus);
        }
        if (args.programType && args.programType !== 'ALL') {
          params.append('program_type', args.programType);
        }
        if (args.businessId && args.businessId !== 'all') {
          params.append('business_id', args.businessId);
        }
        const queryString = params.toString();
        return `/reseller/available-filters${queryString ? `?${queryString}` : ''}`;
      },
      keepUnusedDataFor: 5, // Дуже короткий кеш - дані змінюються при кожній зміні фільтру
      providesTags: ['Program'],
    }),

    // Sync programs to database
    syncPrograms: builder.mutation<{
      total_api: number;
      total_db_before: number;
      total_db_after: number;
      added: number;
      status: string;
      message: string;
    }, void>({
      query: () => ({
        url: '/reseller/programs/sync',
        method: 'POST',
      }),
      invalidatesTags: ['Program'], // Refresh programs list after sync
    }),

    // 6. Get encrypted business_id
    getBusinessMatches: builder.query<BusinessMatch[], { name: string; address1: string; city: string; state: string; country: string }>({
      query: (params) => ({
        url: '/businesses/matches',
        params,
      }),
    }),

    // Get programs for Business ID
    getBusinessPrograms: builder.query<BusinessProgramsResponse, string>({
      query: (business_id) => `/reseller/business_programs/${business_id}`,
    }),

    // Get program information by its ID
    getPartnerProgramInfo: builder.query<ProgramInfoResponse, string>({
      query: (program_id) => `/reseller/program_info/${program_id}`,
    }),

    // 7. Update business categories
    updateBusinessCategories: builder.mutation<{ job_id: string }, BusinessUpdate[]>({
      query: (businesses) => ({
        url: '/batch/businesses/sync',
        method: 'POST',
        body: { businesses },
      }),
    }),

    // 8. Request reports
    requestDailyReport: builder.mutation<
      { report_id: string },
      { business_id: string; start_date: string; end_date: string }
    >({
      query: ({ business_id, start_date, end_date }) => ({
        url: '/reporting/businesses/daily',
        method: 'POST',
        body: {
          start_date,
          end_date,
          business_ids: [business_id],
          metrics: [
            'billed_impressions',
            'billed_clicks',
          ],
        },
      }),
    }),

    requestMonthlyReport: builder.mutation<{ report_id: string }, { business_id: string; start_date: string; end_date: string }>({
      query: (data) => ({
        url: '/reporting/businesses/monthly',
        method: 'POST',
        body: data,
      }),
    }),

    getDailyReport: builder.query<DailyReport, string>({
      query: (report_id) => `/reporting/businesses/daily/${report_id}`,
      providesTags: ['Report'],
    }),

    getMonthlyReport: builder.query<MonthlyReport, string>({
      query: (report_id) => `/reporting/businesses/monthly/${report_id}`,
      providesTags: ['Report'],
    }),

    // Program Features endpoints
    getProgramFeatures: builder.query<ProgramFeaturesResponse, string>({
      query: (program_id) => `/program/${program_id}/features/v1`,
      providesTags: (result, error, program_id) => [
        { type: 'ProgramFeatures', id: program_id },
        'ProgramFeatures',
      ],
    }),

    updateProgramFeatures: builder.mutation<ProgramFeaturesResponse, { program_id: string; features: ProgramFeaturesUpdateRequest }>({
      query: ({ program_id, features }) => ({
        url: `/program/${program_id}/features/v1`,
        method: 'POST',
        body: features,
      }),
      invalidatesTags: (result, error, { program_id }) => [
        { type: 'ProgramFeatures', id: program_id },
        'ProgramFeatures',
        'Program', // Also invalidate program data as features affect program state
      ],
    }),

    deleteProgramFeatures: builder.mutation<ProgramFeaturesResponse, { program_id: string; features: string[] }>({
      query: ({ program_id, features }) => ({
        url: `/program/${program_id}/features/v1`,
        method: 'DELETE',
        body: { features },
      }),
      invalidatesTags: (result, error, { program_id }) => [
        { type: 'ProgramFeatures', id: program_id },
        'ProgramFeatures',
        'Program', // Also invalidate program data as features affect program state
      ],
    }),

    // Portfolio API endpoints
    createPortfolioProject: builder.mutation<{ project_id: string }, string>({
      query: (program_id) => ({
        url: `/program/${program_id}/portfolio/v1`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, program_id) => [
        { type: 'PortfolioProject', id: program_id },
        'PortfolioProject',
      ],
    }),

    getPortfolioProject: builder.query<PortfolioProject, { program_id: string; project_id: string }>({
      query: ({ program_id, project_id }) => `/program/${program_id}/portfolio/${project_id}/v1`,
      providesTags: (result, error, { program_id, project_id }) => [
        { type: 'PortfolioProject', id: `${program_id}-${project_id}` },
        { type: 'PortfolioProject', id: program_id },
      ],
    }),

    updatePortfolioProject: builder.mutation<PortfolioProject, { 
      program_id: string; 
      project_id: string; 
      data: PortfolioProjectCreateRequest 
    }>({
      query: ({ program_id, project_id, data }) => ({
        url: `/program/${program_id}/portfolio/${project_id}/v1`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { program_id, project_id }) => [
        { type: 'PortfolioProject', id: `${program_id}-${project_id}` },
        { type: 'PortfolioProject', id: program_id },
        'PortfolioProject',
      ],
    }),

    deletePortfolioProject: builder.mutation<void, { program_id: string; project_id: string }>({
      query: ({ program_id, project_id }) => ({
        url: `/program/${program_id}/portfolio/${project_id}/v1`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { program_id, project_id }) => [
        { type: 'PortfolioProject', id: `${program_id}-${project_id}` },
        { type: 'PortfolioProject', id: program_id },
        'PortfolioProject',
        'PortfolioPhoto', // Photos also get deleted
      ],
    }),

    getPortfolioPhotos: builder.query<PortfolioPhoto[], { program_id: string; project_id: string }>({
      query: ({ program_id, project_id }) => `/program/${program_id}/portfolio/${project_id}/photos/v1`,
      providesTags: (result, error, { program_id, project_id }) => [
        { type: 'PortfolioPhoto', id: `${program_id}-${project_id}` },
        'PortfolioPhoto',
      ],
    }),

    uploadPortfolioPhoto: builder.mutation<{ photo_id: string }, { 
      program_id: string; 
      project_id: string; 
      data: PortfolioPhotoUploadRequest 
    }>({
      query: ({ program_id, project_id, data }) => ({
        url: `/program/${program_id}/portfolio/${project_id}/photos/v1`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { program_id, project_id }) => [
        { type: 'PortfolioPhoto', id: `${program_id}-${project_id}` },
        'PortfolioPhoto',
      ],
    }),

    deletePortfolioPhoto: builder.mutation<void, { 
      program_id: string; 
      project_id: string; 
      photo_id: string 
    }>({
      query: ({ program_id, project_id, photo_id }) => ({
        url: `/program/${program_id}/portfolio/${project_id}/photos/${photo_id}/v1`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { program_id, project_id }) => [
        { type: 'PortfolioPhoto', id: `${program_id}-${project_id}` },
        'PortfolioPhoto',
      ],
    }),

    // Custom Suggested Keywords endpoints
    getCustomSuggestedKeywords: builder.query<{ id: number; program_id: string; keyword: string; created_at: string; created_by?: string }[], string>({
      query: (program_id) => `/program/${program_id}/custom-suggested-keywords`,
      providesTags: (result, error, program_id) => [
        { type: 'CustomSuggestedKeywords', id: program_id },
        'CustomSuggestedKeywords',
      ],
    }),

    addCustomSuggestedKeywords: builder.mutation<{ message: string; created: string[]; skipped: string[]; total: number }, { program_id: string; keywords: string[] }>({
      query: ({ program_id, keywords }) => ({
        url: `/program/${program_id}/custom-suggested-keywords`,
        method: 'POST',
        body: { keywords },
      }),
      invalidatesTags: (result, error, { program_id }) => [
        { type: 'CustomSuggestedKeywords', id: program_id },
        'CustomSuggestedKeywords',
        { type: 'ProgramFeatures', id: program_id }, // Invalidate features to refetch with merged keywords
        'ProgramFeatures',
      ],
    }),

    deleteCustomSuggestedKeywords: builder.mutation<{ message: string; deleted: number }, { program_id: string; keywords: string[] }>({
      query: ({ program_id, keywords }) => ({
        url: `/program/${program_id}/custom-suggested-keywords`,
        method: 'DELETE',
        body: { keywords },
      }),
      invalidatesTags: (result, error, { program_id }) => [
        { type: 'CustomSuggestedKeywords', id: program_id },
        'CustomSuggestedKeywords',
        { type: 'ProgramFeatures', id: program_id }, // Invalidate features to refetch with merged keywords
        'ProgramFeatures',
      ],
    }),
  }),
});

export const {
  useCreateProgramMutation,
  useEditProgramMutation,
  useTerminateProgramMutation,
  useUpdateProgramCustomNameMutation,
  useDuplicateProgramMutation,
  usePauseProgramMutation,
  useResumeProgramMutation,
  useGetJobStatusQuery,
  useLazyGetJobStatusQuery,
  useGetActiveJobsQuery,
  useGetJobHistoryQuery,
  useGetProgramsQuery,
  useLazyGetProgramsQuery,
  useGetAllProgramsFastQuery,  // ⚡ NEW: Fast loading hook
  useLazyGetAllProgramsFastQuery,  // ⚡ NEW: Lazy fast loading hook
  useGetProgramInfoQuery,
  useGetBusinessIdsQuery,
  useGetAvailableFiltersQuery,  // 🧠 NEW: Smart Filters hook
  useSyncProgramsMutation,
  useGetBusinessMatchesQuery,
  useGetBusinessProgramsQuery,
  useLazyGetBusinessProgramsQuery,
  useGetPartnerProgramInfoQuery,
  useUpdateBusinessCategoriesMutation,
  useRequestDailyReportMutation,
  useRequestMonthlyReportMutation,
  useGetDailyReportQuery,
  useGetMonthlyReportQuery,
  useGetProgramFeaturesQuery,
  useUpdateProgramFeaturesMutation,
  useDeleteProgramFeaturesMutation,
  // Portfolio API hooks
  useCreatePortfolioProjectMutation,
  useGetPortfolioProjectQuery,
  useUpdatePortfolioProjectMutation,
  useDeletePortfolioProjectMutation,
  useGetPortfolioPhotosQuery,
  useUploadPortfolioPhotoMutation,
  useDeletePortfolioPhotoMutation,
  // Custom Suggested Keywords hooks
  useGetCustomSuggestedKeywordsQuery,
  useAddCustomSuggestedKeywordsMutation,
  useDeleteCustomSuggestedKeywordsMutation,
  // Scheduled Pauses hooks
  useGetScheduledPausesQuery,
  useSchedulePauseProgramMutation,
  useCancelScheduledPauseMutation,
  useCancelScheduledBudgetUpdateMutation,
  // Scheduled Budget Updates hooks
  useGetScheduledBudgetUpdatesQuery,
  useScheduleBudgetUpdateMutation,
} = yelpApi;
