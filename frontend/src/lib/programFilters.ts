import type { BusinessProgram } from '../types/yelp';

type EnhancedBusinessProgram = BusinessProgram & {
  yelp_business_id?: string | null;
  partner_business_id?: string | null;
  business_name?: string | null;
};

type BusinessIdentifier = {
  id: string;
  yelpBusinessId?: string | null;
  partnerBusinessId?: string | null;
  businessName?: string | null;
};

const CURRENT_STATUS_EXCLUSIONS = new Set(['INACTIVE', 'TERMINATED', 'EXPIRED']);

const normalize = (value?: string | null) => value?.toLowerCase();

const collectBusinessIdentifiers = (program: EnhancedBusinessProgram): BusinessIdentifier[] => {
  const identifiers = new Map<string, BusinessIdentifier>();

  const register = (id?: string | null, yelpId?: string | null, partnerId?: string | null) => {
    if (!id) {
      return;
    }
    const normalized = normalize(id);
    if (!normalized) {
      return;
    }

    const existing = identifiers.get(normalized);
    if (existing) {
      if (!existing.yelpBusinessId && yelpId) {
        existing.yelpBusinessId = yelpId;
      }
      if (!existing.partnerBusinessId && partnerId) {
        existing.partnerBusinessId = partnerId;
      }
      if (!existing.businessName && program.business_name) {
        existing.businessName = program.business_name;
      }
      return;
    }

    identifiers.set(normalized, {
      id,
      yelpBusinessId: yelpId ?? null,
      partnerBusinessId: partnerId ?? null,
      businessName: program.business_name ?? null,
    });
  };

  if (program.businesses && Array.isArray(program.businesses)) {
    for (const business of program.businesses) {
      register(business.yelp_business_id, business.yelp_business_id, business.partner_business_id);
      register(business.partner_business_id, business.yelp_business_id, business.partner_business_id);
    }
  }

  register(program.yelp_business_id, program.yelp_business_id, program.partner_business_id ?? null);
  register(program.partner_business_id ?? null, program.yelp_business_id ?? null, program.partner_business_id ?? null);

  return Array.from(identifiers.values());
};

export interface ProgramFilters {
  programStatus: string;
  programType?: string | null;
  businessId?: string | null;
}

export const filterPrograms = (
  programs: BusinessProgram[],
  { programStatus, programType, businessId }: ProgramFilters,
): BusinessProgram[] => {
  const normalizedType = normalize(programType);
  const normalizedBusinessId = normalize(businessId);

  return programs.filter((program) => {
    if (programStatus === 'CURRENT' && CURRENT_STATUS_EXCLUSIONS.has(program.program_status)) {
      return false;
    }

    if (normalizedType && normalizedType !== 'all' && normalize(program.program_type) !== normalizedType) {
      return false;
    }

    if (normalizedBusinessId && normalizedBusinessId !== 'all') {
      const identifiers = collectBusinessIdentifiers(program as EnhancedBusinessProgram);
      return identifiers.some((identifier) => normalize(identifier.id) === normalizedBusinessId);
    }

    return true;
  });
};

export interface BusinessOption {
  id: string;
  programCount: number;
  businessName?: string | null;
  yelpBusinessId?: string | null;
  partnerBusinessId?: string | null;
}

const buildLabel = (option: BusinessOption): string => {
  const displayName = option.businessName?.trim();
  if (displayName) {
    if (option.partnerBusinessId && option.id === option.partnerBusinessId) {
      return `${displayName} • Partner ${option.id}`;
    }
    return `${displayName} • ${option.id}`;
  }
  return option.id;
};

export const formatBusinessOptionLabel = (option: BusinessOption): string => buildLabel(option);

export const buildBusinessOptions = (
  programs: BusinessProgram[],
  programType?: string | null,
): BusinessOption[] => {
  const normalizedType = normalize(programType);
  const map = new Map<string, BusinessOption>();

  programs.forEach((program) => {
    if (normalizedType && normalizedType !== 'all' && normalize(program.program_type) !== normalizedType) {
      return;
    }

    const identifiers = collectBusinessIdentifiers(program as EnhancedBusinessProgram);
    const seenForProgram = new Set<string>();

    identifiers.forEach((identifier) => {
      const normalizedId = normalize(identifier.id);
      if (!normalizedId || seenForProgram.has(normalizedId)) {
        return;
      }
      seenForProgram.add(normalizedId);

      const existing = map.get(normalizedId);
      if (existing) {
        existing.programCount += 1;
        if (!existing.businessName && identifier.businessName) {
          existing.businessName = identifier.businessName;
        }
        if (!existing.yelpBusinessId && identifier.yelpBusinessId) {
          existing.yelpBusinessId = identifier.yelpBusinessId;
        }
        if (!existing.partnerBusinessId && identifier.partnerBusinessId) {
          existing.partnerBusinessId = identifier.partnerBusinessId;
        }
      } else {
        map.set(normalizedId, {
          id: identifier.id,
          programCount: 1,
          businessName: identifier.businessName ?? null,
          yelpBusinessId: identifier.yelpBusinessId ?? null,
          partnerBusinessId: identifier.partnerBusinessId ?? null,
        });
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => buildLabel(a).localeCompare(buildLabel(b)));
};

export default filterPrograms;
