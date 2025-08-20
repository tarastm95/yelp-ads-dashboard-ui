
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
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
} from '../../types/yelp';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api', // Проксировать через бекенд
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

export const yelpApi = createApi({
  reducerPath: 'yelpApi',
  baseQuery,
  tagTypes: ['Program', 'Report', 'JobStatus'],
  endpoints: (builder) => ({
    // 1. Создать новый рекламный продукт
    createProgram: builder.mutation<{ job_id: string }, CreateProgramRequest>({
      query: (data) => ({
        url: '/reseller/program/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Program'],
    }),

    // 2. Редактировать продукт
    editProgram: builder.mutation<{ job_id: string }, { program_id: string; data: EditProgramRequest }>({
      query: ({ program_id, data }) => ({
        url: `/reseller/program/${program_id}/edit`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Program'],
    }),

    // 3. Завершить продукт
    terminateProgram: builder.mutation<{ job_id: string }, string>({
      query: (program_id) => ({
        url: `/reseller/program/${program_id}/end`,
        method: 'POST',
      }),
      invalidatesTags: ['Program'],
    }),

    pauseProgram: builder.mutation<{ status: number }, string>({
      query: (program_id) => ({
        url: `/program/${program_id}/pause`,
        method: 'POST',
      }),
      invalidatesTags: ['Program'],
    }),

    resumeProgram: builder.mutation<{ status: number }, string>({
      query: (program_id) => ({
        url: `/program/${program_id}/resume`,
        method: 'POST',
      }),
      invalidatesTags: ['Program'],
    }),

    // 4. Проверить статус задачи
    getJobStatus: builder.query<JobStatus, string>({
      query: (id) => `/reseller/status/${id}`,
      providesTags: ['JobStatus'],
    }),

    // 5. Получить информацию о продуктах
    getPrograms: builder.query<Program[], void>({
      query: () => '/reseller/programs',
      providesTags: ['Program'],
    }),

    getProgramInfo: builder.query<Program, string>({
      query: (program_id) => `/reseller/get_program_info?program_id=${program_id}`,
      providesTags: ['Program'],
    }),

    // 6. Получить зашифрованный business_id
    getBusinessMatches: builder.query<BusinessMatch[], { name: string; address1: string; city: string; state: string; country: string }>({
      query: (params) => ({
        url: '/businesses/matches',
        params,
      }),
    }),

    // Получить программы для Business ID
    getBusinessPrograms: builder.query<BusinessProgramsResponse, string>({
      query: (business_id) => `/reseller/business_programs/${business_id}`,
    }),

    // Получить информацию о программе по её ID
    getPartnerProgramInfo: builder.query<ProgramInfoResponse, string>({
      query: (program_id) => `/reseller/program_info/${program_id}`,
    }),

    // 7. Обновить категории бизнеса
    updateBusinessCategories: builder.mutation<{ job_id: string }, BusinessUpdate[]>({
      query: (businesses) => ({
        url: '/batch/businesses/sync',
        method: 'POST',
        body: { businesses },
      }),
    }),

    // 8. Запросить отчеты
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
  }),
});

export const {
  useCreateProgramMutation,
  useEditProgramMutation,
  useTerminateProgramMutation,
  usePauseProgramMutation,
  useResumeProgramMutation,
  useGetJobStatusQuery,
  useLazyGetJobStatusQuery,
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
} = yelpApi;
