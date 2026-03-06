import { useOrderStats } from '@/hooks/useOrders';
import { useVendorStats } from '@/hooks/useVendors';
import { useReturnStats } from '@/hooks/useReturns';
import { useDisputeStats } from '@/hooks/useDisputes';
import { useAdminProductStats } from '@/hooks/useProducts';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersChart } from '@/components/dashboard/OrdersChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { TopStoresWidget } from '@/components/dashboard/TopStoresWidget';
import { VendorStatsWidget } from '@/components/dashboard/VendorStatsWidget';
import { ReturnStatsWidget } from '@/components/dashboard/ReturnStatsWidget';
import { PlatformKPICards } from '@/components/dashboard/PlatformKPICards';
import { PendingActionsWidget } from '@/components/dashboard/PendingActionsWidget';
import { GrowthMetricsChart } from '@/components/dashboard/GrowthMetricsChart';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Extended type covering extra fields from admin dashboard mock
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  ordersByDay: { date: string; count: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[] | Record<string, number>;
  topStores: { store_id: string; store_name?: string; name?: string; order_count?: number; orders?: number; revenue: number }[];
  // Extra fields from adminDashboard mock
  totalUsers?: number;
  totalVendors?: number;
  monthlyGrowth?: number;
  revenueByMonth?: { month: string; revenue: number }[];
  pendingVendorApprovals?: number;
  activeDeliveryPersonnel?: number;
}

export function DashboardPage() {
  const { data, isLoading, isError } = useOrderStats();
  const { data: vendorStatsData } = useVendorStats();
  const { data: returnStatsData } = useReturnStats();
  const { data: disputeStatsData } = useDisputeStats();
  const { data: productStatsData } = useAdminProductStats();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = data?.data as DashboardStats | undefined;

  if (isError || !stats || typeof stats.totalOrders !== 'number') {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Failed to load dashboard data.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number | undefined | null) =>
    `P${(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  // Compute pending action counts
  const pendingVendors = vendorStatsData?.data?.pendingStores ?? stats.pendingVendorApprovals ?? 0;
  const openDisputes = disputeStatsData?.data
    ? (disputeStatsData.data.by_status?.open ?? 0) + (disputeStatsData.data.by_status?.escalated ?? 0)
    : 0;
  const pendingReturns = returnStatsData?.data?.by_status?.pending ?? 0;
  const pendingProducts = productStatsData?.data?.pending ?? 0;

  // Normalize ordersByStatus (mock returns object, interface expects array)
  const ordersByStatusArray = Array.isArray(stats.ordersByStatus)
    ? stats.ordersByStatus
    : Object.entries(stats.ordersByStatus || {}).map(([status, count]) => ({
        status,
        count: count as number,
      }));

  // Normalize topStores (mock uses `name` and `orders`, interface uses `store_name` and `order_count`)
  const normalizedTopStores = Array.isArray(stats.topStores)
    ? stats.topStores.map((s) => ({
        store_id: s.store_id,
        store_name: s.store_name ?? s.name ?? 'Unknown',
        order_count: s.order_count ?? s.orders ?? 0,
        revenue: s.revenue,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Platform overview and key metrics</p>
      </div>

      {/* Platform KPI Cards */}
      <PlatformKPICards
        totalUsers={stats.totalUsers ?? 0}
        gmv={stats.totalRevenue}
        monthlyGrowth={stats.monthlyGrowth ?? 0}
        activeVendors={vendorStatsData?.data?.activeStores ?? 0}
        totalVendors={vendorStatsData?.data?.totalStores ?? stats.totalVendors ?? 0}
      />

      {/* Order Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          icon={
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBg="bg-green-100"
        />
        <StatCard
          title="Today's Orders"
          value={stats.todayOrders.toLocaleString()}
          change={`${formatCurrency(stats.todayRevenue)} revenue`}
          changeType="neutral"
          icon={
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(stats.averageOrderValue)}
          change={`${stats.pendingOrders} pending`}
          changeType="neutral"
          icon={
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
          iconBg="bg-amber-100"
        />
      </div>

      {/* Pending Actions + Revenue Growth */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PendingActionsWidget
          pendingVendors={pendingVendors}
          openDisputes={openDisputes}
          pendingReturns={pendingReturns}
          pendingProducts={pendingProducts}
        />
        <div className="lg:col-span-2">
          <GrowthMetricsChart data={stats.revenueByMonth ?? []} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OrdersChart data={Array.isArray(stats.ordersByDay) ? stats.ordersByDay : []} />
        <RevenueChart data={Array.isArray(stats.ordersByDay) ? stats.ordersByDay : []} />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopStoresWidget stores={normalizedTopStores} />

        {/* Orders by Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Orders by Status</h3>
          {ordersByStatusArray.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No data available</p>
          ) : (
            <div className="space-y-3">
              {ordersByStatusArray.map((item) => {
                const total = stats.totalOrders || 1;
                const pct = ((item.count / total) * 100).toFixed(1);
                return (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className="w-24 text-sm capitalize text-gray-600">
                      {item.status.replace('_', ' ')}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm font-medium text-gray-700">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vendor Stats & Returns Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {vendorStatsData?.data && typeof vendorStatsData.data === 'object' && typeof vendorStatsData.data.totalStores === 'number' && (
          <VendorStatsWidget stats={vendorStatsData.data} />
        )}
        <ReturnStatsWidget />
      </div>
    </div>
  );
}
