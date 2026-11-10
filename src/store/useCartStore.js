import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { addItem, setQty as setQtyLogic, computeSubtotal, syncItems } from './cartLogic.js'

export const useCartStore = create()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      add: (variant, qty = 1) =>
        set((s) => ({ items: addItem(s.items, variant, qty), drawerOpen: true })),
      setQty: (id, qty) => set((s) => ({ items: setQtyLogic(s.items, id, qty) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      sync: (variants) => set((s) => ({ items: syncItems(s.items, variants) })),
      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: 'prolog-cart',
      version: 1, // v1: item punya variantId + month/difficulty/options
      migrate: () => ({ items: [] }), // keranjang pra-v1 dibuang, formatnya beda
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        items: s.items,
      }),
    },
  ),
)

export function useCartCount() {
  return useCartStore((s) => s.items.reduce((sum, item) => sum + item.qty, 0))
}

export function useCartSubtotal() {
  return useCartStore((s) => computeSubtotal(s.items))
}
