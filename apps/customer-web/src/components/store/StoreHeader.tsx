import { Badge } from '@/components/ui/Badge';
import type { Store } from '@/hooks/useStores';

interface StoreHeaderProps {
  store: Store;
}

export function StoreHeader({ store }: StoreHeaderProps) {
  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 overflow-hidden rounded-xl bg-muted sm:h-64">
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={`${store.name} banner`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <span className="text-4xl font-bold text-primary/30">{store.name}</span>
          </div>
        )}
        {!store.is_open && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-6 py-2 text-lg font-bold text-foreground">
              Currently Closed
            </span>
          </div>
        )}
      </div>

      {/* Store Info */}
      <div className="relative -mt-10 px-4 sm:px-6">
        <div className="flex items-end gap-4">
          {/* Logo */}
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-4 border-white bg-white shadow-md">
            <img
              src={store.logo_url || '/placeholder-store.png'}
              alt={`${store.name} logo`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mb-1 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
              <Badge variant={store.is_open ? 'success' : 'muted'}>
                {store.is_open ? 'Open' : 'Closed'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{store.category}</p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 fill-accent text-accent" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium text-foreground">{store.rating.toFixed(1)}</span>
            <span>({store.review_count} reviews)</span>
          </span>

          <span className="flex items-center gap-1">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {store.delivery_time_min}-{store.delivery_time_max} min
          </span>

          {store.delivery_fee > 0 ? (
            <span className="font-medium text-primary">
              Delivery: PHP {store.delivery_fee.toFixed(0)}
            </span>
          ) : (
            <span className="font-medium text-success">Free delivery</span>
          )}

          {store.min_order > 0 && (
            <span>Min. order: PHP {store.min_order.toFixed(0)}</span>
          )}

          {store.distance_km !== undefined && (
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              {store.distance_km.toFixed(1)} km away
            </span>
          )}
        </div>

        {store.description && (
          <p className="mt-3 text-sm text-muted-foreground">{store.description}</p>
        )}

        {store.address && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <svg
              className="h-3.5 w-3.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            {store.address}
          </p>
        )}
      </div>
    </div>
  );
}
