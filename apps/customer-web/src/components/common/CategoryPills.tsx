import { useRef } from 'react';
import { cn } from '@/components/ui/cn';

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface CategoryPillsProps {
  categories: Category[];
  selected?: string;
  onSelect: (categoryId: string) => void;
  className?: string;
}

export function CategoryPills({
  categories,
  selected,
  onSelect,
  className,
}: CategoryPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={cn('relative group', className)}>
      <button
        onClick={() => scroll('left')}
        className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        aria-label="Scroll categories left"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1"
      >
        <button
          onClick={() => onSelect('')}
          className={cn(
            'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            !selected
              ? 'bg-primary text-white shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground',
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              selected === cat.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground',
            )}
          >
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {cat.name}
          </button>
        ))}
      </div>

      <button
        onClick={() => scroll('right')}
        className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        aria-label="Scroll categories right"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}
