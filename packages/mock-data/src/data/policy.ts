// Policy Enforcement mock data — policy rules, violations, appeals

export type PolicyCategory =
  | 'quality'
  | 'delivery'
  | 'pricing'
  | 'listing'
  | 'communication'
  | 'fraud'
  | 'compliance'
  | 'safety'
  | 'content'
  | 'other';

export type PolicySeverity = 'warning' | 'minor' | 'major' | 'critical';

export type PenaltyType = 'warning' | 'suspension' | 'fine' | 'termination';

export type ViolationStatus =
  | 'pending'
  | 'acknowledged'
  | 'under_review'
  | 'appealed'
  | 'resolved'
  | 'dismissed'
  | 'penalty_applied';

export type DetectedBy = 'system' | 'admin' | 'customer_report';

export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'denied' | 'escalated';

export interface MockPolicyRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: PolicyCategory;
  severity: PolicySeverity;
  penalty_type: PenaltyType;
  penalty_value: number;
  suspension_days: number;
  auto_detect: boolean;
  max_violations: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockPolicyViolation {
  id: string;
  violation_number: string;
  store_id: string;
  store_name?: string;
  rule_id: string | null;
  rule_code?: string;
  rule_name?: string;
  category: PolicyCategory;
  severity: PolicySeverity;
  status: ViolationStatus;
  subject: string;
  description: string;
  evidence_urls: string[];
  detected_by: DetectedBy;
  detected_by_user_id: string | null;
  penalty_type: PenaltyType | null;
  penalty_value: number;
  penalty_applied_at: string | null;
  penalty_expires_at: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  appeals?: MockAppeal[];
}

export interface MockAppeal {
  id: string;
  appeal_number: string;
  violation_id: string;
  store_id: string;
  store_name?: string;
  status: AppealStatus;
  reason: string;
  evidence_urls: string[];
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  violation?: MockPolicyViolation;
}

export interface MockViolationStats {
  total: number;
  by_status: Record<ViolationStatus, number>;
  by_severity: Record<PolicySeverity, number>;
  by_category: Record<string, number>;
}

export interface MockAppealStats {
  total: number;
  by_status: Record<AppealStatus, number>;
  approval_rate: number;
}

// ── Mock store IDs (matching existing mock data) ──
const STORE_IDS = {
  FRESH_MART: 'store-001',
  KUYA_JUAN: 'store-002',
  ALING_NENA: 'store-003',
  METRO_SUPER: 'store-004',
};

const STORE_NAMES: Record<string, string> = {
  'store-001': 'Fresh Mart BGC',
  'store-002': "Kuya Juan's Sari-Sari",
  'store-003': "Aling Nena's Pharmacy",
  'store-004': 'Metro Supermarket Makati',
};

