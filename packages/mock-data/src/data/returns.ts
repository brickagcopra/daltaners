export interface MockReturnItem {
  id: string;
  return_request_id: string;
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  condition: 'unopened' | 'opened' | 'damaged' | 'defective' | 'unknown';
  restockable: boolean;
  inventory_adjusted: boolean;
}

export interface MockReturnRequest {
  id: string;
  order_id: string;
  customer_id: string;
  store_id: string;
  request_number: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled' | 'received' | 'refunded' | 'escalated';
  reason_category: 'defective' | 'wrong_item' | 'damaged' | 'not_as_described' | 'missing_item' | 'expired' | 'change_of_mind' | 'other';
  reason_details: string | null;
  evidence_urls: string[];
  requested_resolution: 'refund' | 'replacement' | 'store_credit';
  refund_amount: number;
  vendor_response: string | null;
  vendor_responded_at: string | null;
  admin_notes: string | null;
  items: MockReturnItem[];
  created_at: string;
  updated_at: string;
}

export const returnRequests: MockReturnRequest[] = [
  // Return 1: Approved + received + refunded (complete lifecycle)
  {
    id: 'ret-001',
    order_id: 'ord-001',
    customer_id: 'u-cust-001',
    store_id: 'store-001',
    request_number: 'RET-20260228-001',
    status: 'refunded',
    reason_category: 'damaged',
    reason_details: 'Yung bigas na dumating ay basag yung packaging. Natapon yung kalahati sa loob ng bag. Hindi pwede gamitin.',
    evidence_urls: [
      'https://placehold.co/400x300/ef4444/white?text=Damaged+Package',
      'https://placehold.co/400x300/ef4444/white?text=Spilled+Rice',
    ],
    requested_resolution: 'refund',
    refund_amount: 285.00,
    vendor_response: 'We sincerely apologize for the damaged packaging. Full refund has been processed. We have reported this to our logistics partner.',
    vendor_responded_at: '2026-02-28T16:00:00Z',
    admin_notes: null,
    items: [
      {
        id: 'ret-item-001',
        return_request_id: 'ret-001',
        order_item_id: 'oi-prod-018-abc001',
        product_id: 'prod-018',
        product_name: 'Sinandomeng Rice 5kg',
        quantity: 1,
        unit_price: 285.00,
        refund_amount: 285.00,
        condition: 'damaged',
        restockable: false,
        inventory_adjusted: true,
      },
    ],
    created_at: '2026-02-28T10:30:00Z',
    updated_at: '2026-03-01T08:00:00Z',
  },
  // Return 2: Pending — waiting for vendor response
  {
    id: 'ret-002',
    order_id: 'ord-001',
    customer_id: 'u-cust-001',
    store_id: 'store-001',
    request_number: 'RET-20260301-002',
    status: 'pending',
    reason_category: 'wrong_item',
    reason_details: 'Nag-order ako ng Nestle Fresh Milk pero Magnolia ang dumating. Ibang brand po yung nareceive ko.',
    evidence_urls: [
      'https://placehold.co/400x300/f97316/white?text=Wrong+Item',
    ],
    requested_resolution: 'replacement',
    refund_amount: 125.00,
    vendor_response: null,
    vendor_responded_at: null,
    admin_notes: null,
    items: [
      {
        id: 'ret-item-002',
        return_request_id: 'ret-002',
        order_item_id: 'oi-prod-014-abc002',
        product_id: 'prod-014',
        product_name: 'Nestle Fresh Milk 1L',
        quantity: 2,
        unit_price: 62.50,
        refund_amount: 125.00,
        condition: 'unopened',
        restockable: true,
        inventory_adjusted: false,
      },
    ],
    created_at: '2026-03-01T09:15:00Z',
    updated_at: '2026-03-01T09:15:00Z',
  },
  // Return 3: Denied by vendor
  {
    id: 'ret-003',
    order_id: 'ord-004',
    customer_id: 'u-cust-002',
    store_id: 'store-001',
    request_number: 'RET-20260225-003',
    status: 'denied',
    reason_category: 'change_of_mind',
    reason_details: 'Hindi ko na kailangan yung item.',
    evidence_urls: [],
    requested_resolution: 'refund',
    refund_amount: 89.75,
    vendor_response: 'Sorry po, hindi po namin pwede i-accept ang return for change of mind sa perishable items. Per our store policy, perishables are non-returnable.',
    vendor_responded_at: '2026-02-25T14:00:00Z',
    admin_notes: null,
    items: [
      {
        id: 'ret-item-003',
        return_request_id: 'ret-003',
        order_item_id: 'oi-prod-007-abc003',
        product_id: 'prod-007',
        product_name: 'UFC Banana Ketchup 550g',
        quantity: 1,
        unit_price: 89.75,
        refund_amount: 89.75,
        condition: 'opened',
        restockable: false,
        inventory_adjusted: false,
      },
    ],
    created_at: '2026-02-25T10:00:00Z',
    updated_at: '2026-02-25T14:00:00Z',
  },
  // Return 4: Escalated to admin
  {
    id: 'ret-004',
    order_id: 'ord-005',
    customer_id: 'u-cust-002',
    store_id: 'store-005',
    request_number: 'RET-20260220-004',
    status: 'escalated',
    reason_category: 'not_as_described',
    reason_details: 'Yung Chicken Adobo na in-order ko ay ibang-iba sa picture. Sobrang konti ng serving at walang flavor. Hindi katulad ng advertised.',
    evidence_urls: [
      'https://placehold.co/400x300/dc2626/white?text=Food+Not+As+Described',
      'https://placehold.co/400x300/dc2626/white?text=Small+Serving',
    ],
    requested_resolution: 'refund',
    refund_amount: 180.00,
    vendor_response: 'Our servings are standard. We cannot accept this return.',
    vendor_responded_at: '2026-02-20T16:30:00Z',
    admin_notes: 'Customer dispute — vendor denied but customer insists. Reviewing order photos vs menu images. Escalated for admin review.',
    items: [
      {
        id: 'ret-item-004',
        return_request_id: 'ret-004',
        order_item_id: 'oi-food-001-abc004',
        product_id: null,
        product_name: 'Chicken Adobo (Family Size)',
        quantity: 1,
        unit_price: 180.00,
        refund_amount: 180.00,
        condition: 'opened',
        restockable: false,
        inventory_adjusted: false,
      },
    ],
    created_at: '2026-02-20T12:00:00Z',
    updated_at: '2026-02-22T09:00:00Z',
  },
  // Return 5: Approved — waiting for items to be received
  {
    id: 'ret-005',
    order_id: 'ord-006',
    customer_id: 'u-cust-003',
    store_id: 'store-003',
    request_number: 'RET-20260226-005',
    status: 'approved',
    reason_category: 'expired',
    reason_details: 'Yung Biogesic na dumating ay expired na po. Yung expiry date is January 2026. Very dangerous po ito for medicines.',
    evidence_urls: [
      'https://placehold.co/400x300/b91c1c/white?text=Expired+Medicine',
    ],
    requested_resolution: 'refund',
    refund_amount: 55.50,
    vendor_response: 'We deeply apologize. This is a serious matter and we have pulled all affected stocks. Full refund approved. Please dispose of the expired medication safely.',
    vendor_responded_at: '2026-02-26T11:00:00Z',
    admin_notes: null,
    items: [
      {
        id: 'ret-item-005',
        return_request_id: 'ret-005',
        order_item_id: 'oi-pharma-001-abc005',
        product_id: null,
        product_name: 'Biogesic Paracetamol 500mg (10 tabs)',
        quantity: 3,
        unit_price: 18.50,
        refund_amount: 55.50,
        condition: 'unopened',
        restockable: false,
        inventory_adjusted: true,
      },
    ],
    created_at: '2026-02-26T08:30:00Z',
    updated_at: '2026-02-26T11:00:00Z',
  },
  // Return 6: Cancelled by customer
  {
    id: 'ret-006',
    order_id: 'ord-001',
    customer_id: 'u-cust-001',
    store_id: 'store-001',
    request_number: 'RET-20260227-006',
    status: 'cancelled',
    reason_category: 'defective',
    reason_details: 'Akala ko sira yung item pero nagwo-work pala. My mistake.',
    evidence_urls: [],
    requested_resolution: 'refund',
    refund_amount: 45.00,
    vendor_response: null,
    vendor_responded_at: null,
    admin_notes: null,
    items: [
      {
        id: 'ret-item-006',
        return_request_id: 'ret-006',
        order_item_id: 'oi-prod-032-abc006',
        product_id: 'prod-032',
        product_name: 'Joy Dishwashing Liquid Lemon 500ml',
        quantity: 1,
        unit_price: 45.00,
        refund_amount: 45.00,
        condition: 'opened',
        restockable: false,
        inventory_adjusted: false,
      },
    ],
    created_at: '2026-02-27T07:00:00Z',
    updated_at: '2026-02-27T07:45:00Z',
  },
  // Return 7: Received by vendor — pending refund processing
  {
    id: 'ret-007',
    order_id: 'ord-004',
    customer_id: 'u-cust-002',
    store_id: 'store-001',
    request_number: 'RET-20260224-007',
    status: 'received',
    reason_category: 'defective',
    reason_details: 'Yung can ng Spam ay may butas sa taas. Leaking na yung contents. Hindi safe kainin.',
    evidence_urls: [
      'https://placehold.co/400x300/991b1b/white?text=Leaking+Can',
    ],
    requested_resolution: 'refund',
    refund_amount: 215.00,
    vendor_response: 'Thank you for reporting this. We have received the item and verified the defect. Refund will be processed shortly.',
    vendor_responded_at: '2026-02-24T15:00:00Z',
    admin_notes: null,
    items: [
      {
        id: 'ret-item-007',
        return_request_id: 'ret-007',
        order_item_id: 'oi-prod-spam-abc007',
        product_id: null,
        product_name: 'Spam Classic Luncheon Meat 340g',
        quantity: 1,
        unit_price: 215.00,
        refund_amount: 215.00,
        condition: 'defective',
        restockable: false,
        inventory_adjusted: true,
      },
    ],
    created_at: '2026-02-24T09:00:00Z',
    updated_at: '2026-02-25T10:00:00Z',
  },
  // Return 8: Pending — multiple items from a single order
  {
    id: 'ret-008',
    order_id: 'ord-003',
    customer_id: 'u-cust-003',
    store_id: 'store-005',
    request_number: 'RET-20260301-008',
    status: 'pending',
    reason_category: 'missing_item',
    reason_details: 'Dalawang item ang kulang sa order ko. Yung Sinigang mix at yung Calamansi juice ay hindi kasama sa na-deliver.',
    evidence_urls: [
      'https://placehold.co/400x300/ea580c/white?text=Missing+Items',
    ],
    requested_resolution: 'refund',
    refund_amount: 98.00,
    vendor_response: null,
    vendor_responded_at: null,
    admin_notes: null,
    items: [
      {
        id: 'ret-item-008a',
        return_request_id: 'ret-008',
        order_item_id: 'oi-food-002-abc008a',
        product_id: null,
        product_name: 'Knorr Sinigang sa Sampalok Mix 44g',
        quantity: 2,
        unit_price: 22.00,
        refund_amount: 44.00,
        condition: 'unknown',
        restockable: false,
        inventory_adjusted: false,
      },
      {
        id: 'ret-item-008b',
        return_request_id: 'ret-008',
        order_item_id: 'oi-food-003-abc008b',
        product_id: null,
        product_name: 'Minute Maid Calamansi Juice 1L',
        quantity: 2,
        unit_price: 27.00,
        refund_amount: 54.00,
        condition: 'unknown',
        restockable: false,
        inventory_adjusted: false,
      },
    ],
    created_at: '2026-03-01T11:00:00Z',
    updated_at: '2026-03-01T11:00:00Z',
  },
];

export interface MockReturnStats {
  total: number;
  by_status: Record<string, number>;
  by_reason: Record<string, number>;
  total_refund_amount: number;
  avg_resolution_hours: number;
}

export function computeReturnStats(requests: MockReturnRequest[]): MockReturnStats {
  const by_status: Record<string, number> = {};
  const by_reason: Record<string, number> = {};
  let total_refund_amount = 0;

  for (const r of requests) {
    by_status[r.status] = (by_status[r.status] || 0) + 1;
    by_reason[r.reason_category] = (by_reason[r.reason_category] || 0) + 1;
    if (r.status === 'refunded' || r.status === 'received') {
      total_refund_amount += r.refund_amount;
    }
  }

  return {
    total: requests.length,
    by_status,
    by_reason,
    total_refund_amount: Math.round(total_refund_amount * 100) / 100,
    avg_resolution_hours: 18.5,
  };
}
