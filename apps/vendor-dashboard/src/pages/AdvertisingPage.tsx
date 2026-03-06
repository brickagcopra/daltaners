import { useState } from 'react';
import {
  useCampaigns,
  useCampaignStats,
  useCampaignPerformance,
  useCampaignProducts,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useSubmitCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useCancelCampaign,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_TYPE_LABELS,
  BID_TYPE_LABELS,
  PLACEMENT_LABELS,
  BUDGET_TYPE_LABELS,
  type Campaign,
  type CampaignStatus,
  type CampaignType,
  type BidType,
  type BudgetType,
  type AdPlacement,
  type CreateCampaignData,
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
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
];

export default function AdvertisingPage() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [actionCampaign, setActionCampaign] = useState<{ campaign: Campaign; action: string } | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);

  const { data: statsData } = useCampaignStats();
  const { data: campaignsData, isLoading } = useCampaigns({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 10,
  });

  const createMut = useCreateCampaign();
  const updateMut = useUpdateCampaign();
  const deleteMut = useDeleteCampaign();
  const submitMut = useSubmitCampaign();
  const pauseMut = usePauseCampaign();
  const resumeMut = useResumeCampaign();
  const cancelMut = useCancelCampaign();

  const handleAction = async () => {
    if (!actionCampaign) return;
    const { campaign, action } = actionCampaign;
    try {
      switch (action) {
        case 'submit': await submitMut.mutateAsync(campaign.id); break;
        case 'pause': await pauseMut.mutateAsync(campaign.id); break;
        case 'resume': await resumeMut.mutateAsync(campaign.id); break;
        case 'cancel': await cancelMut.mutateAsync(campaign.id); break;
      }
    } finally {
      setActionCampaign(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteCampaign) return;
    try {
      await deleteMut.mutateAsync(deleteCampaign.id);
    } finally {
      setDeleteCampaign(null);
    }
  };

  const stats = statsData;
  const campaigns = campaignsData?.campaigns ?? [];
  const meta = campaignsData?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advertising</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your ad campaigns to boost product visibility</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700"
        >
          + New Campaign
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats.total} color="text-gray-800" />
          <StatCard label="Active" value={stats.active} color="text-green-600" />
          <StatCard label="Pending" value={stats.pendingReview} color="text-yellow-600" />
          <StatCard label="Paused" value={stats.paused} color="text-orange-600" />
          <StatCard label="Draft" value={stats.draft} color="text-gray-500" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        <div className="flex gap-1 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? 'bg-orange-600 text-white'
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Budget</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Spent</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Clicks</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dates</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailCampaign(c)} className="text-left hover:text-orange-600">
                        <div className="font-medium text-gray-900 truncate max-w-[200px]">{c.name}</div>
                        <div className="text-xs text-gray-500">{PLACEMENT_LABELS[c.placement]}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{CAMPAIGN_TYPE_LABELS[c.campaignType]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${CAMPAIGN_STATUS_COLORS[c.status]}`}>
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(c.budgetAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(c.spentAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNumber(c.totalImpressions)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNumber(c.totalClicks)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {formatDate(c.startDate)}
                      {c.endDate && <> — {formatDate(c.endDate)}</>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'draft' && (
                          <>
                            <ActionBtn label="Submit" onClick={() => setActionCampaign({ campaign: c, action: 'submit' })} />
                            <ActionBtn label="Edit" onClick={() => setEditCampaign(c)} />
                            <ActionBtn label="Delete" onClick={() => setDeleteCampaign(c)} danger />
                          </>
                        )}
                        {c.status === 'active' && (
                          <ActionBtn label="Pause" onClick={() => setActionCampaign({ campaign: c, action: 'pause' })} />
                        )}
                        {c.status === 'paused' && (
                          <>
                            <ActionBtn label="Resume" onClick={() => setActionCampaign({ campaign: c, action: 'resume' })} />
                            <ActionBtn label="Edit" onClick={() => setEditCampaign(c)} />
                          </>
                        )}
                        {c.status === 'rejected' && (
                          <>
                            <ActionBtn label="Edit" onClick={() => setEditCampaign(c)} />
                            <ActionBtn label="Delete" onClick={() => setDeleteCampaign(c)} danger />
                          </>
                        )}
                        {['draft', 'pending_review', 'approved', 'active', 'paused'].includes(c.status) && (
                          <ActionBtn label="Cancel" onClick={() => setActionCampaign({ campaign: c, action: 'cancel' })} danger />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 text-xs rounded border disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= (meta.totalPages || 1)}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 text-xs rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(showCreateModal || editCampaign) && (
        <CampaignFormModal
          campaign={editCampaign}
          onClose={() => { setShowCreateModal(false); setEditCampaign(null); }}
          onSubmit={async (formData) => {
            if (editCampaign) {
              await updateMut.mutateAsync({ id: editCampaign.id, ...formData });
            } else {
              await createMut.mutateAsync(formData);
            }
            setShowCreateModal(false);
            setEditCampaign(null);
          }}
          isLoading={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* Detail Modal */}
      {detailCampaign && (
        <CampaignDetailModal
          campaign={detailCampaign}
          onClose={() => setDetailCampaign(null)}
        />
      )}

      {/* Action Confirmation */}
      {actionCampaign && (
        <ConfirmModal
          title={`${actionCampaign.action.charAt(0).toUpperCase() + actionCampaign.action.slice(1)} Campaign`}
          message={`Are you sure you want to ${actionCampaign.action} "${actionCampaign.campaign.name}"?`}
          onConfirm={handleAction}
          onCancel={() => setActionCampaign(null)}
          isLoading={submitMut.isPending || pauseMut.isPending || resumeMut.isPending || cancelMut.isPending}
          danger={actionCampaign.action === 'cancel'}
        />
      )}

      {/* Delete Confirmation */}
      {deleteCampaign && (
        <ConfirmModal
          title="Delete Campaign"
          message={`Are you sure you want to permanently delete "${deleteCampaign.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCampaign(null)}
          isLoading={deleteMut.isPending}
          danger
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs font-medium rounded ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

function ConfirmModal({
  title, message, onConfirm, onCancel, isLoading, danger,
}: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; isLoading: boolean; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignDetailModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { data: perf } = useCampaignPerformance(campaign.id);
  const { data: products } = useCampaignProducts(campaign.id);

  const ctr = campaign.totalImpressions > 0 ? ((campaign.totalClicks / campaign.totalImpressions) * 100).toFixed(2) : '0';
  const convRate = campaign.totalClicks > 0 ? ((campaign.totalConversions / campaign.totalClicks) * 100).toFixed(2) : '0';
  const budgetUsed = campaign.budgetAmount > 0 ? ((campaign.spentAmount / campaign.budgetAmount) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 mb-10">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">{campaign.name}</h3>
            <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${CAMPAIGN_STATUS_COLORS[campaign.status]}`}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {campaign.description && (
            <p className="text-sm text-gray-600">{campaign.description}</p>
          )}

          {campaign.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-xs font-medium text-red-700 mb-1">Rejection Reason</div>
              <p className="text-sm text-red-600">{campaign.rejectionReason}</p>
            </div>
          )}

          {campaign.suspensionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-xs font-medium text-red-700 mb-1">Suspension Reason</div>
              <p className="text-sm text-red-600">{campaign.suspensionReason}</p>
            </div>
          )}

          {/* Campaign Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell label="Type" value={CAMPAIGN_TYPE_LABELS[campaign.campaignType]} />
            <InfoCell label="Placement" value={PLACEMENT_LABELS[campaign.placement]} />
            <InfoCell label="Bid Type" value={BID_TYPE_LABELS[campaign.bidType]} />
            <InfoCell label="Bid Amount" value={formatCurrency(campaign.bidAmount)} />
            <InfoCell label="Budget Type" value={BUDGET_TYPE_LABELS[campaign.budgetType]} />
            <InfoCell label="Budget" value={formatCurrency(campaign.budgetAmount)} />
            <InfoCell label="Spent" value={formatCurrency(campaign.spentAmount)} />
            <InfoCell label="Budget Used" value={`${budgetUsed}%`} />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Impressions" value={formatNumber(campaign.totalImpressions)} />
            <MetricCard label="Clicks" value={formatNumber(campaign.totalClicks)} />
            <MetricCard label="CTR" value={`${ctr}%`} />
            <MetricCard label="Conversions" value={String(campaign.totalConversions)} />
            <MetricCard label="Conv. Rate" value={`${convRate}%`} />
            <MetricCard label="Revenue" value={formatCurrency(campaign.conversionRevenue)} />
            <MetricCard label="ROAS" value={perf ? `${perf.roas}x` : '—'} />
            <MetricCard label="Avg CPC" value={perf ? formatCurrency(perf.avgCpc) : '—'} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <InfoCell label="Start Date" value={formatDate(campaign.startDate)} />
            <InfoCell label="End Date" value={campaign.endDate ? formatDate(campaign.endDate) : 'No end date'} />
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

          {/* Products */}
          {products && products.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Campaign Products ({products.length})</div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Product</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Impressions</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Clicks</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Conv.</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 text-gray-700">{p.productName || p.productId}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(p.impressions)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(p.clicks)}</td>
                        <td className="px-3 py-2 text-right">{p.conversions}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(p.spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Banner Preview */}
          {campaign.bannerImageUrl && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Banner Preview</div>
              <img
                src={campaign.bannerImageUrl}
                alt="Campaign banner"
                className="w-full max-h-48 object-cover rounded-lg border"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t">
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}

function CampaignFormModal({
  campaign, onClose, onSubmit, isLoading,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onSubmit: (data: CreateCampaignData) => Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState(campaign?.name ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [campaignType, setCampaignType] = useState<CampaignType>(campaign?.campaignType ?? 'sponsored_listing');
  const [budgetType, setBudgetType] = useState<BudgetType>(campaign?.budgetType ?? 'total');
  const [budgetAmount, setBudgetAmount] = useState(campaign?.budgetAmount ?? 1000);
  const [dailyBudget, setDailyBudget] = useState(campaign?.dailyBudget ?? 0);
  const [bidType, setBidType] = useState<BidType>(campaign?.bidType ?? 'cpc');
  const [bidAmount, setBidAmount] = useState(campaign?.bidAmount ?? 2);
  const [placement, setPlacement] = useState<AdPlacement>(campaign?.placement ?? 'search_results');
  const [bannerImageUrl, setBannerImageUrl] = useState(campaign?.bannerImageUrl ?? '');
  const [bannerLinkUrl, setBannerLinkUrl] = useState(campaign?.bannerLinkUrl ?? '');
  const [startDate, setStartDate] = useState(campaign?.startDate?.split('T')[0] ?? '');
  const [endDate, setEndDate] = useState(campaign?.endDate?.split('T')[0] ?? '');
  const [keywords, setKeywords] = useState((campaign?.targeting?.keywords ?? []).join(', '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateCampaignData = {
      name,
      description: description || undefined,
      campaign_type: campaignType,
      budget_type: budgetType,
      budget_amount: budgetAmount,
      daily_budget: dailyBudget || undefined,
      bid_type: bidType,
      bid_amount: bidAmount,
      targeting: keywords ? { keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) } : undefined,
      placement,
      banner_image_url: bannerImageUrl || undefined,
      banner_link_url: bannerLinkUrl || undefined,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : undefined,
    };
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 mb-10">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{campaign ? 'Edit Campaign' : 'New Campaign'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
              <select value={campaignType} onChange={(e) => setCampaignType(e.target.value as CampaignType)} className="w-full px-3 py-2 border rounded-lg text-sm">
                {(Object.entries(CAMPAIGN_TYPE_LABELS) as [CampaignType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placement</label>
              <select value={placement} onChange={(e) => setPlacement(e.target.value as AdPlacement)} className="w-full px-3 py-2 border rounded-lg text-sm">
                {(Object.entries(PLACEMENT_LABELS) as [AdPlacement, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Type</label>
              <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as BudgetType)} className="w-full px-3 py-2 border rounded-lg text-sm">
                {(Object.entries(BUDGET_TYPE_LABELS) as [BudgetType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount (PHP) *</label>
              <input type="number" required min={0} step={0.01} value={budgetAmount} onChange={(e) => setBudgetAmount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Budget (PHP)</label>
              <input type="number" min={0} step={0.01} value={dailyBudget} onChange={(e) => setDailyBudget(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bid Type</label>
              <select value={bidType} onChange={(e) => setBidType(e.target.value as BidType)} className="w-full px-3 py-2 border rounded-lg text-sm">
                {(Object.entries(BID_TYPE_LABELS) as [BidType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bid Amount (PHP) *</label>
              <input type="number" required min={0} step={0.01} value={bidAmount} onChange={(e) => setBidAmount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
              <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. chips, snacks, sale" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            {(campaignType === 'banner_ad' || campaignType === 'featured_store') && (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image URL</label>
                  <input type="url" value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Link URL</label>
                  <input type="url" value={bannerLinkUrl} onChange={(e) => setBannerLinkUrl(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name || !startDate}
              className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
