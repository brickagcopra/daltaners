import { create } from 'zustand';
import type { Product, ProductVariant, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  storeId: string | null;
  storeName: string | null;

  // Computed
  itemCount: () => number;
  subtotal: () => number;

  // Actions
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  setSpecialInstructions: (productId: string, instructions: string, variantId?: string) => void;
  setSubstitution: (productId: string, preference: CartItem['substitution_preference'], variantId?: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  storeId: null,
  storeName: null,

  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  subtotal: () =>
    get().items.reduce((sum, item) => {
      const basePrice = item.product.sale_price ?? item.product.base_price;
      const variantAdj = item.variant?.price_adjustment ?? 0;
      return sum + (basePrice + variantAdj) * item.quantity;
    }, 0),

  addItem: (product, quantity = 1, variant) => {
    const state = get();

    // If adding from a different store, clear cart first
    if (state.storeId && state.storeId !== product.store_id) {
      set({ items: [], storeId: null, storeName: null });
    }

    const existingIndex = state.items.findIndex(
      (item) => item.product.id === product.id && item.variant?.id === variant?.id,
    );

    if (existingIndex >= 0) {
      const updatedItems = [...state.items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + quantity,
      };
      set({ items: updatedItems });
    } else {
      set({
        items: [...state.items, { product, variant, quantity }],
        storeId: product.store_id,
        storeName: product.store?.name ?? null,
      });
    }
  },

  removeItem: (productId, variantId) => {
    const updated = get().items.filter(
      (item) => !(item.product.id === productId && item.variant?.id === variantId),
    );
    set({
      items: updated,
      storeId: updated.length > 0 ? get().storeId : null,
      storeName: updated.length > 0 ? get().storeName : null,
    });
  },

  updateQuantity: (productId, quantity, variantId) => {
    if (quantity <= 0) {
      get().removeItem(productId, variantId);
      return;
    }
    set({
      items: get().items.map((item) =>
        item.product.id === productId && item.variant?.id === variantId
          ? { ...item, quantity }
          : item,
      ),
    });
  },

  setSpecialInstructions: (productId, instructions, variantId) => {
    set({
      items: get().items.map((item) =>
        item.product.id === productId && item.variant?.id === variantId
          ? { ...item, special_instructions: instructions }
          : item,
      ),
    });
  },

  setSubstitution: (productId, preference, variantId) => {
    set({
      items: get().items.map((item) =>
        item.product.id === productId && item.variant?.id === variantId
          ? { ...item, substitution_preference: preference }
          : item,
      ),
    });
  },

  clearCart: () => set({ items: [], storeId: null, storeName: null }),
}));
