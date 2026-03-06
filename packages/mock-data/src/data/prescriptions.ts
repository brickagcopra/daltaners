export interface MockPrescription {
  id: string;
  customer_id: string;
  image_url: string;
  image_hash: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  verified_by: string | null;
  verification_notes: string | null;
  doctor_name: string | null;
  doctor_license: string | null;
  prescription_date: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const mockPrescriptions: MockPrescription[] = [
  {
    id: 'rx-0001-0000-0000-000000000001',
    customer_id: 'a0000001-0000-0000-0000-000000000002',
    image_url: '/images/mock/prescription-1.jpg',
    image_hash: 'sha256_abc123def456',
    status: 'verified',
    verified_by: 'a0000001-0000-0000-0000-000000000007',
    verification_notes: 'Valid prescription for Amoxicillin 500mg',
    doctor_name: 'Dr. Maria Santos',
    doctor_license: 'PRC-0098765',
    prescription_date: '2026-02-15',
    expires_at: '2027-02-15T00:00:00Z',
    created_at: '2026-02-16T08:30:00Z',
    updated_at: '2026-02-16T10:00:00Z',
  },
  {
    id: 'rx-0001-0000-0000-000000000002',
    customer_id: 'a0000001-0000-0000-0000-000000000002',
    image_url: '/images/mock/prescription-2.jpg',
    image_hash: 'sha256_ghi789jkl012',
    status: 'pending',
    verified_by: null,
    verification_notes: null,
    doctor_name: 'Dr. Juan dela Cruz',
    doctor_license: 'PRC-0054321',
    prescription_date: '2026-02-28',
    expires_at: '2027-02-28T00:00:00Z',
    created_at: '2026-03-01T14:20:00Z',
    updated_at: '2026-03-01T14:20:00Z',
  },
  {
    id: 'rx-0001-0000-0000-000000000003',
    customer_id: 'a0000001-0000-0000-0000-000000000002',
    image_url: '/images/mock/prescription-3.jpg',
    image_hash: 'sha256_mno345pqr678',
    status: 'rejected',
    verified_by: 'a0000001-0000-0000-0000-000000000007',
    verification_notes: 'Image is blurry and unreadable. Please upload a clearer photo.',
    doctor_name: null,
    doctor_license: null,
    prescription_date: null,
    expires_at: null,
    created_at: '2026-02-20T11:00:00Z',
    updated_at: '2026-02-20T13:30:00Z',
  },
  {
    id: 'rx-0001-0000-0000-000000000004',
    customer_id: 'a0000001-0000-0000-0000-000000000003',
    image_url: '/images/mock/prescription-4.jpg',
    image_hash: 'sha256_stu901vwx234',
    status: 'verified',
    verified_by: 'a0000001-0000-0000-0000-000000000007',
    verification_notes: 'Valid prescription for Metformin 500mg',
    doctor_name: 'Dr. Anna Reyes',
    doctor_license: 'PRC-0067890',
    prescription_date: '2026-01-10',
    expires_at: '2026-07-10T00:00:00Z',
    created_at: '2026-01-12T09:15:00Z',
    updated_at: '2026-01-12T11:45:00Z',
  },
  {
    id: 'rx-0001-0000-0000-000000000005',
    customer_id: 'a0000001-0000-0000-0000-000000000002',
    image_url: '/images/mock/prescription-5.jpg',
    image_hash: 'sha256_yza567bcd890',
    status: 'expired',
    verified_by: 'a0000001-0000-0000-0000-000000000007',
    verification_notes: 'Was valid — auto-expired',
    doctor_name: 'Dr. Pedro Lim',
    doctor_license: 'PRC-0011223',
    prescription_date: '2025-06-01',
    expires_at: '2025-12-01T00:00:00Z',
    created_at: '2025-06-05T16:00:00Z',
    updated_at: '2025-12-01T00:00:01Z',
  },
];
