
export interface Program {
  program_id: string;
  business_id: string;
  product_type: string;
  status: 'active' | 'paused' | 'terminated';
  created_date: string;
  modified_date: string;
  budget_amount?: number;
  start_date?: string;
  end_date?: string | null;
  targeting?: {
    locations?: string[];
    categories?: string[];
  };
}

export interface CreateProgramRequest {
  business_id: string;
  program_name: string;
  budget: number;
  max_bid: number;
  is_autobid: boolean;
  start: string;
  end?: string;
}

export interface EditProgramRequest {
  // Legacy fields used by the basic EditProgram page
  budget_amount?: number;
  targeting?: {
    locations?: string[];
    categories?: string[];
  };

  // Fields supported by the Yelp program edit endpoint
  start?: string;
  end?: string;
  budget?: number;
  future_budget_date?: string;
  max_bid?: number;
  pacing_method?: 'paced' | 'unpaced';
  ad_categories?: string[];
}

export interface FieldStatus {
  requested_value: string;
  status: 'COMPLETED' | 'FAILED';
}

export interface ProgramUpdateResults {
  program_added?: Record<string, FieldStatus>;
  program_updated?: Record<string, FieldStatus>;
  program_deleted?: Record<string, FieldStatus>;
}

export interface BusinessResult {
  status: 'COMPLETED' | 'FAILED';
  identifier: string;
  identifier_type: string;
  update_results: ProgramUpdateResults;
}

export interface JobStatus {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  created_at: string;
  completed_at?: string;
  business_results: BusinessResult[];
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

export interface BusinessProgram {
  active_features: string[];
  available_features: string[];
  end_date: string;
  program_id: string;
  program_pause_status: string;
  program_status: string;
  program_type: string;
  start_date: string;
  program_metrics?: {
    budget: number;
    currency: string;
    is_autobid: boolean;
    max_bid: number | null;
    fee_period: string;
    billed_impressions: number;
    billed_clicks: number;
    ad_cost: number;
  };
  future_budget_changes: any[];
}

export interface BusinessProgramsResponse {
  businesses: Array<{
    yelp_business_id: string;
    advertiser_status: string;
    partner_business_id: string | null;
    programs: BusinessProgram[];
    destination_yelp_business_id: string | null;
  }>;
  errors: any[];
}

export interface ProgramInfoResponse {
  programs: BusinessProgram[];
  errors: any[];
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
