import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DietaryBadge } from './DietaryBadge';

interface RestaurantCardProps {
  id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  cuisine?: string;
  prepTime?: number;
  rating?: number;
  ratingCount?: number;
  isOpen?: boolean;
  closingTime?: string;
  dietaryTags?: string[];
  distance?: string;
}

export function RestaurantCard({
  slug,
  name,
  description,
  imageUrl,
  cuisine,
  prepTime,
  rating,
  ratingCount,
  isOpen = true,
  closingTime,
  dietaryTags = [],
  distance,
}: RestaurantCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/stores/${slug}`}
      className="group block rounded-xl border border-border bg-white overflow-hidden transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-12 w-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5V3m12 8.25H3" />
            </svg>
          </div>
        )}
        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-foreground">
              {t('store.closed', 'Closed')}
            </span>
          </div>
        )}
        {cuisine && (
          <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {cuisine}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
          {rating !== undefined && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <svg className="h-4 w-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              {ratingCount !== undefined && (
                <span className="text-xs text-muted-foreground">({ratingCount})</span>
              )}
            </div>
          )}
        </div>

        {description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{description}</p>
        )}

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {prepTime !== undefined && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {prepTime} min
            </span>
          )}
          {distance && (
            <span>{distance}</span>
          )}
          {closingTime && isOpen && (
            <span className="text-emerald-600">
              {t('food.openUntil', 'Open until {{time}}', { time: closingTime })}
            </span>
          )}
        </div>

        {dietaryTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {dietaryTags.map((tag) => (
              <DietaryBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
