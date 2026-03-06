import { create } from 'zustand';
import type { CartItem, CartTotals } from '@/types/pos';

const TAX_RATE = 0.12;

interface CartState {
  items: CartItem[];
  orderDiscount: number;
  holdOrders: Array<{ id: string; items: CartItem[]; timestamp: string }>;

  // Actions
  addItem: (item: Omit<CartItem, 'quantity' | 'discount_amount'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, discount: number) => void;
  setOrderDiscount: (discount: number) => void;
  clearCart: () => void;
  holdOrder: () => void;
  recallOrder: (holdId: string) => void;
  removeHoldOrder: (holdId: string) => void;

  // Computed
  getTotals: () => CartTotals;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderDiscount: 0,
  holdOrders: [],

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.product_id === item.product_id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return {
        items: [...state.items, { ...item, quantity: 1, discount_amount: 0 }],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product_id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId ? { ...i, quantity } : i,
      ),
    }));
  },

  setItemDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId ? { ...i, discount_amount: discount } : i,
      ),
    }));
  },

  setOrderDiscount: (discount) => set({ orderDiscount: discount }),

  clearCart: () => set({ items: [], orderDiscount: 0 }),

  holdOrder: () => {
    const { items } = get();
    if (items.length === 0) return;
    set((state) => ({
      holdOrders: [
        ...state.holdOrders,
        { id: `hold-${Date.now()}`, items: [...items], timestamp: new Date().toISOString() },
      ],
      items: [],
      orderDiscount: 0,
    }));
  },

  recallOrder: (holdId) => {
    const hold = get().holdOrders.find((h) => h.id === holdId);
    if (!hold) return;
    set((state) => ({
      items: hold.items,
      holdOrders: state.holdOrders.filter((h) => h.id !== holdId),
    }));
  },

  removeHoldOrder: (holdId) => {
    set((state) => ({
      holdOrders: state.holdOrders.filter((h) => h.id !== holdId),
    }));
  },

  getTotals: () => {
    const { items, orderDiscount } = get();
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity - i.discount_amount, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax - orderDiscount;
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round((orderDiscount + items.reduce((s, i) => s + i.discount_amount, 0)) * 100) / 100,
      total: Math.round(Math.max(0, total) * 100) / 100,
      itemCount,
    };
  },
}));
