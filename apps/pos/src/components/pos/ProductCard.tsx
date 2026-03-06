import { formatCurrency } from '@/lib/format';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  onAdd: () => void;
}

export function ProductCard({ name, price, salePrice, imageUrl, onAdd }: ProductCardProps) {
  const displayPrice = salePrice ?? price;
  const hasDiscount = salePrice !== null && salePrice < price;

  return (
    <button
      onClick={onAdd}
      className="group flex flex-col overflow-hidden rounded-lg border border-pos-border bg-pos-card transition-all hover:border-primary-500/50 hover:bg-pos-hover active:scale-[0.97]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-pos-surface">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}
        {hasDiscount && (
          <span className="absolute right-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            SALE
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2">
        <p className="line-clamp-2 text-left text-xs font-medium text-gray-200">{name}</p>
        <div className="mt-auto flex items-baseline gap-1 pt-1">
          <span className="text-sm font-bold text-primary-400">{formatCurrency(displayPrice)}</span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-500 line-through">{formatCurrency(price)}</span>
          )}
        </div>
      </div>
    </button>
  );
}
