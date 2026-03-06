import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface VendorStatsData {
  totalStores: number;
  activeStores: number;
  pendingStores: number;
  suspendedStores: number;
  storesByCategory: { category: string; count: number }[];
  averageRating: number;
  totalOrders: number;
}

interface VendorStatsWidgetProps {
  stats: VendorStatsData;
}

export function VendorStatsWidget({ stats }: VendorStatsWidgetProps) {
  const statusItems = [
    { label: 'Active', value: stats.activeStores, color: 'bg-green-500' },
    { label: 'Pending', value: stats.pendingStores, color: 'bg-amber-500' },
    { label: 'Suspended', value: stats.suspendedStores, color: 'bg-red-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {/* Summary row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalStores}</p>
              <p className="text-xs text-muted-foreground">Total Stores</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">{stats.averageRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">{stats.totalOrders.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="flex gap-3">
            {statusItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-sm">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span className="text-muted-foreground">{item.label}:</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Categories list */}
          {stats.storesByCategory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                By Category
              </p>
              {stats.storesByCategory.map((cat) => {
                const pct = stats.totalStores > 0
                  ? ((cat.count / stats.totalStores) * 100).toFixed(0)
                  : '0';
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="w-28 truncate text-sm text-muted-foreground capitalize">
                      {cat.category.replace(/_/g, ' ')}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium text-foreground">
                      {cat.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