// ── Policy Rules ──
export const policyRules: MockPolicyRule[] = [
  {
    id: 'rule-001',
    code: 'LATE_DELIVERY',
    name: 'Late Delivery Violation',
    description: 'Store consistently fails to prepare orders within the estimated preparation time, causing delivery delays.',
    category: 'delivery',
    severity: 'minor',
    penalty_type: 'warning',
    penalty_value: 0,
    suspension_days: 0,
    auto_detect: true,
    max_violations: 5,
    is_active: true,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z',
  },
  {
    id: 'rule-002',
    code: 'COUNTERFEIT_PRODUCT',
    name: 'Counterfeit or Fake Products',
    description: 'Selling counterfeit, knock-off, or fraudulently labeled products on the platform.',
    category: 'fraud',
    severity: 'critical',
    penalty_type: 'termination',
    penalty_value: 0,
    suspension_days: 0,
    auto_detect: false,
    max_violations: 1,
    is_active: true,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z',
  },
  {
    id: 'rule-003',
    code: 'EXPIRED_PRODUCTS',
    name: 'Selling Expired Products',
    description: 'Listing or delivering products past their expiration date to customers.',
    category: 'safety',
    severity: 'major',
    penalty_type: 'suspension',
    penalty_value: 0,
    suspension_days: 7,
    auto_detect: false,
    max_violations: 2,
    is_active: true,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z',
  },
  {
    id: 'rule-004',
    code: 'PRICE_GOUGING',
    name: 'Price Gouging',
    description: 'Artificially inflating prices significantly above market rate during high demand periods.',
    category: 'pricing',
    severity: 'major',
    penalty_type: 'fine',
    penalty_value: 5000,
    suspension_days: 0,
    auto_detect: true,
    max_violations: 3,
    is_active: true,
    created_at: '2026-01-06T08:00:00Z',
    updated_at: '2026-01-06T08:00:00Z',
  },
  {
    id: 'rule-005',
    code: 'MISLEADING_LISTING',
    name: 'Misleading Product Listing',
    description: 'Product listings with inaccurate descriptions, fake images, or misleading information.',
    category: 'listing',
    severity: 'minor',
    penalty_type: 'warning',
    penalty_value: 0,
    suspension_days: 0,
    auto_detect: false,
    max_violations: 3,
    is_active: true,
    created_at: '2026-01-06T08:00:00Z',
    updated_at: '2026-01-06T08:00:00Z',
  },
  {
    id: 'rule-006',
    code: 'POOR_PACKAGING',
    name: 'Poor Product Packaging',
    description: 'Repeated customer complaints about poor packaging resulting in damaged goods during delivery.',
    category: 'quality',
    severity: 'warning',
    penalty_type: 'warning',
    penalty_value: 0,
    suspension_days: 0,
    auto_detect: true,
    max_violations: 5,
    is_active: true,
    created_at: '2026-01-07T08:00:00Z',
    updated_at: '2026-01-07T08:00:00Z',
  },
  {
    id: 'rule-007',
    code: 'UNRESPONSIVE_VENDOR',
    name: 'Unresponsive to Customer Inquiries',
    description: 'Vendor fails to respond to customer messages or disputes within 48 hours.',
    category: 'communication',
    severity: 'minor',
    penalty_type: 'warning',
    penalty_value: 0,
    suspension_days: 0,
    auto_detect: true,
    max_violations: 5,
    is_active: true,
    created_at: '2026-01-07T08:00:00Z',
    updated_at: '2026-01-07T08:00:00Z',
  },
  {
    id: 'rule-008',
    code: 'MISSING_PERMITS',
    name: 'Missing Business Permits',
    description: 'Operating without required business permits, DTI registration, or FDA licenses (for pharmacy).',
    category: 'compliance',
    severity: 'critical',
    penalty_type: 'suspension',
    penalty_value: 0,
    suspension_days: 30,
    auto_detect: false,
    max_violations: 1,
    is_active: true,
    created_at: '2026-01-08T08:00:00Z',
    updated_at: '2026-01-08T08:00:00Z',
  },
  {
    id: 'rule-009',
    code: 'OFFENSIVE_CONTENT',
    name: 'Offensive or Inappropriate Content',
    description: 'Posting offensive, discriminatory, or inappropriate content in product listings or store profile.',
    category: 'content',
    severity: 'major',
    penalty_type: 'suspension',
    penalty_value: 0,
    suspension_days: 14,
    auto_detect: false,
    max_violations: 2,
    is_active: true,
    created_at: '2026-01-08T08:00:00Z',
    updated_at: '2026-01-08T08:00:00Z',
  },
  {
    id: 'rule-010',
    code: 'HIGH_CANCELLATION',
    name: 'Excessive Order Cancellations',
    description: 'Store cancels more than 10% of orders in a rolling 30-day period.',
    category: 'quality',
    severity: 'minor',
    penalty_type: 'warning',
    penalty_value: 0,
    suspension_days: 0,
    auto_detect: true,
    max_violations: 3,
    is_active: true,
    created_at: '2026-01-09T08:00:00Z',
    updated_at: '2026-01-09T08:00:00Z',
  },
];

