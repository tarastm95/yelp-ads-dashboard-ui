
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
    if (auth.username && auth.password) {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      headers.set('Authorization', `Basic ${encoded}`);
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
  tagTypes: ['Program', 'Report', 'JobStatus', 'ProgramFeatures', 'PortfolioProject', 'PortfolioPhoto', 'CustomSuggestedKeywords'],
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
      invalidatesTags: ['Program'],
    }),

    // 3. Terminate product
    terminateProgram: builder.mutation<{ job_id: string }, string>({
      query: (partner_program_id) => ({
        url: `/reseller/program/${partner_program_id}/end`,
        method: 'POST',
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
    getPrograms: builder.query<{ programs: BusinessProgram[]; total_count?: number }, { offset?: number; limit?: number; program_status?: string; _forceKey?: number }>({
      query: ({ offset = 0, limit = 20, program_status = 'CURRENT', _forceKey } = {}) => ({
        url: '/reseller/programs',
        params: { offset, limit, program_status }, // do not send _forceKey to the server
      }),
      // Disable caching for pagination - each request must be fresh
      keepUnusedDataFor: 0,
      // Simpler tags without complex logic
      providesTags: ['Program'],
      // Each parameter set is a separate query key, including forceKey
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return `${endpointName}_${queryArgs.offset}_${queryArgs.limit}_${queryArgs.program_status}_${queryArgs._forceKey || 0}`;
      },
    }),

    getProgramInfo: builder.query<Program, string>({
      query: (program_id) => `/reseller/get_program_info?program_id=${program_id}`,
      providesTags: ['Program'],
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
  useDuplicateProgramMutation,
  usePauseProgramMutation,
  useResumeProgramMutation,
  useGetJobStatusQuery,
  useLazyGetJobStatusQuery,
  useGetActiveJobsQuery,
  useGetJobHistoryQuery,
  useGetProgramsQuery,
  useGetProgramInfoQuery,
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
} = yelpApi;
