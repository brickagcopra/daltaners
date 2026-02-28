import { useState } from 'react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
} from '@/hooks/useCategories';
import { CategoryTree } from '@/components/categories/CategoryTree';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function CategoriesPage() {
  const { data, isLoading, isError } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('');
    setSortOrder('0');
    setParentId(null);
    setEditCategory(null);
  };

  const handleAddCategory = (parentCategoryId?: string) => {
    resetForm();
    setParentId(parentCategoryId || null);
    setFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setIcon(category.icon || '');
    setSortOrder(String(category.sortOrder));
    setParentId(category.parentId);
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      description,
      icon: icon || undefined,
      sortOrder: parseInt(sortOrder, 10) || 0,
      parentId,
      isActive: true,
    };

    if (editCategory) {
      updateMutation.mutate(
        { id: editCategory.id, data: payload },
        { onSuccess: () => { setFormOpen(false); resetForm(); } },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { setFormOpen(false); resetForm(); },
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteCategory) return;
    deleteMutation.mutate(deleteCategory.id, {
      onSuccess: () => setDeleteCategory(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Failed to load categories.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Manage product category hierarchy</p>
        </div>
        <Button onClick={() => handleAddCategory()}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </Button>
      </div>

      {/* Category Tree */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <CategoryTree
          categories={data?.data || []}
          onAdd={handleAddCategory}
          onEdit={handleEditCategory}
          onDelete={(category) => setDeleteCategory(category)}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); resetForm(); }}
        title={editCategory ? 'Edit Category' : 'Add Category'}
        description={parentId ? 'Creating a subcategory' : 'Creating a top-level category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Fresh Produce"
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Icon (emoji)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g., 🥬"
            />
            <Input
              label="Sort Order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        title="Delete Category"
        description={`Delete "${deleteCategory?.name}"?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This action cannot be undone. Any child categories and product associations will also be removed.
          </p>
          {(deleteCategory?.productCount ?? 0) > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              This category has {deleteCategory?.productCount} products associated with it.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setDeleteCategory(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={deleteMutation.isPending}
            >
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
