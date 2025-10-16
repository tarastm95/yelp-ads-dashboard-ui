import { describe, expect, it } from 'vitest';
import type { BusinessProgram } from '../types/yelp';
import {
  buildBusinessOptions,
  filterPrograms,
  formatBusinessOptionLabel,
} from './programFilters';

const createProgram = (overrides: Partial<BusinessProgram & {
  yelp_business_id?: string;
  partner_business_id?: string | null;
  business_name?: string;
}>): BusinessProgram & {
  yelp_business_id?: string;
  partner_business_id?: string | null;
  business_name?: string;
} => ({
  active_features: [],
  available_features: [],
  end_date: '2025-12-31',
  program_id: `program-${Math.random().toString(36).slice(2, 8)}`,
  program_pause_status: 'NOT_PAUSED',
  program_status: 'ACTIVE',
  program_type: 'CPC',
  start_date: '2024-01-01',
  future_budget_changes: [],
  ...overrides,
});

describe('filterPrograms', () => {
  it('filters by program type locally', () => {
    const programs = [
      createProgram({ program_type: 'CPC' }),
      createProgram({ program_type: 'BP' }),
    ];

    const result = filterPrograms(programs, {
      programStatus: 'CURRENT',
      programType: 'BP',
    });

    expect(result).toHaveLength(1);
    expect(result[0].program_type).toBe('BP');
  });

  it('filters by business id across yelp and partner ids', () => {
    const programs = [
      createProgram({
        program_id: 'prog-1',
        yelp_business_id: 'YELP-1',
        partner_business_id: 'PARTNER-1',
        program_type: 'CPC',
        businesses: [
          {
            yelp_business_id: 'YELP-1',
            partner_business_id: 'PARTNER-1',
          },
        ],
      }),
      createProgram({
        program_id: 'prog-2',
        program_type: 'CPC',
        businesses: [
          {
            yelp_business_id: 'YELP-2',
            partner_business_id: null,
          },
        ],
      }),
    ];

    const byYelp = filterPrograms(programs, {
      programStatus: 'CURRENT',
      businessId: 'yelp-2',
    });

    const byPartner = filterPrograms(programs, {
      programStatus: 'CURRENT',
      businessId: 'partner-1',
    });

    expect(byYelp).toHaveLength(1);
    expect(byYelp[0].program_id).toBe('prog-2');

    expect(byPartner).toHaveLength(1);
    expect(byPartner[0].program_id).toBe('prog-1');
  });

  it('excludes inactive-like programs when viewing CURRENT', () => {
    const programs = [
      createProgram({ program_id: 'active', program_status: 'ACTIVE' }),
      createProgram({ program_id: 'inactive', program_status: 'INACTIVE' }),
      createProgram({ program_id: 'terminated', program_status: 'TERMINATED' }),
    ];

    const result = filterPrograms(programs, {
      programStatus: 'CURRENT',
    });

    expect(result.map((program) => program.program_id)).toEqual(['active']);
  });
});

describe('buildBusinessOptions', () => {
  const baseProgram = createProgram({
    program_id: 'base',
    business_name: 'Test Business',
    yelp_business_id: 'YELP-123',
    partner_business_id: 'PART-999',
    businesses: [
      {
        yelp_business_id: 'YELP-123',
        partner_business_id: 'PART-999',
      },
    ],
  });

  it('produces unique options for each identifier', () => {
    const programs = [
      baseProgram,
      createProgram({
        program_id: 'second',
        business_name: 'Another',
        businesses: [
          { yelp_business_id: 'YELP-555', partner_business_id: null },
        ],
      }),
    ];

    const options = buildBusinessOptions(programs, 'ALL');

    expect(options).toHaveLength(3);
    const ids = options.map((option) => option.id);
    expect(ids).toContain('YELP-123');
    expect(ids).toContain('PART-999');
    expect(ids).toContain('YELP-555');
  });

  it('formats labels with business names when available', () => {
    const options = buildBusinessOptions([baseProgram], undefined);
    const labels = options.map((option) => formatBusinessOptionLabel(option));

    expect(labels).toContain('Test Business • YELP-123');
    expect(labels).toContain('Test Business • Partner PART-999');
  });

  it('filters options by program type when provided', () => {
    const programs = [
      createProgram({
        program_id: 'cpc-program',
        program_type: 'CPC',
        businesses: [
          { yelp_business_id: 'CPC-1', partner_business_id: null },
        ],
      }),
      createProgram({
        program_id: 'bp-program',
        program_type: 'BP',
        businesses: [
          { yelp_business_id: 'BP-1', partner_business_id: null },
        ],
      }),
    ];

    const options = buildBusinessOptions(programs, 'BP');

    expect(options).toHaveLength(1);
    expect(options[0].id).toBe('BP-1');
  });
});
