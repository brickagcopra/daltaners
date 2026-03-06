import { cn } from '@/lib/cn';

interface Category {
  id: string;
  name: string;
  children?: Category[];
}

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryBar({ categories, selectedCategoryId, onSelect }: CategoryBarProps) {
  // Flatten to include children as individual tabs
  const flatCategories: Array<{ id: string; name: string; level: number }> = [];
  for (const cat of categories) {
    flatCategories.push({ id: cat.id, name: cat.name, level: 0 });
    if (cat.children) {
      for (const child of cat.children) {
        flatCategories.push({ id: child.id, name: child.name, level: 1 });
      }
    }
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
          selectedCategoryId === null
            ? 'bg-primary-500 text-white'
            : 'bg-pos-card text-gray-400 hover:bg-pos-hover hover:text-gray-200',
        )}
      >
        All
      </button>
      {flatCategories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            cat.level === 1 && 'pl-4',
            selectedCategoryId === cat.id
              ? 'bg-primary-500 text-white'
              : 'bg-pos-card text-gray-400 hover:bg-pos-hover hover:text-gray-200',
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
