import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProductCard } from '@/components/product/ProductCard';
import { StoreCard } from '@/components/store/StoreCard';

const CATEGORIES = [
  { id: 'groceries', name: 'Groceries', icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z', color: 'bg-green-50 text-green-600' },
  { id: 'fruits-vegetables', name: 'Fruits & Veggies', icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z', color: 'bg-orange-50 text-orange-600' },
  { id: 'meat-seafood', name: 'Meat & Seafood', icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z', color: 'bg-red-50 text-red-600' },
  { id: 'beverages', name: 'Beverages', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5', color: 'bg-blue-50 text-blue-600' },
  { id: 'snacks', name: 'Snacks & Chips', icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155', color: 'bg-purple-50 text-purple-600' },
  { id: 'household', name: 'Household', icon: 'M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819', color: 'bg-teal-50 text-teal-600' },
];

const PLACEHOLDER_STORES = [
  { slug: 'metro-mart-makati', name: 'Metro Mart Makati', logoUrl: 'https://placehold.co/200x200/FF6B35/white?text=MM', category: 'Supermarket', rating: 4.7, reviewCount: 1243, deliveryTimeMin: 25, deliveryTimeMax: 40, deliveryFee: 49, isOpen: true, distanceKm: 1.2 },
  { slug: 'fresh-greens-bgc', name: 'Fresh Greens BGC', logoUrl: 'https://placehold.co/200x200/22C55E/white?text=FG', category: 'Organic Store', rating: 4.9, reviewCount: 876, deliveryTimeMin: 30, deliveryTimeMax: 45, deliveryFee: 0, isOpen: true, distanceKm: 2.1 },
  { slug: 'lolas-sari-sari', name: "Lola's Sari-Sari Store", logoUrl: 'https://placehold.co/200x200/004E89/white?text=LS', category: 'Sari-Sari Store', rating: 4.5, reviewCount: 542, deliveryTimeMin: 15, deliveryTimeMax: 25, deliveryFee: 29, isOpen: true, distanceKm: 0.5 },
  { slug: 'butchers-choice', name: "Butcher's Choice", logoUrl: 'https://placehold.co/200x200/EF4444/white?text=BC', category: 'Meat Shop', rating: 4.6, reviewCount: 321, deliveryTimeMin: 35, deliveryTimeMax: 50, deliveryFee: 59, isOpen: false, distanceKm: 3.4 },
];

const PLACEHOLDER_PRODUCTS = [
  { id: '1', name: 'Fresh Manila Mangoes (1kg)', price: 180, salePrice: 149, imageUrl: 'https://placehold.co/400x400/FFD700/333?text=Mango', storeName: 'Fresh Greens BGC', storeId: 'store-1', rating: 4.8, inStock: true },
  { id: '2', name: 'Jasmine Rice Premium 5kg', price: 350, salePrice: null, imageUrl: 'https://placehold.co/400x400/F5F5DC/333?text=Rice', storeName: 'Metro Mart Makati', storeId: 'store-2', rating: 4.7, inStock: true },
  { id: '3', name: 'Bangus Boneless (500g)', price: 220, salePrice: 189, imageUrl: 'https://placehold.co/400x400/87CEEB/333?text=Fish', storeName: "Butcher's Choice", storeId: 'store-3', rating: 4.5, inStock: true },
  { id: '4', name: 'San Miguel Pale Pilsen 6-Pack', price: 280, salePrice: null, imageUrl: 'https://placehold.co/400x400/DAA520/333?text=Beer', storeName: "Lola's Sari-Sari", storeId: 'store-4', rating: 4.9, inStock: true },
  { id: '5', name: 'Gardenia Classic White Bread', price: 62, salePrice: null, imageUrl: 'https://placehold.co/400x400/FAEBD7/333?text=Bread', storeName: 'Metro Mart Makati', storeId: 'store-2', rating: 4.4, inStock: true },
  { id: '6', name: 'Lucky Me! Pancit Canton Sweet & Spicy (6pcs)', price: 90, salePrice: 78, imageUrl: 'https://placehold.co/400x400/FF6347/fff?text=Noodles', storeName: "Lola's Sari-Sari", storeId: 'store-4', rating: 4.6, inStock: false },
  { id: '7', name: 'Fresh Eggs Medium (12pcs)', price: 108, salePrice: null, imageUrl: 'https://placehold.co/400x400/FFF8DC/333?text=Eggs', storeName: 'Fresh Greens BGC', storeId: 'store-1', rating: 4.3, inStock: true },
  { id: '8', name: 'Nestle Bear Brand Fortified (1L)', price: 95, salePrice: 85, imageUrl: 'https://placehold.co/400x400/FFFAF0/333?text=Milk', storeName: 'Metro Mart Makati', storeId: 'store-2', rating: 4.7, inStock: true },
];

export function HomePage() {
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
          {CATEGORIES.map((cat) => (
            <Link key={cat.id} to={`/search?category=${cat.id}`}>
              <Card className="flex flex-col items-center gap-3 p-4 text-center hover:border-primary/30 cursor-pointer transition-all">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${cat.color}`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Nearby Stores */}
      <section className="container-app py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Nearby Stores</h2>
            <p className="mt-1 text-sm text-muted-foreground">Popular stores in your area</p>
          </div>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">
            See All
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLACEHOLDER_STORES.map((store) => (
            <StoreCard key={store.slug} {...store} />
          ))}
        </div>
      </section>

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PLACEHOLDER_PRODUCTS.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </section>

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
