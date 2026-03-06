import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProductCard } from '@/components/product/ProductCard';
import { RecommendationCarousel } from '@/components/product/RecommendationCarousel';
import { StoreCard } from '@/components/store/StoreCard';
import { useProducts } from '@/hooks/useProducts';
import { useNearbyStores } from '@/hooks/useStores';
import { useCategories } from '@/hooks/useCategories';
import { usePopularProducts, usePersonalizedProducts } from '@/hooks/useRecommendations';
import { useAuthStore } from '@/stores/auth.store';
import { useCityStore } from '@/stores/city.store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SponsoredProductCard } from '@/components/product/SponsoredProductCard';
import { useSponsoredProducts } from '@/hooks/useSponsored';

// Map category slugs to icons and colors for visual presentation
const CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  'rice-grains':     { icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z', color: 'bg-green-50 text-green-600' },
  'canned-goods':    { icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z', color: 'bg-yellow-50 text-yellow-600' },
  'instant-noodles': { icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z', color: 'bg-orange-50 text-orange-600' },
  'coffee-drinks':   { icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5', color: 'bg-blue-50 text-blue-600' },
  'condiments':      { icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082', color: 'bg-amber-50 text-amber-600' },
  'snacks':          { icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155', color: 'bg-purple-50 text-purple-600' },
  'vegetables':      { icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z', color: 'bg-emerald-50 text-emerald-600' },
  'fruits':          { icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z', color: 'bg-red-50 text-red-600' },
  'meat-seafood':    { icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z', color: 'bg-rose-50 text-rose-600' },
  'bread-bakery':    { icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513', color: 'bg-amber-50 text-amber-600' },
  'medicines-otc':   { icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0', color: 'bg-sky-50 text-sky-600' },
  'personal-care':   { icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z', color: 'bg-pink-50 text-pink-600' },
  'electronics':     { icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3', color: 'bg-indigo-50 text-indigo-600' },
};

const DEFAULT_STYLE = { icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z', color: 'bg-gray-50 text-gray-600' };

export function HomePage() {
  const cityLat = useCityStore((s) => s.cityLat);
  const cityLng = useCityStore((s) => s.cityLng);
  const selectedCity = useCityStore((s) => s.selectedCity);

  const { data: productsData, isLoading: productsLoading } = useProducts({ limit: 8 });
  const { data: storesData, isLoading: storesLoading } = useNearbyStores(cityLat, cityLng);
  const { data: categories } = useCategories();
  const { data: popularProducts, isLoading: popularLoading } = usePopularProducts({ limit: 8 });
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: personalizedProducts, isLoading: personalizedLoading } = usePersonalizedProducts(8);
  const { data: sponsoredProducts } = useSponsoredProducts('home_page', 4);

  // Only show top-level categories (level 0), limit to 6 for the grid
  const topCategories = (categories ?? []).filter((c) => c.level === 0).slice(0, 6);

  const products = Array.isArray(productsData?.data) ? productsData.data : [];
  const stores = Array.isArray(storesData?.data) ? storesData.data : [];

  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-primary to-primary-700 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.08%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="container-app relative py-16 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl text-balance">
              Fresh groceries, delivered to your doorstep
            </h1>
            <p className="mt-4 text-lg text-white/80 sm:text-xl">
              Shop from your favorite local stores in the Philippines. Fast delivery, great prices, and the freshest products.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/search">
                <Button size="lg" variant="accent" className="font-semibold">
                  Shop Now
                </Button>
              </Link>
              <Link to="/search">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  Browse Stores
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="container-app py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Shop by Category</h2>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {topCategories.map((cat) => {
            const style = CATEGORY_STYLE[cat.slug] ?? DEFAULT_STYLE;
            return (
              <Link key={cat.id} to={`/search?category=${cat.id}`}>
                <Card className="flex flex-col items-center gap-3 p-4 text-center hover:border-primary/30 cursor-pointer transition-all">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${style.color}`}>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Nearby Stores */}
      <section className="container-app py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Nearby Stores</h2>
            <p className="mt-1 text-sm text-muted-foreground">Popular stores in {selectedCity}</p>
          </div>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">
            See All
          </Link>
        </div>
        {storesLoading ? (
          <LoadingSpinner />
        ) : stores.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stores.slice(0, 4).map((store) => (
              <StoreCard
                key={store.slug}
                slug={store.slug}
                name={store.name}
                logoUrl={store.logo_url || `https://placehold.co/200x200/FF6B35/white?text=${store.name.charAt(0)}`}
                category={store.category}
                rating={store.rating}
                reviewCount={store.review_count}
                deliveryTimeMin={store.delivery_time_min}
                deliveryTimeMax={store.delivery_time_max}
                deliveryFee={store.delivery_fee}
                isOpen={store.is_open}
                distanceKm={store.distance_km}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No nearby stores found.</p>
        )}
      </section>

      {/* Sponsored Products */}
      {sponsoredProducts && sponsoredProducts.length > 0 && (
        <section className="container-app py-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Promoted Products</h2>
            <p className="mt-1 text-sm text-muted-foreground">Featured by our partner stores</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sponsoredProducts.map((sp) => (
              <SponsoredProductCard key={sp.campaign_product_id} product={sp} placement="home_page" />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container-app py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Featured Products</h2>
            <p className="mt-1 text-sm text-muted-foreground">Handpicked deals and popular items</p>
          </div>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">
            View All
          </Link>
        </div>
        {productsLoading ? (
          <LoadingSpinner />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                salePrice={product.sale_price}
                imageUrl={product.images[0] || '/placeholder-product.png'}
                storeName={product.store_name}
                storeId={product.store_id}
                rating={product.rating}
                inStock={product.in_stock}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No products available.</p>
        )}
      </section>

      {/* Popular in Your Area */}
      <section className="container-app">
        <RecommendationCarousel
          title="Popular in Your Area"
          subtitle="Trending products near you"
          products={popularProducts ?? []}
          isLoading={popularLoading}
        />
      </section>

      {/* Personalized Recommendations (auth only) */}
      {isAuthenticated && (
        <section className="container-app">
          <RecommendationCarousel
            title="Recommended for You"
            subtitle="Based on your order history"
            products={personalizedProducts ?? []}
            isLoading={personalizedLoading}
          />
        </section>
      )}

      {/* Promo Banner */}
      <section className="container-app py-10">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-secondary to-secondary-700 p-8 sm:p-12">
          <div className="max-w-lg">
            <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-foreground">
              NEW CUSTOMERS
            </span>
            <h3 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
              Get PHP 200 off your first order!
            </h3>
            <p className="mt-2 text-white/80">
              Use code <span className="font-bold text-accent">DALTANERS200</span> at checkout. Minimum order of PHP 500.
            </p>
            <Link to="/search">
              <Button size="lg" variant="accent" className="mt-6 font-semibold">
                Start Shopping
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
