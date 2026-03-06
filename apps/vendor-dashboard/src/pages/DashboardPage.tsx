import { useAuthStore } from '@/stores/auth.store';
import { useDashboardStats } from '@/hooks/useStore';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { RecentOrdersWidget } from '@/components/dashboard/RecentOrdersWidget';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

function formatCurrency(amount: number | undefined | null): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount ?? 0);
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDashboardStats(user?.vendorId || null);

  if (isLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          label="Today's Orders"
          value={String(data?.todayOrders ?? 0)}
          trend={data?.todayOrdersTrend ?? 0}
          trendLabel="vs yesterday"
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Today's Revenue"
          value={formatCurrency(data?.todayRevenue ?? 0)}
          trend={data?.todayRevenueTrend ?? 0}
          trendLabel="vs yesterday"
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Pending Orders"
          value={String(data?.pendingOrders ?? 0)}
          trend={data?.pendingOrdersTrend ?? 0}
          trendLabel="vs yesterday"
        />
        <StatCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          label="Low Stock Items"
          value={String(data?.lowStockItems ?? 0)}
          trend={data?.lowStockItemsTrend ?? 0}
          trendLabel="vs yesterday"
        />
      </div>

      {/* Service Type Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Orders by Service Type</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Grocery', key: 'grocery', color: 'bg-green-500' },
            { label: 'Food', key: 'food', color: 'bg-orange-500' },
            { label: 'Pharmacy', key: 'pharmacy', color: 'bg-purple-500' },
            { label: 'Parcel', key: 'parcel', color: 'bg-blue-500' },
          ].map((type) => {
            const count = (data?.serviceTypeBreakdown as Record<string, number> | undefined)?.[type.key] ?? 0;
            return (
              <div key={type.key} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                <div className={`h-3 w-3 rounded-full ${type.color}`} />
                <div>
                  <p className="text-xs text-gray-500">{type.label}</p>
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue Chart + Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={Array.isArray(data?.revenueChart) ? data.revenueChart : []} />
        </div>
        <div className="lg:col-span-1">
          <RecentOrdersWidget orders={Array.isArray(data?.recentOrders) ? data.recentOrders : []} />
        </div>
      </div>
    </div>
  );
}
