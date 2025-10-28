
export interface Program {
  program_id: string;
  partner_program_id?: string;
  job_id?: string;
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
  budget?: number;
  max_bid?: number;
  is_autobid?: boolean;
  start?: string;
  end?: string;
  promotion_code?: string;
  currency?: string;
  pacing_method?: 'paced' | 'unpaced';
  fee_period?: 'CALENDAR_MONTH' | 'ROLLING_MONTH';
  ad_categories?: string[];
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
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  created_at: string;
  completed_at?: string;
  business_results?: BusinessResult[];
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
  custom_name?: string | null; // User-editable custom name (local DB only)
  business_name?: string; // Business name from Yelp Fusion API
  business_url?: string; // Business URL on Yelp
  business_alias?: string; // Business alias for URL
  businesses?: Array<{
    yelp_business_id: string;
    partner_business_id: string | null;
  }>;
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

// ========== Program Features Types ==========

// Base interface for all feature types
export interface ProgramFeature {
  feature_type: string;
}

// LINK_TRACKING feature
export interface LinkTrackingFeature extends ProgramFeature {
  feature_type: 'LINK_TRACKING';
  website: string | null;
  menu: string | null;
  url: string | null;
}

// NEGATIVE_KEYWORD_TARGETING feature  
export interface NegativeKeywordTargetingFeature extends ProgramFeature {
  feature_type: 'NEGATIVE_KEYWORD_TARGETING';
  suggested_keywords?: string[];
  blocked_keywords: string[];
}

// STRICT_CATEGORY_TARGETING feature
export interface StrictCategoryTargetingFeature extends ProgramFeature {
  feature_type: 'STRICT_CATEGORY_TARGETING';
  enabled: boolean;
}

// AD_SCHEDULING feature
export interface AdSchedulingFeature extends ProgramFeature {
  feature_type: 'AD_SCHEDULING';
  uses_opening_hours: boolean;
}

// CUSTOM_LOCATION_TARGETING feature
export interface CustomLocationTargetingBusiness {
  business_id: string;
  locations: string[]; // Up to 25 locations (zip codes, cities, etc.)
}

export interface CustomLocationTargetingFeature extends ProgramFeature {
  feature_type: 'CUSTOM_LOCATION_TARGETING';
  businesses: CustomLocationTargetingBusiness[];
}

// AD_GOAL feature
export interface AdGoalFeature extends ProgramFeature {
  feature_type: 'AD_GOAL';
  ad_goal: 'DEFAULT' | 'CALLS' | 'WEBSITE_CLICKS';
}

// CALL_TRACKING feature
export interface CallTrackingBusiness {
  business_id: string;
  metered_phone_number: string | null;
}

export interface CallTrackingFeature extends ProgramFeature {
  feature_type: 'CALL_TRACKING';
  enabled: boolean;
  businesses: CallTrackingBusiness[];
}

// SERVICE_OFFERINGS_TARGETING feature
export interface ServiceOfferingsTargetingFeature extends ProgramFeature {
  feature_type: 'SERVICE_OFFERINGS_TARGETING';
  disabled_service_offerings: string[];
  enabled_service_offerings: string[];
}

// BUSINESS_HIGHLIGHTS feature
export interface BusinessHighlightsFeature extends ProgramFeature {
  feature_type: 'BUSINESS_HIGHLIGHTS';
  active_business_highlights: string[];
  available_business_highlights: string[];
  mutually_exclusive_business_highlights: string[][];
}

// VERIFIED_LICENSE feature
export interface VerifiedLicense {
  license_number: string;
  license_expiry_date?: string; // YYYY-MM-DD format
  license_trade?: string;
  license_issuing_agency?: string;
  license_verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  license_verification_failure_reason?: string;
}

export interface VerifiedLicenseFeature extends ProgramFeature {
  feature_type: 'VERIFIED_LICENSE';
  licenses: VerifiedLicense[];
}

// CUSTOM_RADIUS_TARGETING feature
export interface CustomRadiusTargetingFeature extends ProgramFeature {
  feature_type: 'CUSTOM_RADIUS_TARGETING';
  custom_radius?: number | null; // 1 to 60 miles, null means inactive
}

// CUSTOM_AD_TEXT feature
export interface CustomAdTextFeature extends ProgramFeature {
  feature_type: 'CUSTOM_AD_TEXT';
  custom_review_id?: string;
  custom_text?: string;
  // Note: Only one field can be set
}

// CUSTOM_AD_PHOTO feature
export interface CustomAdPhotoFeature extends ProgramFeature {
  feature_type: 'CUSTOM_AD_PHOTO';
  custom_photo_id?: string;
}

// BUSINESS_LOGO feature
export interface BusinessLogoFeature extends ProgramFeature {
  feature_type: 'BUSINESS_LOGO';
  business_logo_url?: string;
}

// YELP_PORTFOLIO feature
export interface YelpPortfolioProject {
  project_id: string;
  published: boolean;
}

export interface YelpPortfolioFeature extends ProgramFeature {
  feature_type: 'YELP_PORTFOLIO';
  projects: YelpPortfolioProject[];
}

// Union type for all features
export type AnyProgramFeature = 
  | LinkTrackingFeature
  | NegativeKeywordTargetingFeature
  | StrictCategoryTargetingFeature
  | AdSchedulingFeature
  | CustomLocationTargetingFeature
  | AdGoalFeature
  | CallTrackingFeature
  | ServiceOfferingsTargetingFeature
  | BusinessHighlightsFeature
  | VerifiedLicenseFeature
  | CustomRadiusTargetingFeature
  | CustomAdTextFeature
  | CustomAdPhotoFeature
  | BusinessLogoFeature
  | YelpPortfolioFeature;

// Program Features Response from API
export interface ProgramFeaturesResponse {
  features: {
    [key: string]: AnyProgramFeature;
  };
}

// Program Features Update Request
export interface ProgramFeaturesUpdateRequest {
  features: {
    [key: string]: Partial<AnyProgramFeature>;
  };
}

// ========== Validation Utilities ==========

// Supported feature types enum
export enum ProgramFeatureType {
  LINK_TRACKING = 'LINK_TRACKING',
  NEGATIVE_KEYWORD_TARGETING = 'NEGATIVE_KEYWORD_TARGETING', 
  STRICT_CATEGORY_TARGETING = 'STRICT_CATEGORY_TARGETING',
  AD_SCHEDULING = 'AD_SCHEDULING',
  CUSTOM_LOCATION_TARGETING = 'CUSTOM_LOCATION_TARGETING',
  AD_GOAL = 'AD_GOAL',
  CALL_TRACKING = 'CALL_TRACKING',
  SERVICE_OFFERINGS_TARGETING = 'SERVICE_OFFERINGS_TARGETING',
  BUSINESS_HIGHLIGHTS = 'BUSINESS_HIGHLIGHTS',
  VERIFIED_LICENSE = 'VERIFIED_LICENSE',
  CUSTOM_RADIUS_TARGETING = 'CUSTOM_RADIUS_TARGETING',
  CUSTOM_AD_TEXT = 'CUSTOM_AD_TEXT',
  CUSTOM_AD_PHOTO = 'CUSTOM_AD_PHOTO',
  BUSINESS_LOGO = 'BUSINESS_LOGO',
  YELP_PORTFOLIO = 'YELP_PORTFOLIO',
}

// Validation schemas based on Yelp API documentation
export const FeatureValidation = {
  CUSTOM_RADIUS_TARGETING: {
    custom_radius: {
      type: 'number',
      min: 1,
      max: 60,
      nullable: true,
      description: 'Radius in miles (1 to 60) or null to disable'
    }
  },
  
  AD_GOAL: {
    ad_goal: {
      type: 'enum',
      values: ['DEFAULT', 'CALLS', 'WEBSITE_CLICKS'],
      required: true,
      description: 'Must be one of DEFAULT, CALLS, or WEBSITE_CLICKS'
    }
  },
  
  CUSTOM_LOCATION_TARGETING: {
    businesses: {
      type: 'array',
      maxItems: 25,
      required: true,
      itemSchema: {
        business_id: { type: 'string', required: true },
        locations: { 
          type: 'array', 
          maxItems: 25, 
          required: true,
          description: 'Up to 25 locations per business (US only: ZIP codes, cities, counties, states)'
        }
      }
    }
  },
  
  CUSTOM_AD_TEXT: {
    oneOf: ['custom_text', 'custom_review_id'],
    custom_review_id: {
      type: 'string',
      nullable: true,
      description: 'Identifier of the review to extract text from'
    },
    custom_text: {
      type: 'string', 
      nullable: true,
      description: 'Custom text to be shown'
    }
  },
  
  BUSINESS_LOGO: {
    business_logo_url: {
      type: 'url',
      nullable: true,
      formats: ['jpeg', 'png', 'gif', 'tiff'],
      description: 'URL must be publicly accessible image file'
    }
  },
  
  VERIFIED_LICENSE: {
    licenses: {
      type: 'array',
      required: true,
      itemSchema: {
        license_number: { type: 'string', required: true },
        license_verification_status: { 
          type: 'enum', 
          values: ['PENDING', 'VERIFIED', 'REJECTED'],
          required: true 
        },
        license_expiry_date: { 
          type: 'date', 
          format: 'YYYY-MM-DD',
          nullable: true 
        }
      }
    }
  }
} as const;

// Helper function to validate feature data
export function validateFeature(featureType: string, featureData: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic type validation
  if (!Object.values(ProgramFeatureType).includes(featureType as ProgramFeatureType)) {
    errors.push(`Unsupported feature type: ${featureType}`);
    return { isValid: false, errors };
  }
  
  // Specific validations based on Yelp API requirements
  switch (featureType) {
    case ProgramFeatureType.CUSTOM_RADIUS_TARGETING:
      if (featureData.custom_radius !== null && featureData.custom_radius !== undefined) {
        const radius = featureData.custom_radius;
        if (typeof radius !== 'number' || radius < 1 || radius > 60) {
          errors.push('custom_radius must be between 1 and 60 miles or null');
        }
      }
      break;
      
    case ProgramFeatureType.AD_GOAL:
      if (!['DEFAULT', 'CALLS', 'WEBSITE_CLICKS'].includes(featureData.ad_goal)) {
        errors.push('ad_goal must be one of: DEFAULT, CALLS, WEBSITE_CLICKS');
      }
      break;
      
    case ProgramFeatureType.CUSTOM_AD_TEXT:
      const hasCustomText = featureData.custom_text !== null && featureData.custom_text !== undefined;
      const hasCustomReview = featureData.custom_review_id !== null && featureData.custom_review_id !== undefined;
      
      if (hasCustomText && hasCustomReview) {
        errors.push('Only one of custom_text or custom_review_id can be set');
      }
      break;
      
    case ProgramFeatureType.CUSTOM_LOCATION_TARGETING:
      if (!Array.isArray(featureData.businesses)) {
        errors.push('businesses must be an array');
      } else {
        featureData.businesses.forEach((business: any, index: number) => {
          if (!business.business_id) {
            errors.push(`businesses[${index}].business_id is required`);
          }
          if (!Array.isArray(business.locations)) {
            errors.push(`businesses[${index}].locations must be an array`);
          } else if (business.locations.length > 25) {
            errors.push(`businesses[${index}].locations cannot exceed 25 items`);
          }
        });
      }
      break;
      
    case ProgramFeatureType.VERIFIED_LICENSE:
      if (!Array.isArray(featureData.licenses)) {
        errors.push('licenses must be an array');
      } else {
        featureData.licenses.forEach((license: any, index: number) => {
          if (!license.license_number) {
            errors.push(`licenses[${index}].license_number is required`);
          }
          if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(license.license_verification_status)) {
            errors.push(`licenses[${index}].license_verification_status must be PENDING, VERIFIED, or REJECTED`);
          }
        });
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
