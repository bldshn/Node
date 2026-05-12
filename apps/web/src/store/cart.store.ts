import { create } from 'zustand';

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item: CartItem) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.productId === item.productId);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (productId: string) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),

  updateQuantity: (productId: string, quantity: number) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(0, quantity) } : i
      ),
    })),

  clearCart: () => set({ items: [] }),

  getTotalPrice: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
}));