// ── Policy Violations ──
export const policyViolations: MockPolicyViolation[] = [
  {
    id: 'viol-001',
    violation_number: 'VIO-2026-000001',
    store_id: STORE_IDS.FRESH_MART,
    store_name: STORE_NAMES[STORE_IDS.FRESH_MART],
    rule_id: 'rule-001',
    rule_code: 'LATE_DELIVERY',
    rule_name: 'Late Delivery Violation',
    category: 'delivery',
    severity: 'minor',
    status: 'pending',
    subject: 'Consistent late preparation of orders',
    description: 'Store has missed the preparation time on 15 out of 50 orders in the last 7 days. Average delay is 25 minutes beyond estimated preparation time.',
    evidence_urls: [],
    detected_by: 'system',
    detected_by_user_id: null,
    penalty_type: null,
    penalty_value: 0,
    penalty_applied_at: null,
    penalty_expires_at: null,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-02-20T10:30:00Z',
    updated_at: '2026-02-20T10:30:00Z',
    appeals: [],
  },
  {
    id: 'viol-002',
    violation_number: 'VIO-2026-000002',
    store_id: STORE_IDS.KUYA_JUAN,
    store_name: STORE_NAMES[STORE_IDS.KUYA_JUAN],
    rule_id: 'rule-003',
    rule_code: 'EXPIRED_PRODUCTS',
    rule_name: 'Selling Expired Products',
    category: 'safety',
    severity: 'major',
    status: 'acknowledged',
    subject: 'Expired canned goods delivered to customer',
    description: 'Customer reported receiving 3 cans of sardines that expired 2 months ago. Photos provided as evidence.',
    evidence_urls: ['https://cdn.daltaners.ph/evidence/expired-001.jpg', 'https://cdn.daltaners.ph/evidence/expired-002.jpg'],
    detected_by: 'customer_report',
    detected_by_user_id: null,
    penalty_type: null,
    penalty_value: 0,
    penalty_applied_at: null,
    penalty_expires_at: null,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-02-18T14:00:00Z',
    updated_at: '2026-02-19T09:00:00Z',
    appeals: [],
  },
  {
    id: 'viol-003',
    violation_number: 'VIO-2026-000003',
    store_id: STORE_IDS.METRO_SUPER,
    store_name: STORE_NAMES[STORE_IDS.METRO_SUPER],
    rule_id: 'rule-004',
    rule_code: 'PRICE_GOUGING',
    rule_name: 'Price Gouging',
    category: 'pricing',
    severity: 'major',
    status: 'under_review',
    subject: 'Significant price increase during typhoon season',
    description: 'System detected a 300% price increase on bottled water and canned goods during Typhoon Aghon.',
    evidence_urls: [],
    detected_by: 'system',
    detected_by_user_id: null,
    penalty_type: null,
    penalty_value: 0,
    penalty_applied_at: null,
    penalty_expires_at: null,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-02-15T08:00:00Z',
    updated_at: '2026-02-16T10:00:00Z',
    appeals: [],
  },
  {
    id: 'viol-004',
    violation_number: 'VIO-2026-000004',
    store_id: STORE_IDS.FRESH_MART,
    store_name: STORE_NAMES[STORE_IDS.FRESH_MART],
    rule_id: 'rule-005',
    rule_code: 'MISLEADING_LISTING',
    rule_name: 'Misleading Product Listing',
    category: 'listing',
    severity: 'minor',
    status: 'appealed',
    subject: 'Product images do not match actual product',
    description: 'Multiple customers reported that the images for "Organic Brown Rice 5kg" do not match the actual product received. Stock photos were used instead of actual product photos.',
    evidence_urls: ['https://cdn.daltaners.ph/evidence/listing-001.jpg'],
    detected_by: 'admin',
    detected_by_user_id: 'admin-001',
    penalty_type: 'warning',
    penalty_value: 0,
    penalty_applied_at: '2026-02-12T14:00:00Z',
    penalty_expires_at: null,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-02-10T11:00:00Z',
    updated_at: '2026-02-13T09:00:00Z',
    appeals: [
      {
        id: 'appeal-001',
        appeal_number: 'APL-2026-000001',
        violation_id: 'viol-004',
        store_id: STORE_IDS.FRESH_MART,
        store_name: STORE_NAMES[STORE_IDS.FRESH_MART],
        status: 'pending',
        reason: 'The images used were provided by the supplier and we believed them to be accurate representations. We have since updated the listing with actual product photos taken in-store.',
        evidence_urls: ['https://cdn.daltaners.ph/evidence/appeal-new-photo.jpg'],
        admin_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: '2026-02-13T09:00:00Z',
        updated_at: '2026-02-13T09:00:00Z',
      },
    ],
  },
  {
    id: 'viol-005',
    violation_number: 'VIO-2026-000005',
    store_id: STORE_IDS.KUYA_JUAN,
    store_name: STORE_NAMES[STORE_IDS.KUYA_JUAN],
    rule_id: 'rule-006',
    rule_code: 'POOR_PACKAGING',
    rule_name: 'Poor Product Packaging',
    category: 'quality',
    severity: 'warning',
    status: 'resolved',
    subject: 'Repeated complaints about broken items',
    description: 'Five customers in the past week reported receiving broken items due to poor packaging. Items include glass containers and fragile snacks.',
    evidence_urls: ['https://cdn.daltaners.ph/evidence/packaging-001.jpg'],
    detected_by: 'system',
    detected_by_user_id: null,
    penalty_type: 'warning',
    penalty_value: 0,
    penalty_applied_at: '2026-02-05T10:00:00Z',
    penalty_expires_at: null,
    resolution_notes: 'Vendor has updated packaging procedures and purchased bubble wrap and proper containers. Issue has been addressed.',
    resolved_by: 'admin-001',
    resolved_at: '2026-02-08T14:00:00Z',
    created_at: '2026-02-03T09:00:00Z',
    updated_at: '2026-02-08T14:00:00Z',
    appeals: [],
  },
  {
    id: 'viol-006',
    violation_number: 'VIO-2026-000006',
    store_id: STORE_IDS.ALING_NENA,
    store_name: STORE_NAMES[STORE_IDS.ALING_NENA],
    rule_id: 'rule-008',
    rule_code: 'MISSING_PERMITS',
    rule_name: 'Missing Business Permits',
    category: 'compliance',
    severity: 'critical',
    status: 'penalty_applied',
    subject: 'FDA license expired and not renewed',
    description: 'Routine audit revealed that the pharmacy FDA license expired on January 15, 2026, and has not been renewed. Store cannot operate as pharmacy without valid FDA license.',
    evidence_urls: [],
    detected_by: 'admin',
    detected_by_user_id: 'admin-002',
    penalty_type: 'suspension',
    penalty_value: 0,
    penalty_applied_at: '2026-02-01T10:00:00Z',
    penalty_expires_at: '2026-03-03T10:00:00Z',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-01-30T14:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
    appeals: [
      {
        id: 'appeal-002',
        appeal_number: 'APL-2026-000002',
        violation_id: 'viol-006',
        store_id: STORE_IDS.ALING_NENA,
        store_name: STORE_NAMES[STORE_IDS.ALING_NENA],
        status: 'denied',
        reason: 'We have already submitted the renewal application to FDA and are waiting for processing. Our permit is in the renewal process, not expired.',
        evidence_urls: ['https://cdn.daltaners.ph/evidence/fda-renewal-receipt.jpg'],
        admin_notes: 'Renewal application was filed but the store continued operating without a valid license during the gap period. Suspension upheld until valid FDA license is presented.',
        reviewed_by: 'admin-002',
        reviewed_at: '2026-02-05T14:00:00Z',
        created_at: '2026-02-02T09:00:00Z',
        updated_at: '2026-02-05T14:00:00Z',
      },
    ],
  },
  {
    id: 'viol-007',
    violation_number: 'VIO-2026-000007',
    store_id: STORE_IDS.METRO_SUPER,
    store_name: STORE_NAMES[STORE_IDS.METRO_SUPER],
    rule_id: 'rule-010',
    rule_code: 'HIGH_CANCELLATION',
    rule_name: 'Excessive Order Cancellations',
    category: 'quality',
    severity: 'minor',
    status: 'dismissed',
    subject: 'Cancellation rate exceeded 10% threshold',
    description: 'Store cancelled 18 out of 120 orders (15%) in the past 30 days. System auto-detected this violation.',
    evidence_urls: [],
    detected_by: 'system',
    detected_by_user_id: null,
    penalty_type: null,
    penalty_value: 0,
    penalty_applied_at: null,
    penalty_expires_at: null,
    resolution_notes: 'Cancellations were due to a system integration issue with inventory sync. The issue has been identified and fixed by the platform engineering team. Dismissing as the root cause was not the vendor\'s fault.',
    resolved_by: 'admin-001',
    resolved_at: '2026-02-14T16:00:00Z',
    created_at: '2026-02-12T08:00:00Z',
    updated_at: '2026-02-14T16:00:00Z',
    appeals: [],
  },
  {
    id: 'viol-008',
    violation_number: 'VIO-2026-000008',
    store_id: STORE_IDS.FRESH_MART,
    store_name: STORE_NAMES[STORE_IDS.FRESH_MART],
    rule_id: 'rule-007',
    rule_code: 'UNRESPONSIVE_VENDOR',
    rule_name: 'Unresponsive to Customer Inquiries',
    category: 'communication',
    severity: 'minor',
    status: 'penalty_applied',
    subject: 'Failed to respond to 8 customer messages',
    description: 'Vendor did not respond to 8 customer inquiries and 2 dispute messages within the required 48-hour window over the past 14 days.',
    evidence_urls: [],
    detected_by: 'system',
    detected_by_user_id: null,
    penalty_type: 'warning',
    penalty_value: 0,
    penalty_applied_at: '2026-02-22T10:00:00Z',
    penalty_expires_at: null,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-02-21T08:00:00Z',
    updated_at: '2026-02-22T10:00:00Z',
    appeals: [],
  },
];

