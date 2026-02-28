import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface TopStore {
  storeId: string;
  storeName: string;
  orderCount: number;
  revenue: number;
}

interface TopStoresWidgetProps {
  stores: TopStore[];
}

export function TopStoresWidget({ stores }: TopStoresWidgetProps) {
  const maxRevenue = stores.length > 0 ? Math.max(...stores.map((s) => s.revenue)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Stores</CardTitle>
      </CardHeader>
      <CardContent>
        {stores.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No store data available</p>
        ) : (
          <div className="space-y-4">
            {stores.map((store, index) => (
              <div key={store.storeId} className="flex items-center gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-foreground">
                      {store.storeName}
                    </p>
                    <p className="ml-2 flex-shrink-0 text-sm font-semibold text-foreground">
                      P{(store.revenue / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(store.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {store.orderCount} orders
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
