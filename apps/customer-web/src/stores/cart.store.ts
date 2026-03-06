import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  product_id: string;
  variant_id?: string;
  store_id: string;
  name: string;
  image_url: string;
  price: number;
  quantity: number;
  special_instructions?: string;
  dietary_tags?: string[];
  allergens?: string[];
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  addItemWithQuantity: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  clearStoreItems: (storeId: string) => void;
  getTotal: () => number;
  getItemCount: () => number;
  getItemsByStore: () => Record<string, CartItem[]>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.product_id === item.product_id && i.variant_id === item.variant_id,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product_id === item.product_id && i.variant_id === item.variant_id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      addItemWithQuantity: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.product_id === item.product_id && i.variant_id === item.variant_id,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product_id === item.product_id && i.variant_id === item.variant_id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product_id === productId && i.variant_id === variantId),
          ),
        })),
      updateQuantity: (productId, quantity, variantId) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => !(i.product_id === productId && i.variant_id === variantId))
            : state.items.map((i) =>
                i.product_id === productId && i.variant_id === variantId
                  ? { ...i, quantity }
                  : i,
              ),
        })),
      clearCart: () => set({ items: [] }),
      clearStoreItems: (storeId) =>
        set((state) => ({ items: state.items.filter((i) => i.store_id !== storeId) })),
      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getItemsByStore: () =>
        get().items.reduce<Record<string, CartItem[]>>((acc, item) => {
          if (!acc[item.store_id]) acc[item.store_id] = [];
          acc[item.store_id].push(item);
          return acc;
        }, {}),
    }),
    { name: 'daltaners-cart' },
  ),
);