// ── Appeals (standalone list, includes above + additional) ──
export const policyAppeals: MockAppeal[] = [
  // Appeal for viol-004 (Misleading Listing)
  {
    ...policyViolations[3].appeals![0],
    violation: { ...policyViolations[3], appeals: undefined },
  },
  // Appeal for viol-006 (Missing Permits)
  {
    ...policyViolations[5].appeals![0],
    violation: { ...policyViolations[5], appeals: undefined },
  },
  // Additional appeal — approved example
  {
    id: 'appeal-003',
    appeal_number: 'APL-2026-000003',
    violation_id: 'viol-001',
    store_id: STORE_IDS.FRESH_MART,
    store_name: STORE_NAMES[STORE_IDS.FRESH_MART],
    status: 'approved',
    reason: 'The late deliveries were caused by construction blocking our loading area for 3 days. We have arranged an alternative loading location and the issue is resolved.',
    evidence_urls: ['https://cdn.daltaners.ph/evidence/construction-notice.jpg'],
    admin_notes: 'Verified construction notice from BGC management. External factor confirmed. Violation dismissed.',
    reviewed_by: 'admin-001',
    reviewed_at: '2026-02-22T11:00:00Z',
    created_at: '2026-02-21T08:30:00Z',
    updated_at: '2026-02-22T11:00:00Z',
    violation: { ...policyViolations[0], appeals: undefined },
  },
  // Additional appeal — under review
  {
    id: 'appeal-004',
    appeal_number: 'APL-2026-000004',
    violation_id: 'viol-003',
    store_id: STORE_IDS.METRO_SUPER,
    store_name: STORE_NAMES[STORE_IDS.METRO_SUPER],
    status: 'under_review',
    reason: 'The price increase was for a different variant of bottled water (imported brand) that we just started carrying. The regular brand prices were unchanged. This was not gouging.',
    evidence_urls: ['https://cdn.daltaners.ph/evidence/price-comparison.jpg'],
    admin_notes: 'Checking supplier invoices to verify claim about different variant.',
    reviewed_by: 'admin-002',
    reviewed_at: '2026-02-17T10:00:00Z',
    created_at: '2026-02-16T14:00:00Z',
    updated_at: '2026-02-17T10:00:00Z',
    violation: { ...policyViolations[2], appeals: undefined },
  },
  // Additional appeal — escalated
  {
    id: 'appeal-005',
    appeal_number: 'APL-2026-000005',
    violation_id: 'viol-008',
    store_id: STORE_IDS.FRESH_MART,
    store_name: STORE_NAMES[STORE_IDS.FRESH_MART],
    status: 'escalated',
    reason: 'Our chat system was not receiving notifications due to a technical issue with the app. We responded via email to some customers but the in-app responses were not being tracked.',
    evidence_urls: ['https://cdn.daltaners.ph/evidence/email-responses.pdf'],
    admin_notes: 'Escalated to engineering team to verify if there was a notification delivery issue during this period.',
    reviewed_by: 'admin-001',
    reviewed_at: '2026-02-23T14:00:00Z',
    created_at: '2026-02-22T16:00:00Z',
    updated_at: '2026-02-23T14:00:00Z',
    violation: { ...policyViolations[7], appeals: undefined },
  },
];

// ── Stats computation ──
export function computeViolationStats(violations: MockPolicyViolation[] = policyViolations): MockViolationStats {
  const by_status: Record<string, number> = {};
  const by_severity: Record<string, number> = {};
  const by_category: Record<string, number> = {};

  for (const v of violations) {
    by_status[v.status] = (by_status[v.status] || 0) + 1;
    by_severity[v.severity] = (by_severity[v.severity] || 0) + 1;
    by_category[v.category] = (by_category[v.category] || 0) + 1;
  }

  return {
    total: violations.length,
    by_status: by_status as Record<ViolationStatus, number>,
    by_severity: by_severity as Record<PolicySeverity, number>,
    by_category,
  };
}

export function computeAppealStats(appeals: MockAppeal[] = policyAppeals): MockAppealStats {
  const by_status: Record<string, number> = {};

  for (const a of appeals) {
    by_status[a.status] = (by_status[a.status] || 0) + 1;
  }

  const approved = by_status['approved'] || 0;
  const denied = by_status['denied'] || 0;
  const decided = approved + denied;

  return {
    total: appeals.length,
    by_status: by_status as Record<AppealStatus, number>,
    approval_rate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
  };
}
