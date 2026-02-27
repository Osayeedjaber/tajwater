import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, subscribeFrequency?: CartItem['subscribeFrequency']) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateSubscribeFrequency: (productId: string, freq: CartItem['subscribeFrequency']) => void
  clearCart: () => void
  total: () => number
  count: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, subscribeFrequency?) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + 1, subscribeFrequency: subscribeFrequency ?? i.subscribeFrequency }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: 1, subscribeFrequency }] }
        })
      },

      updateSubscribeFrequency: (productId, freq) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, subscribeFrequency: freq } : i
          ),
        })),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => i.product.id !== productId)
            : state.items.map((i) => i.product.id === productId ? { ...i, quantity } : i),
        })),

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'tajwater-cart' }
  )
)
