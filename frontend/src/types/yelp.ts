
export interface Program {
  program_id: string;
  business_id: string;
  product_type: string;
  status: 'active' | 'paused' | 'terminated';
  created_date: string;
  modified_date: string;
  budget_amount?: number;
  targeting?: {
    locations?: string[];
    categories?: string[];
  };
}

export interface CreateProgramRequest {
  business_id: string;
  product_type: string;
  budget_amount: number;
  targeting: {
    locations: string[];
    categories: string[];
  };
}

export interface EditProgramRequest {
  budget_amount?: number;
  targeting?: {
    locations?: string[];
    categories?: string[];
  };
}

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
  error_message?: string;
}

export interface BusinessMatch {
  id: string;
  alias: string;
  name: string;
  phone: string;
  location: {
    address1: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
}

export interface ReportData {
  date: string;
  billed_impressions: number;
  billed_clicks: number;
  calls: number;
  cost: number;
}

export interface DailyReport {
  report_id: string;
  business_id: string;
  data: ReportData[];
}

export interface MonthlyReport {
  report_id: string;
  business_id: string;
  data: ReportData[];
}

export interface BusinessUpdate {
  business_id: string;
  categories: string[];
  name?: string;
  phone?: string;
  location?: {
    address1: string;
    city: string;
    state: string;
    zip_code: string;
  };
}
