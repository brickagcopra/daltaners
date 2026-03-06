export type DisputeCategory =
  | 'order_not_received'
  | 'item_missing'
  | 'wrong_item'
  | 'damaged_item'
  | 'quality_issue'
  | 'overcharged'
  | 'late_delivery'
  | 'vendor_behavior'
  | 'delivery_behavior'
  | 'unauthorized_charge'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'vendor_response'
  | 'customer_reply'
  | 'under_review'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export type DisputeRequestedResolution =
  | 'refund'
  | 'partial_refund'
  | 'replacement'
  | 'store_credit'
  | 'apology'
  | 'other';

export type DisputeResolutionType =
  | 'refund'
  | 'partial_refund'
  | 'replacement'
  | 'store_credit'
  | 'no_action'
  | 'warning_issued';

export interface MockDisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_role: 'customer' | 'vendor_owner' | 'vendor_staff' | 'admin';
  message: string;
  attachments: string[];
  is_internal: boolean;
  created_at: string;
}

export interface MockDispute {
  id: string;
  dispute_number: string;
  order_id: string;
  return_request_id: string | null;
  customer_id: string;
  store_id: string;
  category: DisputeCategory;
  status: DisputeStatus;
  priority: DisputePriority;
  subject: string;
  description: string;
  evidence_urls: string[];
  requested_resolution: DisputeRequestedResolution;
  resolution_type: DisputeResolutionType | null;
  resolution_amount: number;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  escalated_at: string | null;
  escalation_reason: string | null;
  vendor_response_deadline: string | null;
  admin_assigned_to: string | null;
  messages: MockDisputeMessage[];
  created_at: string;
  updated_at: string;
}

