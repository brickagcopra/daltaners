import { http, HttpResponse } from 'msw';
import { platformSettings } from '../data/settings';
import type { PlatformSettings, FeatureFlag } from '../data/settings';

// Deep clone to allow mutations
let currentSettings: PlatformSettings = JSON.parse(JSON.stringify(platformSettings));

const BASE = '/api/v1';

export const settingsHandlers = [
  // GET all platform settings
  http.get(`${BASE}/admin/settings`, () => {
    return HttpResponse.json({
      success: true,
      data: currentSettings,
      timestamp: new Date().toISOString(),
    });
  }),

  // GET settings by category
  http.get(`${BASE}/admin/settings/:category`, ({ params }) => {
    const category = params.category as string;
    const validCategories = ['general', 'commerce', 'payments', 'security', 'notifications', 'feature_flags'];

    if (!validCategories.includes(category)) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CATEGORY', message: `Invalid settings category: ${category}`, statusCode: 400 },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({
      success: true,
      data: currentSettings[category as keyof PlatformSettings],
      timestamp: new Date().toISOString(),
    });
  }),

  // PATCH update settings by category
  http.patch(`${BASE}/admin/settings/:category`, async ({ params, request }) => {
    const category = params.category as string;
    const body = (await request.json()) as Record<string, unknown>;

    if (category === 'feature_flags') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'USE_FEATURE_FLAG_ENDPOINT', message: 'Use the feature flag endpoints to manage flags', statusCode: 400 },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const validCategories = ['general', 'commerce', 'payments', 'security', 'notifications'];
    if (!validCategories.includes(category)) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CATEGORY', message: `Invalid settings category: ${category}`, statusCode: 400 },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // Merge updates
    const currentCategorySettings = currentSettings[category as keyof Omit<PlatformSettings, 'feature_flags'>];
    currentSettings = {
      ...currentSettings,
      [category]: { ...currentCategorySettings, ...body },
    };

    return HttpResponse.json({
      success: true,
      data: currentSettings[category as keyof PlatformSettings],
      timestamp: new Date().toISOString(),
    });
  }),

  // GET feature flags
  http.get(`${BASE}/admin/settings/feature-flags`, () => {
    return HttpResponse.json({
      success: true,
      data: currentSettings.feature_flags,
      timestamp: new Date().toISOString(),
    });
  }),

  // PATCH toggle feature flag
  http.patch(`${BASE}/admin/settings/feature-flags/:id`, async ({ params, request }) => {
    const flagId = params.id as string;
    const body = (await request.json()) as { enabled: boolean };

    const flagIndex = currentSettings.feature_flags.findIndex((f) => f.id === flagId);
    if (flagIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'FLAG_NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    currentSettings.feature_flags[flagIndex] = {
      ...currentSettings.feature_flags[flagIndex],
      enabled: body.enabled,
      updated_at: new Date().toISOString(),
      updated_by: 'Admin User',
    };

    return HttpResponse.json({
      success: true,
      data: currentSettings.feature_flags[flagIndex],
      timestamp: new Date().toISOString(),
    });
  }),

  // POST create feature flag
  http.post(`${BASE}/admin/settings/feature-flags`, async ({ request }) => {
    const body = (await request.json()) as Omit<FeatureFlag, 'id' | 'updated_at' | 'updated_by'>;

    const newFlag: FeatureFlag = {
      id: `ff-${String(currentSettings.feature_flags.length + 1).padStart(3, '0')}`,
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: 'Admin User',
    };

    currentSettings.feature_flags.push(newFlag);

    return HttpResponse.json(
      {
        success: true,
        data: newFlag,
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // DELETE feature flag
  http.delete(`${BASE}/admin/settings/feature-flags/:id`, ({ params }) => {
    const flagId = params.id as string;
    const flagIndex = currentSettings.feature_flags.findIndex((f) => f.id === flagId);

    if (flagIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'FLAG_NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    currentSettings.feature_flags.splice(flagIndex, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];
