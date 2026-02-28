import { useState } from 'react';
import { type Category } from '@/hooks/useCategories';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

interface CategoryTreeProps {
  categories: Category[];
  onAdd: (parentId?: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryTree({ categories, onAdd, onEdit, onDelete }: CategoryTreeProps) {
  return (
    <div className="space-y-1">
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground">No categories yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by adding your first product category.
          </p>
          <Button className="mt-4" onClick={() => onAdd()}>
            Add Category
          </Button>
        </div>
      ) : (
        categories.map((category) => (
          <CategoryNode
            key={category.id}
            category={category}
            depth={0}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}

interface CategoryNodeProps {
  category: Category;
  depth: number;
  onAdd: (parentId?: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategoryNode({ category, depth, onAdd, onEdit, onDelete }: CategoryNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group',
        )}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className={clsx(
            'flex h-5 w-5 items-center justify-center rounded transition-transform',
            !hasChildren && 'invisible',
          )}
        >
          <svg
            className={clsx('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-90')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {category.icon ? (
          <span className="text-lg">{category.icon}</span>
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
            <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
        )}

        <span className="flex-1 text-sm font-medium text-foreground">{category.name}</span>

        <Badge variant={category.isActive ? 'success' : 'muted'} className="mr-2">
          {category.isActive ? 'Active' : 'Inactive'}
        </Badge>

        <span className="text-xs text-muted-foreground mr-2">
          {category.productCount} products
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => onAdd(category.id)} className="h-7 w-7 p-0">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(category)} className="h-7 w-7 p-0">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category)}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              depth={depth + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