export const disputes: MockDispute[] = [
  // Dispute 1: Resolved — overcharged on delivery fee
  {
    id: 'disp-001',
    dispute_number: 'DSP-20260225-001',
    order_id: 'ord-001',
    return_request_id: null,
    customer_id: 'u-cust-001',
    store_id: 'store-001',
    category: 'overcharged',
    status: 'resolved',
    priority: 'medium',
    subject: 'Overcharged delivery fee on my order',
    description: 'Na-charge ako ng P149 na delivery fee pero ang distance ng bahay ko sa store ay 1.5km lang. Dapat P49 lang ang delivery fee based sa zone pricing na nakita ko.',
    evidence_urls: [
      'https://placehold.co/400x300/3b82f6/white?text=Receipt+Screenshot',
    ],
    requested_resolution: 'partial_refund',
    resolution_type: 'partial_refund',
    resolution_amount: 100.00,
    resolution_notes: 'Verified that the delivery fee calculation was incorrect due to a zone boundary misconfiguration. Refunded the difference.',
    resolved_by: 'u-admin-001',
    resolved_at: '2026-02-26T14:00:00Z',
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: null,
    admin_assigned_to: 'u-admin-001',
    messages: [
      {
        id: 'msg-001-1',
        dispute_id: 'disp-001',
        sender_id: 'u-cust-001',
        sender_role: 'customer',
        message: 'Bakit ang mahal ng delivery fee ko? P149 pero malapit lang naman ang store sa bahay ko. Sabi sa app P49 lang dapat.',
        attachments: ['https://placehold.co/400x300/3b82f6/white?text=Receipt+Screenshot'],
        is_internal: false,
        created_at: '2026-02-25T10:00:00Z',
      },
      {
        id: 'msg-001-2',
        dispute_id: 'disp-001',
        sender_id: 'u-vendor-001',
        sender_role: 'vendor_owner',
        message: 'We checked the order and the delivery fee was set by the platform, not by us. We suggest contacting Daltaners support for the fee dispute.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-25T14:30:00Z',
      },
      {
        id: 'msg-001-3',
        dispute_id: 'disp-001',
        sender_id: 'u-admin-001',
        sender_role: 'admin',
        message: 'We have verified the zone configuration. The customer is correct — the delivery fee should have been P49. We are issuing a P100 refund for the overcharge.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-26T14:00:00Z',
      },
      {
        id: 'msg-001-4',
        dispute_id: 'disp-001',
        sender_id: 'u-admin-001',
        sender_role: 'admin',
        message: 'Internal note: Zone boundary for store-001 was misconfigured. Filed ticket INFRA-234 to fix the zone polygon.',
        attachments: [],
        is_internal: true,
        created_at: '2026-02-26T14:05:00Z',
      },
    ],
    created_at: '2026-02-25T10:00:00Z',
    updated_at: '2026-02-26T14:00:00Z',
  },

  // Dispute 2: Open — order not received
  {
    id: 'disp-002',
    dispute_number: 'DSP-20260301-002',
    order_id: 'ord-004',
    return_request_id: null,
    customer_id: 'u-cust-002',
    store_id: 'store-001',
    category: 'order_not_received',
    status: 'open',
    priority: 'high',
    subject: 'Hindi ko nareceive ang order ko',
    description: 'Sabi sa app delivered na daw pero wala namang dumating sa bahay ko. Walang nagtext o tumawag na rider. Naghintay ako buong araw.',
    evidence_urls: [
      'https://placehold.co/400x300/ef4444/white?text=Empty+Doorstep',
    ],
    requested_resolution: 'refund',
    resolution_type: null,
    resolution_amount: 0,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: '2026-03-03T10:00:00Z',
    admin_assigned_to: null,
    messages: [
      {
        id: 'msg-002-1',
        dispute_id: 'disp-002',
        sender_id: 'u-cust-002',
        sender_role: 'customer',
        message: 'Sabi sa app delivered na pero wala po akong nareceive. Please check niyo po. Hindi na-contact ang rider.',
        attachments: ['https://placehold.co/400x300/ef4444/white?text=Empty+Doorstep'],
        is_internal: false,
        created_at: '2026-03-01T10:00:00Z',
      },
    ],
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },

  // Dispute 3: Vendor responded — wrong item
  {
    id: 'disp-003',
    dispute_number: 'DSP-20260228-003',
    order_id: 'ord-003',
    return_request_id: null,
    customer_id: 'u-cust-003',
    store_id: 'store-005',
    category: 'wrong_item',
    status: 'vendor_response',
    priority: 'medium',
    subject: 'Wrong items delivered to me',
    description: 'I ordered Chicken Adobo but received Pork Sinigang. The items are completely different from what I ordered. I have photos as proof.',
    evidence_urls: [
      'https://placehold.co/400x300/f97316/white?text=Wrong+Food+Item',
      'https://placehold.co/400x300/f97316/white?text=Order+Confirmation',
    ],
    requested_resolution: 'replacement',
    resolution_type: null,
    resolution_amount: 0,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: '2026-03-02T16:00:00Z',
    admin_assigned_to: null,
    messages: [
      {
        id: 'msg-003-1',
        dispute_id: 'disp-003',
        sender_id: 'u-cust-003',
        sender_role: 'customer',
        message: 'I got Pork Sinigang instead of Chicken Adobo. Please replace my order.',
        attachments: ['https://placehold.co/400x300/f97316/white?text=Wrong+Food+Item'],
        is_internal: false,
        created_at: '2026-02-28T14:00:00Z',
      },
      {
        id: 'msg-003-2',
        dispute_id: 'disp-003',
        sender_id: 'u-vendor-005',
        sender_role: 'vendor_owner',
        message: 'We sincerely apologize for the mix-up. We would like to offer a replacement or a full refund. Please let us know your preference.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-28T16:30:00Z',
      },
    ],
    created_at: '2026-02-28T14:00:00Z',
    updated_at: '2026-02-28T16:30:00Z',
  },

  // Dispute 4: Escalated — damaged item with vendor denying responsibility
  {
    id: 'disp-004',
    dispute_number: 'DSP-20260226-004',
    order_id: 'ord-005',
    return_request_id: 'ret-004',
    customer_id: 'u-cust-002',
    store_id: 'store-005',
    category: 'damaged_item',
    status: 'escalated',
    priority: 'high',
    subject: 'Damaged electronics — vendor refuses refund',
    description: 'Yung bluetooth speaker na binili ko ay sira nung dumating. Cracked yung casing at hindi gumagana ang bluetooth. Vendor ayaw i-refund kasi daw hindi nila fault.',
    evidence_urls: [
      'https://placehold.co/400x300/dc2626/white?text=Cracked+Speaker',
      'https://placehold.co/400x300/dc2626/white?text=Not+Working',
    ],
    requested_resolution: 'refund',
    resolution_type: null,
    resolution_amount: 0,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    escalated_at: '2026-02-28T09:00:00Z',
    escalation_reason: 'Vendor denied responsibility but product arrived damaged. Customer has photo evidence of damage upon delivery.',
    vendor_response_deadline: '2026-03-01T09:00:00Z',
    admin_assigned_to: 'u-admin-001',
    messages: [
      {
        id: 'msg-004-1',
        dispute_id: 'disp-004',
        sender_id: 'u-cust-002',
        sender_role: 'customer',
        message: 'Sira yung speaker nung dumating. Cracked ang casing at hindi nag-coconnect sa bluetooth.',
        attachments: ['https://placehold.co/400x300/dc2626/white?text=Cracked+Speaker'],
        is_internal: false,
        created_at: '2026-02-26T10:00:00Z',
      },
      {
        id: 'msg-004-2',
        dispute_id: 'disp-004',
        sender_id: 'u-vendor-005',
        sender_role: 'vendor_owner',
        message: 'We packed the item properly. The damage must have occurred during delivery. We cannot accept responsibility for courier damage.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-26T15:00:00Z',
      },
      {
        id: 'msg-004-3',
        dispute_id: 'disp-004',
        sender_id: 'u-cust-002',
        sender_role: 'customer',
        message: 'Hindi fair ito. Kahit sino man ang may kasalanan, hindi ko naman ginusto na masira. I want a full refund please.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-27T08:00:00Z',
      },
      {
        id: 'msg-004-4',
        dispute_id: 'disp-004',
        sender_id: 'u-admin-001',
        sender_role: 'admin',
        message: 'Internal note: Reviewing delivery personnel GPS data and handling notes. The rider did not report any rough handling. Checking vendor packaging standards.',
        attachments: [],
        is_internal: true,
        created_at: '2026-02-28T09:30:00Z',
      },
    ],
    created_at: '2026-02-26T10:00:00Z',
    updated_at: '2026-02-28T09:00:00Z',
  },

  // Dispute 5: Under review — quality issue
  {
    id: 'disp-005',
    dispute_number: 'DSP-20260227-005',
    order_id: 'ord-006',
    return_request_id: null,
    customer_id: 'u-cust-003',
    store_id: 'store-003',
    category: 'quality_issue',
    status: 'under_review',
    priority: 'medium',
    subject: 'Poor quality medicine packaging',
    description: 'The medicine I received had a torn seal. I cannot use medicine with compromised packaging for safety reasons. This is a health hazard.',
    evidence_urls: [
      'https://placehold.co/400x300/b91c1c/white?text=Torn+Medicine+Seal',
    ],
    requested_resolution: 'refund',
    resolution_type: null,
    resolution_amount: 0,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: null,
    admin_assigned_to: 'u-admin-001',
    messages: [
      {
        id: 'msg-005-1',
        dispute_id: 'disp-005',
        sender_id: 'u-cust-003',
        sender_role: 'customer',
        message: 'The medicine seal was already torn when I received it. I cannot take medicine with a broken seal.',
        attachments: ['https://placehold.co/400x300/b91c1c/white?text=Torn+Medicine+Seal'],
        is_internal: false,
        created_at: '2026-02-27T11:00:00Z',
      },
      {
        id: 'msg-005-2',
        dispute_id: 'disp-005',
        sender_id: 'u-vendor-003',
        sender_role: 'vendor_owner',
        message: 'We will investigate this immediately. Patient safety is our top priority. We are reviewing our batch records.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-27T13:00:00Z',
      },
      {
        id: 'msg-005-3',
        dispute_id: 'disp-005',
        sender_id: 'u-admin-001',
        sender_role: 'admin',
        message: 'This case involves pharmaceutical safety. Assigning to myself for immediate review.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-28T09:00:00Z',
      },
    ],
    created_at: '2026-02-27T11:00:00Z',
    updated_at: '2026-02-28T09:00:00Z',
  },

  // Dispute 6: Closed — late delivery, resolved with store credit
  {
    id: 'disp-006',
    dispute_number: 'DSP-20260220-006',
    order_id: 'ord-001',
    return_request_id: null,
    customer_id: 'u-cust-001',
    store_id: 'store-001',
    category: 'late_delivery',
    status: 'closed',
    priority: 'low',
    subject: 'Delivery took 6 hours instead of 2',
    description: 'Nag-order ako ng express delivery (2-4 hours) pero 6 hours bago dumating. Na-miss ko yung dinner event dahil dito.',
    evidence_urls: [],
    requested_resolution: 'apology',
    resolution_type: 'store_credit',
    resolution_amount: 50.00,
    resolution_notes: 'Customer chose express delivery but received standard delivery timing due to peak hour congestion. Issued P50 store credit as compensation.',
    resolved_by: 'u-admin-001',
    resolved_at: '2026-02-22T10:00:00Z',
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: null,
    admin_assigned_to: null,
    messages: [
      {
        id: 'msg-006-1',
        dispute_id: 'disp-006',
        sender_id: 'u-cust-001',
        sender_role: 'customer',
        message: 'Ang tagal ng delivery. Express daw pero 6 hours bago dumating.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-20T19:00:00Z',
      },
      {
        id: 'msg-006-2',
        dispute_id: 'disp-006',
        sender_id: 'u-vendor-001',
        sender_role: 'vendor_owner',
        message: 'We prepared the order on time. The delay was due to rider availability during peak hours. We apologize for the inconvenience.',
        attachments: [],
        is_internal: false,
        created_at: '2026-02-21T09:00:00Z',
      },
    ],
    created_at: '2026-02-20T19:00:00Z',
    updated_at: '2026-02-22T10:00:00Z',
  },

  // Dispute 7: Customer reply — item missing
  {
    id: 'disp-007',
    dispute_number: 'DSP-20260301-007',
    order_id: 'ord-003',
    return_request_id: null,
    customer_id: 'u-cust-001',
    store_id: 'store-001',
    category: 'item_missing',
    status: 'customer_reply',
    priority: 'medium',
    subject: 'Missing items from my grocery order',
    description: 'May 3 items na hindi kasama sa delivery ko pero na-charge sa akin. Yung eggs, yung bread, at yung butter ay kulang.',
    evidence_urls: [
      'https://placehold.co/400x300/ea580c/white?text=Missing+Items+Receipt',
    ],
    requested_resolution: 'partial_refund',
    resolution_type: null,
    resolution_amount: 0,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: '2026-03-03T14:00:00Z',
    admin_assigned_to: null,
    messages: [
      {
        id: 'msg-007-1',
        dispute_id: 'disp-007',
        sender_id: 'u-cust-001',
        sender_role: 'customer',
        message: 'Kulang yung order ko. Eggs, bread, at butter ang hindi nadala.',
        attachments: ['https://placehold.co/400x300/ea580c/white?text=Missing+Items+Receipt'],
        is_internal: false,
        created_at: '2026-03-01T14:00:00Z',
      },
      {
        id: 'msg-007-2',
        dispute_id: 'disp-007',
        sender_id: 'u-vendor-001',
        sender_role: 'vendor_owner',
        message: 'We checked our records and the items were packed. The rider may have left them at the store. We will check with the rider.',
        attachments: [],
        is_internal: false,
        created_at: '2026-03-01T17:00:00Z',
      },
      {
        id: 'msg-007-3',
        dispute_id: 'disp-007',
        sender_id: 'u-cust-001',
        sender_role: 'customer',
        message: 'Sige po, please update niyo ako. Kailangan ko pa sana yung mga items na yan tonight.',
        attachments: [],
        is_internal: false,
        created_at: '2026-03-01T17:30:00Z',
      },
    ],
    created_at: '2026-03-01T14:00:00Z',
    updated_at: '2026-03-01T17:30:00Z',
  },

  // Dispute 8: Open — urgent unauthorized charge
  {
    id: 'disp-008',
    dispute_number: 'DSP-20260302-008',
    order_id: 'ord-004',
    return_request_id: null,
    customer_id: 'u-cust-002',
    store_id: 'store-005',
    category: 'unauthorized_charge',
    status: 'open',
    priority: 'urgent',
    subject: 'Unauthorized duplicate charge on my GCash',
    description: 'Na-charge twice ang GCash ko for the same order. P1,250 ang isang charge, tapos may lumabas pang P1,250. Hindi ko ito in-authorize.',
    evidence_urls: [
      'https://placehold.co/400x300/991b1b/white?text=GCash+Double+Charge',
      'https://placehold.co/400x300/991b1b/white?text=Transaction+History',
    ],
    requested_resolution: 'refund',
    resolution_type: null,
    resolution_amount: 0,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    escalated_at: null,
    escalation_reason: null,
    vendor_response_deadline: '2026-03-03T10:00:00Z',
    admin_assigned_to: null,
    messages: [
      {
        id: 'msg-008-1',
        dispute_id: 'disp-008',
        sender_id: 'u-cust-002',
        sender_role: 'customer',
        message: 'Na-charge ako ng dalawang beses! P1,250 each. Please refund yung extra charge immediately.',
        attachments: [
          'https://placehold.co/400x300/991b1b/white?text=GCash+Double+Charge',
          'https://placehold.co/400x300/991b1b/white?text=Transaction+History',
        ],
        is_internal: false,
        created_at: '2026-03-02T08:00:00Z',
      },
    ],
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
];

export interface MockDisputeStats {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  total_resolution_amount: number;
  avg_resolution_hours: number;
  open_count: number;
  escalated_count: number;
}

export function computeDisputeStats(items: MockDispute[]): MockDisputeStats {
  const by_status: Record<string, number> = {};
  const by_category: Record<string, number> = {};
  const by_priority: Record<string, number> = {};
  let total_resolution_amount = 0;
  let open_count = 0;
  let escalated_count = 0;

  for (const d of items) {
    by_status[d.status] = (by_status[d.status] || 0) + 1;
    by_category[d.category] = (by_category[d.category] || 0) + 1;
    by_priority[d.priority] = (by_priority[d.priority] || 0) + 1;
    if (d.resolution_amount > 0) {
      total_resolution_amount += d.resolution_amount;
    }
    if (d.status === 'open' || d.status === 'customer_reply') open_count++;
    if (d.status === 'escalated') escalated_count++;
  }

  return {
    total: items.length,
    by_status,
    by_category,
    by_priority,
    total_resolution_amount: Math.round(total_resolution_amount * 100) / 100,
    avg_resolution_hours: 22.4,
    open_count,
    escalated_count,
  };
}
