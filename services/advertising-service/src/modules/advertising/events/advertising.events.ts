export const ADVERTISING_TOPIC = 'daltaners.advertising.events';

export const ADVERTISING_EVENTS = {
  CAMPAIGN_CREATED: 'campaign_created',
  CAMPAIGN_UPDATED: 'campaign_updated',
  CAMPAIGN_SUBMITTED: 'campaign_submitted',
  CAMPAIGN_APPROVED: 'campaign_approved',
  CAMPAIGN_REJECTED: 'campaign_rejected',
  CAMPAIGN_ACTIVATED: 'campaign_activated',
  CAMPAIGN_PAUSED: 'campaign_paused',
  CAMPAIGN_RESUMED: 'campaign_resumed',
  CAMPAIGN_COMPLETED: 'campaign_completed',
  CAMPAIGN_CANCELLED: 'campaign_cancelled',
  CAMPAIGN_SUSPENDED: 'campaign_suspended',
  BUDGET_EXHAUSTED: 'budget_exhausted',
  IMPRESSION_RECORDED: 'impression_recorded',
  CLICK_RECORDED: 'click_recorded',
  CONVERSION_TRACKED: 'conversion_tracked',
} as const;
