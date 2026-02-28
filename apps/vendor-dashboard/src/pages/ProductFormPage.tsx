import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useProduct, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/products/ProductForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId || '';

  const isEditMode = !!id;

  const { data: product, isLoading } = useProduct(id);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const handleSubmit = (formData: FormData) => {
    if (isEditMode && id) {
      updateMutation.mutate(
        { productId: id, formData },
        { onSuccess: () => navigate('/products') },
      );
    } else {
      createMutation.mutate(
        { storeId, formData },
        { onSuccess: () => navigate('/products') },
      );
    }
  };

  if (isEditMode && isLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Product' : 'New Product'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode
            ? 'Update your product details and inventory'
            : 'Add a new product to your store catalog'}
        </p>
      </div>

      <ProductForm
        product={isEditMode ? product : undefined}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
