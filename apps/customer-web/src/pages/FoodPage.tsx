import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RestaurantCard } from '@/components/food/RestaurantCard';
import { useFoodStores } from '@/hooks/useFoodStores';

const CUISINE_FILTERS = ['All', 'Filipino', 'Chinese', 'Japanese', 'Korean', 'Italian', 'American', 'Thai'];
const DIETARY_FILTERS = ['halal', 'vegan', 'vegetarian', 'gluten-free'];

export function FoodPage() {
  const { t } = useTranslation();
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [selectedDietary, setSelectedDietary] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);

  const { data: stores = [], isLoading, error } = useFoodStores({
    cuisine: selectedCuisine !== 'All' ? selectedCuisine : undefined,
    dietary: selectedDietary || undefined,
    open_now: openNow || undefined,
  });

  return (
    <div className="container-app py-6">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('food.title', 'Food Delivery')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('food.subtitle', 'Order from your favorite restaurants — delivered fast')}
        </p>
      </div>

      {/* Cuisine Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {CUISINE_FILTERS.map((cuisine) => (
          <button
            key={cuisine}
            onClick={() => setSelectedCuisine(cuisine)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCuisine === cuisine
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cuisine}
          </button>
        ))}
      </div>

      {/* Secondary Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {/* Dietary Filters */}
        {DIETARY_FILTERS.map((dietary) => (
          <button
            key={dietary}
            onClick={() => setSelectedDietary(selectedDietary === dietary ? null : dietary)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedDietary === dietary
                ? 'bg-emerald-600 text-white'
                : 'border border-border bg-white text-muted-foreground hover:bg-muted'
            }`}
          >
            {dietary}
          </button>
        ))}
        {/* Open Now Toggle */}
        <button
          onClick={() => setOpenNow(!openNow)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            openNow
              ? 'bg-emerald-600 text-white'
              : 'border border-border bg-white text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('food.openNow', 'Open Now')}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{t('common.error')}</p>
        </div>
      )}

      {/* Restaurant Grid */}
      {!isLoading && !error && (
        <>
          {stores.length === 0 ? (
            <div className="rounded-lg border border-border bg-white p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5V3m12 8.25H3" />
              </svg>
              <p className="mt-4 text-muted-foreground">
                {t('food.noRestaurants', 'No restaurants found matching your filters')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stores.map((store) => (
                <RestaurantCard
                  key={store.id}
                  id={store.id}
                  slug={store.slug}
                  name={store.name}
                  description={store.description}
                  imageUrl={store.banner_url || store.logo_url || undefined}
                  prepTime={store.preparation_time_minutes}
                  rating={store.rating_average}
                  ratingCount={store.rating_count}
                  isOpen={true}
                  dietaryTags={(store.metadata?.dietary_tags as string[]) || []}
                  distance={store.distance}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
