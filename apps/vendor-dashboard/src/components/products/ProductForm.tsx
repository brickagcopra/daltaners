import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Product } from '@/hooks/useProducts';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
  compareAtPrice: z.coerce.number().optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  stock: z.coerce.number().min(0, 'Stock cannot be negative').int(),
  weight: z.coerce.number().optional(),
  weightUnit: z.string().optional(),
  tags: z.string().optional(),
  isActive: z.boolean(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1, 'Variant name is required'),
        sku: z.string().min(1, 'Variant SKU is required'),
        price: z.coerce.number().min(0.01),
        compareAtPrice: z.coerce.number().nullable().optional(),
        stock: z.coerce.number().min(0).int(),
        weight: z.coerce.number().nullable().optional(),
        weightUnit: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: FormData) => void;
  isSubmitting: boolean;
}

const categoryOptions = [
  { label: 'Groceries', value: 'groceries' },
  { label: 'Beverages', value: 'beverages' },
  { label: 'Snacks', value: 'snacks' },
  { label: 'Fresh Produce', value: 'fresh-produce' },
  { label: 'Meat & Seafood', value: 'meat-seafood' },
  { label: 'Dairy & Eggs', value: 'dairy-eggs' },
  { label: 'Bakery', value: 'bakery' },
  { label: 'Frozen', value: 'frozen' },
  { label: 'Household', value: 'household' },
  { label: 'Personal Care', value: 'personal-care' },
  { label: 'Baby & Kids', value: 'baby-kids' },
  { label: 'Pet Supplies', value: 'pet-supplies' },
  { label: 'Other', value: 'other' },
];

const weightUnitOptions = [
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Grams (g)', value: 'g' },
  { label: 'Pounds (lb)', value: 'lb' },
  { label: 'Ounces (oz)', value: 'oz' },
  { label: 'Liters (L)', value: 'L' },
  { label: 'Milliliters (mL)', value: 'mL' },
  { label: 'Pieces (pcs)', value: 'pcs' },
];

export function ProductForm({ product, onSubmit, isSubmitting }: ProductFormProps) {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(product?.images || []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      category: product?.category || '',
      subcategory: product?.subcategory || '',
      price: product?.price || 0,
      compareAtPrice: product?.compareAtPrice || undefined,
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      stock: product?.stock || 0,
      weight: product?.weight || undefined,
      weightUnit: product?.weightUnit || 'kg',
      tags: product?.tags?.join(', ') || '',
      isActive: product?.isActive ?? true,
      variants: product?.variants || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(
      (file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024,
    );

    setImageFiles((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (product && index < (product.images?.length || 0)) {
      // Removing an existing image - handled on the server
    } else {
      const newFileIndex = index - (product?.images?.length || 0);
      setImageFiles((prev) => prev.filter((_, i) => i !== newFileIndex));
    }
  };

  const onFormSubmit = (values: ProductFormValues) => {
    const formData = new FormData();

    formData.append('name', values.name);
    formData.append('description', values.description);
    formData.append('category', values.category);
    if (values.subcategory) formData.append('subcategory', values.subcategory);
    formData.append('price', String(values.price));
    if (values.compareAtPrice) formData.append('compareAtPrice', String(values.compareAtPrice));
    formData.append('sku', values.sku);
    if (values.barcode) formData.append('barcode', values.barcode);
    formData.append('stock', String(values.stock));
    if (values.weight) formData.append('weight', String(values.weight));
    if (values.weightUnit) formData.append('weightUnit', values.weightUnit);
    formData.append('isActive', String(values.isActive));

    if (values.tags) {
      const tagsArray = values.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      formData.append('tags', JSON.stringify(tagsArray));
    }

    if (values.variants && values.variants.length > 0) {
      formData.append('variants', JSON.stringify(values.variants));
    }

    imageFiles.forEach((file) => {
      formData.append('images', file);
    });

    if (product) {
      const existingImages = imagePreviews.filter(
        (p) => !p.startsWith('data:'),
      );
      formData.append('existingImages', JSON.stringify(existingImages));
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
        <div className="space-y-4">
          <Input
            label="Product Name"
            placeholder="Enter product name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Textarea
            label="Description"
            placeholder="Describe your product"
            rows={4}
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Category"
              options={categoryOptions}
              placeholder="Select category"
              error={errors.category?.message}
              {...register('category')}
            />
            <Input
              label="Subcategory"
              placeholder="Optional subcategory"
              error={errors.subcategory?.message}
              {...register('subcategory')}
            />
          </div>
          <Input
            label="Tags"
            placeholder="Enter tags separated by commas"
            hint="e.g., organic, local, fresh"
            {...register('tags')}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Pricing & Inventory</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Price (PHP)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.price?.message}
            {...register('price')}
          />
          <Input
            label="Compare at Price (PHP)"
            type="number"
            step="0.01"
            placeholder="Optional"
            {...register('compareAtPrice')}
          />
          <Input
            label="Stock Quantity"
            type="number"
            placeholder="0"
            error={errors.stock?.message}
            {...register('stock')}
          />
          <Input
            label="SKU"
            placeholder="Stock keeping unit"
            error={errors.sku?.message}
            {...register('sku')}
          />
          <Input
            label="Barcode"
            placeholder="Optional barcode"
            {...register('barcode')}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Weight"
              type="number"
              step="0.01"
              placeholder="0"
              {...register('weight')}
            />
            <Select
              label="Unit"
              options={weightUnitOptions}
              {...register('weightUnit')}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            {...register('isActive')}
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Product is active and visible to customers
          </label>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Product Images</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {imagePreviews.map((preview, index) => (
              <div
                key={index}
                className="group relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200"
              >
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-primary-400 hover:bg-primary-50">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Upload up to 8 images. Max 10MB each. Supported: JPG, PNG, WebP
          </p>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Variants</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                name: '',
                sku: '',
                price: 0,
                compareAtPrice: null,
                stock: 0,
                weight: null,
                weightUnit: null,
              })
            }
          >
            Add Variant
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500">No variants added. Add variants for different sizes, flavors, etc.</p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Variant {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input
                    label="Name"
                    placeholder="e.g., Large"
                    error={errors.variants?.[index]?.name?.message}
                    {...register(`variants.${index}.name`)}
                  />
                  <Input
                    label="SKU"
                    placeholder="Variant SKU"
                    error={errors.variants?.[index]?.sku?.message}
                    {...register(`variants.${index}.sku`)}
                  />
                  <Input
                    label="Price (PHP)"
                    type="number"
                    step="0.01"
                    error={errors.variants?.[index]?.price?.message}
                    {...register(`variants.${index}.price`)}
                  />
                  <Input
                    label="Stock"
                    type="number"
                    error={errors.variants?.[index]?.stock?.message}
                    {...register(`variants.${index}.stock`)}
                  />
                  <Input
                    label="Compare at Price"
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    {...register(`variants.${index}.compareAtPrice`)}
                  />
                  <Input
                    label="Weight"
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    {...register(`variants.${index}.weight`)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
