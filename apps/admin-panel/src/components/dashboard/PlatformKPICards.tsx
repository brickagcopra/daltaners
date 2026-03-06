import { StatCard } from './StatCard';

interface PlatformKPICardsProps {
  totalUsers: number;
  gmv: number;
  monthlyGrowth: number;
  activeVendors: number;
  totalVendors: number;
}

export function PlatformKPICards({
  totalUsers,
  gmv,
  monthlyGrowth,
  activeVendors,
  totalVendors,
}: PlatformKPICardsProps) {
  const formatCurrency = (amount: number) =>
    `P${amount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  const conversionRate = totalVendors > 0
    ? ((activeVendors / totalVendors) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Gross Merchandise Value"
        value={formatCurrency(gmv)}
        change={`${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth}% this month`}
        changeType={monthlyGrowth >= 0 ? 'positive' : 'negative'}
        icon={
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        }
        iconBg="bg-emerald-100"
      />
      <StatCard
        title="Registered Users"
        value={totalUsers.toLocaleString()}
        icon={
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        }
        iconBg="bg-blue-100"
      />
      <StatCard
        title="Vendor Activation Rate"
        value={`${conversionRate}%`}
        change={`${activeVendors} of ${totalVendors} vendors`}
        changeType="neutral"
        icon={
          <svg className="h-6 w-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        }
        iconBg="bg-violet-100"
      />
      <StatCard
        title="Monthly Growth"
        value={`${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth}%`}
        changeType={monthlyGrowth >= 0 ? 'positive' : 'negative'}
        icon={
          <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        }
        iconBg="bg-orange-100"
      />
    </div>
  );
}
