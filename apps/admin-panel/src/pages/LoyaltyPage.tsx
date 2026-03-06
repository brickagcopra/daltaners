import { useState } from 'react';
import { useLoyaltyAccounts, useLoyaltyStats, useAdjustLoyaltyPoints } from '@/hooks/useLoyalty';
import type { LoyaltyAccount } from '@/hooks/useLoyalty';

const tierColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-gray-100 text-gray-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
};

export function LoyaltyPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [adjustModal, setAdjustModal] = useState<LoyaltyAccount | null>(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const { data: statsData } = useLoyaltyStats();
  const { data, isLoading } = useLoyaltyAccounts({
    page,
    limit: 20,
    search: search || undefined,
    tier: tierFilter || undefined,
  });
  const adjustMutation = useAdjustLoyaltyPoints();

  const accounts = Array.isArray(data?.items) ? data.items : [];
  const meta = data?.meta;
  const stats = statsData ?? null;

  const handleAdjust = () => {
    if (!adjustModal || !adjustPoints || !adjustReason) return;
    adjustMutation.mutate(
      {
        accountId: adjustModal.id,
        points: parseInt(adjustPoints, 10),
        reason: adjustReason,
      },
      {
        onSuccess: () => {
          setAdjustModal(null);
          setAdjustPoints('');
          setAdjustReason('');
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loyalty Program</h1>
        <p className="text-sm text-gray-500">
          Manage loyalty accounts, points, and tier memberships
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total Accounts</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_accounts.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{stats.active_accounts} active</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Points Outstanding</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_points_outstanding.toLocaleString()}</p>
            <p className="text-xs text-gray-400">P{(stats.total_points_outstanding * 0.5).toLocaleString()} liability</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Avg. Balance</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avg_points_balance.toLocaleString()}</p>
            <p className="text-xs text-gray-400">points per account</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">By Tier</p>
            <div className="mt-1 flex gap-2 flex-wrap">
              {Object.entries(stats.by_tier).map(([tier, count]) => (
                <span key={tier} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[tier] || 'bg-gray-100 text-gray-700'}`}>
                  {tier}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by user ID..."
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
        />
        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Tiers</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">User ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tier</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Points</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Lifetime</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Joined</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No loyalty accounts found
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {account.user_id.substring(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tierColors[account.tier] || 'bg-gray-100 text-gray-700'}`}>
                      {account.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {account.points_balance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {account.lifetime_points.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                    {account.account_type}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(account.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setAdjustModal(account)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= meta.totalPages}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Adjust Points</h2>
            <p className="text-sm text-gray-500 mb-4">
              Account: {adjustModal.user_id.substring(0, 8)}... | Current balance: {adjustModal.points_balance.toLocaleString()} pts
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points (positive to add, negative to deduct)
                </label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="e.g. 500 or -200"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment (min 5 characters)"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {adjustMutation.isError && (
              <p className="mt-3 text-sm text-red-600">
                Failed to adjust points. Please try again.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setAdjustModal(null);
                  setAdjustPoints('');
                  setAdjustReason('');
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={!adjustPoints || !adjustReason || adjustReason.length < 5 || adjustMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
