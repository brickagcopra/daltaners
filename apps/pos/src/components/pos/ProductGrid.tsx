import { useState, useMemo, useRef, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { CategoryBar } from './CategoryBar';
import { useCartStore } from '@/stores/cart.store';
import { Input } from '@/components/ui/Input';

interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  sku: string;
  barcode: string | null;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  unit_type: string;
  images: Array<{ url: string; thumbnail_url: string }>;
}

interface Category {
  id: string;
  name: string;
  children?: Category[];
}

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  scanFeedback?: { type: 'success' | 'error'; message: string } | null;
}

export interface ProductGridHandle {
  focusSearch: () => void;
}

export const ProductGrid = forwardRef<ProductGridHandle, ProductGridProps>(
  function ProductGrid({ products, categories, isLoading, scanFeedback }, ref) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const addItem = useCartStore((s) => s.addItem);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusSearch() {
        searchInputRef.current?.focus();
      },
    }));

    const filtered = useMemo(() => {
      let list = products.filter((p) => p.is_active);

      if (selectedCategory) {
        // Match direct category or parent category
        const parentCat = categories.find((c) => c.id === selectedCategory);
        if (parentCat?.children?.length) {
          const childIds = parentCat.children.map((ch) => ch.id);
          list = list.filter((p) => p.category_id === selectedCategory || childIds.includes(p.category_id));
        } else {
          list = list.filter((p) => p.category_id === selectedCategory);
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.includes(q)),
        );
      }

      return list;
    }, [products, categories, selectedCategory, search]);

    const handleAddProduct = useCallback(
      (product: Product) => {
        addItem({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unit_price: product.sale_price ?? product.base_price,
          image_url: product.images[0]?.thumbnail_url ?? null,
        });
      },
      [addItem],
    );

    const handleSearchKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter' || !search.trim()) return;

        // Try exact barcode match first
        const exactMatch = products.find(
          (p) => p.is_active && p.barcode && p.barcode === search.trim(),
        );
        if (exactMatch) {
          handleAddProduct(exactMatch);
          setSearch('');
          return;
        }

        // If exactly one product matches the search, auto-add it
        if (filtered.length === 1) {
          handleAddProduct(filtered[0]);
          setSearch('');
        }
      },
      [search, products, filtered, handleAddProduct],
    );

    if (isLoading) {
      return (
        <div className="flex flex-1 flex-col gap-3 p-3">
          <div className="h-8 animate-pulse rounded bg-pos-card" />
          <div className="h-9 animate-pulse rounded bg-pos-card" />
          <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-pos-card" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        {/* Scan feedback toast */}
        {scanFeedback && (
          <div
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              scanFeedback.type === 'success'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {scanFeedback.type === 'success' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              )}
              {scanFeedback.message}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Input
            ref={searchInputRef}
            placeholder="Search products (name, SKU, barcode)... Ctrl+B"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            }
          />
        </div>

        {/* Category tabs */}
        <CategoryBar
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No products found</p>
                {search && (
                  <button onClick={() => setSearch('')} className="mt-1 text-xs text-primary-400 hover:underline">
                    Clear search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.base_price}
                  salePrice={product.sale_price}
                  imageUrl={product.images[0]?.thumbnail_url ?? null}
                  onAdd={() => handleAddProduct(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);
