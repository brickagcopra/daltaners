import { http, HttpResponse } from 'msw';
import { mockPrescriptions, MockPrescription } from '../data/prescriptions';

let prescriptions = [...mockPrescriptions];

export const prescriptionHandlers = [
  // GET /api/v1/prescriptions — List customer prescriptions
  http.get('*/api/v1/prescriptions', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filtered = [...prescriptions];
    if (status) {
      filtered = filtered.filter((rx) => rx.status === status);
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/v1/prescriptions/:id — Get prescription detail
  http.get('*/api/v1/prescriptions/:id', ({ params }) => {
    const rx = prescriptions.find((r) => r.id === params.id);
    if (!rx) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Prescription not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      success: true,
      data: rx,
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /api/v1/prescriptions — Upload prescription
  http.post('*/api/v1/prescriptions', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newRx: MockPrescription = {
      id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customer_id: 'a0000001-0000-0000-0000-000000000002',
      image_url: (body.image_url as string) || '',
      image_hash: (body.image_hash as string) || '',
      status: 'pending',
      verified_by: null,
      verification_notes: null,
      doctor_name: (body.doctor_name as string) || null,
      doctor_license: (body.doctor_license as string) || null,
      prescription_date: (body.prescription_date as string) || null,
      expires_at: (body.expires_at as string) || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    prescriptions.unshift(newRx);
    return HttpResponse.json(
      { success: true, data: newRx, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // PATCH /api/v1/prescriptions/:id/verify — Verify/reject prescription
  http.patch('*/api/v1/prescriptions/:id/verify', async ({ params, request }) => {
    const idx = prescriptions.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Prescription not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    prescriptions[idx] = {
      ...prescriptions[idx],
      status: (body.status as MockPrescription['status']) || prescriptions[idx].status,
      verification_notes: (body.verification_notes as string) || null,
      verified_by: 'a0000001-0000-0000-0000-000000000001',
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: prescriptions[idx],
      timestamp: new Date().toISOString(),
    });
  }),
];
