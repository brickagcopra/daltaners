import { useState } from 'react';
import {
  useAdminCampaigns,
  useAdminCampaignStats,
  useAdminPlatformStats,
  useAdminCampaignPerformance,
  useApproveCampaign,
  useRejectCampaign,
  useSuspendCampaign,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_TYPE_LABELS,
  BID_TYPE_LABELS,
  PLACEMENT_LABELS,
  type Campaign,
  type CampaignStatus,
} from '@/hooks/useAdvertising';

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const statusTabs: { label: string; value: CampaignStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Approved', value: 'approved' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Suspended', value: 'suspended' },
];

export default function AdvertisingPage() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [actionModal, setActionModal] = useState<{ campaign: Campaign; action: 'approve' | 'reject' | 'suspend' } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const { data: statsData } = useAdminCampaignStats();
  const { data: platformStats } = useAdminPlatformStats();
  const { data: campaignsData, isLoading } = useAdminCampaigns({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 15,
  });

  const approveMut = useApproveCampaign();
  const rejectMut = useRejectCampaign();
  const suspendMut = useSuspendCampaign();

  const handleAction = async () => {
    if (!actionModal) return;
    const { campaign, action } = actionModal;
    try {
      switch (action) {
        case 'approve': await approveMut.mutateAsync(campaign.id); break;
        case 'reject': await rejectMut.mutateAsync({ id: campaign.id, reason: actionReason || undefined }); break;
        case 'suspend': await suspendMut.mutateAsync({ id: campaign.id, reason: actionReason || undefined }); break;
      }
    } finally {
      setActionModal(null);
      setActionReason('');
    }
  };

  const campaigns = campaignsData?.campaigns ?? [];
  const meta = campaignsData?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advertising Management</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage vendor advertising campaigns</p>
      </div>

      {/* Platform Stats */}
      {platformStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard label="Total Campaigns" value={String(platformStats.total_campaigns)} />
          <StatCard label="Active" value={String(platformStats.active_campaigns)} color="text-green-600" />
          <StatCard label="Total Spend" value={formatCurrency(platformStats.total_spend)} />
          <StatCard label="Impressions" value={formatNumber(platformStats.total_impressions)} />
          <StatCard label="Clicks" value={formatNumber(platformStats.total_clicks)} />
          <StatCard label="Conversions" value={formatNumber(platformStats.total_conversions)} />
          <StatCard label="Avg CPC" value={formatCurrency(platformStats.avg_cpc)} />
        </div>
      )}

      {/* Status Distribution */}
      {statsData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">Status Distribution</div>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(statsData) as [string, number][]).filter(([k]) => k !== 'total').map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${CAMPAIGN_STATUS_COLORS[status as CampaignStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {CAMPAIGN_STATUS_LABELS[status as CampaignStatus] ?? status}
                </span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search campaigns or stores..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex gap-1 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No campaigns found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Store</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Budget</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Spent</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Clicks</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">CTR</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => {
                  const ctr = c.total_impressions > 0
                    ? ((c.total_clicks / c.total_impressions) * 100).toFixed(2)
                    : '0.00';
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedCampaign(c)} className="text-left hover:text-blue-600">
                          <div className="font-medium text-gray-900 truncate max-w-[180px]">{c.name}</div>
                          <div className="text-xs text-gray-500">{PLACEMENT_LABELS[c.placement]}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">{c.store_name || c.store_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{CAMPAIGN_TYPE_LABELS[c.campaign_type]}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${CAMPAIGN_STATUS_COLORS[c.status]}`}>
                          {CAMPAIGN_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(c.budget_amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(c.spent_amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatNumber(c.total_impressions)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatNumber(c.total_clicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{ctr}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedCampaign(c)}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                          >
                            View
                          </button>
                          {c.status === 'pending_review' && (
                            <>
                              <button
                                onClick={() => setActionModal({ campaign: c, action: 'approve' })}
                                className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setActionModal({ campaign: c, action: 'reject' })}
                                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {c.status === 'active' && (
                            <button
                              onClick={() => setActionModal({ campaign: c, action: 'suspend' })}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs rounded border disabled:opacity-50">
                Previous
              </button>
              <button disabled={page >= (meta.totalPages || 1)} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs rounded border disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onApprove={(c) => { setSelectedCampaign(null); setActionModal({ campaign: c, action: 'approve' }); }}
          onReject={(c) => { setSelectedCampaign(null); setActionModal({ campaign: c, action: 'reject' }); }}
          onSuspend={(c) => { setSelectedCampaign(null); setActionModal({ campaign: c, action: 'suspend' }); }}
        />
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">
              {actionModal.action === 'approve' ? 'Approve' : actionModal.action === 'reject' ? 'Reject' : 'Suspend'} Campaign
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {actionModal.action === 'approve'
                ? `Approve "${actionModal.campaign.name}"? It will be activated when the start date arrives.`
                : `${actionModal.action === 'reject' ? 'Reject' : 'Suspend'} "${actionModal.campaign.name}"?`
              }
            </p>
            {(actionModal.action === 'reject' || actionModal.action === 'suspend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason {actionModal.action === 'reject' ? '(optional)' : '(optional)'}
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder={actionModal.action === 'reject'
                    ? 'Explain why the campaign is being rejected...'
                    : 'Explain why the campaign is being suspended...'
                  }
                />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionModal(null); setActionReason(''); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={approveMut.isPending || rejectMut.isPending || suspendMut.isPending}
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                  actionModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {(approveMut.isPending || rejectMut.isPending || suspendMut.isPending)
                  ? 'Processing...'
                  : actionModal.action === 'approve' ? 'Approve' : actionModal.action === 'reject' ? 'Reject' : 'Suspend'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color || 'text-gray-800'}`}>{value}</div>
    </div>
  );
}

function CampaignDetailModal({
  campaign, onClose, onApprove, onReject, onSuspend,
}: {
  campaign: Campaign;
  onClose: () => void;
  onApprove: (c: Campaign) => void;
  onReject: (c: Campaign) => void;
  onSuspend: (c: Campaign) => void;
}) {
  const { data: perf } = useAdminCampaignPerformance(campaign.id);

  const ctr = campaign.total_impressions > 0 ? ((campaign.total_clicks / campaign.total_impressions) * 100).toFixed(2) : '0';
  const convRate = campaign.total_clicks > 0 ? ((campaign.total_conversions / campaign.total_clicks) * 100).toFixed(2) : '0';
  const budgetUsed = campaign.budget_amount > 0 ? ((campaign.spent_amount / campaign.budget_amount) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 mb-10">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">{campaign.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${CAMPAIGN_STATUS_COLORS[campaign.status]}`}>
                {CAMPAIGN_STATUS_LABELS[campaign.status]}
              </span>
              <span className="text-xs text-gray-500">by {campaign.store_name || campaign.store_id.slice(0, 8)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {campaign.description && (
            <p className="text-sm text-gray-600">{campaign.description}</p>
          )}

          {campaign.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-xs font-medium text-red-700 mb-1">Rejection Reason</div>
              <p className="text-sm text-red-600">{campaign.rejection_reason}</p>
            </div>
          )}
          {campaign.suspension_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-xs font-medium text-red-700 mb-1">Suspension Reason</div>
              <p className="text-sm text-red-600">{campaign.suspension_reason}</p>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell label="Type" value={CAMPAIGN_TYPE_LABELS[campaign.campaign_type]} />
            <InfoCell label="Placement" value={PLACEMENT_LABELS[campaign.placement]} />
            <InfoCell label="Bid" value={`${BID_TYPE_LABELS[campaign.bid_type]} ${formatCurrency(campaign.bid_amount)}`} />
            <InfoCell label="Budget" value={`${formatCurrency(campaign.budget_amount)} (${budgetUsed}% used)`} />
            <InfoCell label="Start" value={formatDate(campaign.start_date)} />
            <InfoCell label="End" value={campaign.end_date ? formatDate(campaign.end_date) : 'No end date'} />
            <InfoCell label="Created" value={formatDate(campaign.created_at)} />
            <InfoCell label="Updated" value={formatDate(campaign.updated_at)} />
          </div>

          {/* Performance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PerfCard label="Impressions" value={formatNumber(campaign.total_impressions)} />
            <PerfCard label="Clicks" value={formatNumber(campaign.total_clicks)} />
            <PerfCard label="CTR" value={`${ctr}%`} />
            <PerfCard label="Conversions" value={String(campaign.total_conversions)} />
            <PerfCard label="Conv. Rate" value={`${convRate}%`} />
            <PerfCard label="Spent" value={formatCurrency(campaign.spent_amount)} />
            <PerfCard label="Revenue" value={formatCurrency(campaign.conversion_revenue)} />
            <PerfCard label="ROAS" value={perf ? `${perf.roas}x` : '—'} />
          </div>

          {/* Targeting */}
          {campaign.targeting && Object.keys(campaign.targeting).length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Targeting</div>
              <div className="flex flex-wrap gap-2">
                {campaign.targeting.categories?.map((c) => (
                  <span key={c} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">{c}</span>
                ))}
                {campaign.targeting.zones?.map((z) => (
                  <span key={z} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded">{z}</span>
                ))}
                {campaign.targeting.keywords?.map((k) => (
                  <span key={k} className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded">{k}</span>
                ))}
                {campaign.targeting.customer_segments?.map((s) => (
                  <span key={s} className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Banner Preview */}
          {campaign.banner_image_url && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Banner Preview</div>
              <img src={campaign.banner_image_url} alt="Campaign banner" className="w-full max-h-48 object-cover rounded-lg border" />
            </div>
          )}
        </div>

        <div className="flex justify-between p-6 border-t">
          <div className="flex gap-2">
            {campaign.status === 'pending_review' && (
              <>
                <button onClick={() => onApprove(campaign)} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700">
                  Approve
                </button>
                <button onClick={() => onReject(campaign)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">
                  Reject
                </button>
              </>
            )}
            {campaign.status === 'active' && (
              <button onClick={() => onSuspend(campaign)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">
                Suspend
              </button>
            )}
          </div>
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}

function PerfCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}
