import { create } from 'zustand';
import type { Product, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  discount: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1 }] };
    });
  },

  removeItem: (productId) => {
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    }));
  },

  setDiscount: (amount) => set({ discount: amount }),

  clearCart: () => set({ items: [], discount: 0 }),

  subtotal: () => {
    const { items } = get();
    return items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  },

  total: () => {
    const { discount } = get();
    return Math.max(0, get().subtotal() - discount);
  },
}));
