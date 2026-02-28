import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface StoreCardProps {
  slug: string;
  name: string;
  logoUrl: string;
  category: string;
  rating: number;
  reviewCount: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  deliveryFee: number;
  isOpen: boolean;
  distanceKm?: number;
}

export function StoreCard({
  slug,
  name,
  logoUrl,
  category,
  rating,
  reviewCount,
  deliveryTimeMin,
  deliveryTimeMax,
  deliveryFee,
  isOpen,
  distanceKm,
}: StoreCardProps) {
  return (
    <Link to={`/stores/${slug}`}>
      <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <div className="flex gap-4 p-4">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {!isOpen && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                <span className="text-[10px] font-bold text-white">CLOSED</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {name}
              </h3>
              <Badge variant={isOpen ? 'success' : 'muted'} className="flex-shrink-0">
                {isOpen ? 'Open' : 'Closed'}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{category}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5 fill-accent text-accent"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {rating.toFixed(1)} ({reviewCount})
              </span>
              <span className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5"
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
                {deliveryTimeMin}-{deliveryTimeMax} min
              </span>
              {distanceKm !== undefined && (
                <span className="flex items-center gap-1">
                  <svg
                    className="h-3.5 w-3.5"
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
                  {distanceKm.toFixed(1)} km
                </span>
              )}
              {deliveryFee > 0 && (
                <span className="text-primary font-medium">
                  Delivery: PHP {deliveryFee.toFixed(0)}
                </span>
              )}
              {deliveryFee === 0 && (
                <span className="text-success font-medium">Free delivery</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
