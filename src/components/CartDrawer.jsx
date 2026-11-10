import { useEffect, useRef } from 'react'
import { useCartStore, useCartSubtotal } from '../store/useCartStore.js'
import { describeItem } from '../store/cartLogic.js'
import { rp } from '../lib/format.js'

/*
 * Drawer keranjang (frekuensi occasional, tier standar):
 * Tujuan animasi: consistensi spasial (masuk/keluar lewat sisi kanan yang sama),
 * mencegah perubahan konten yang langsung terlihat. Kurva --ease-drawer iOS-like.
 */
export default function CartDrawer() {
  const items = useCartStore((s) => s.items)
  const drawerOpen = useCartStore((s) => s.drawerOpen)
  const closeDrawer = useCartStore((s) => s.closeDrawer)
  const setQty = useCartStore((s) => s.setQty)
  const remove = useCartStore((s) => s.remove)
  const subtotal = useCartSubtotal()
  const panelRef = useRef(null)
  const blocked = items.some((item) => Number.isFinite(item.stock) && item.stock <= 0)

  useEffect(() => {
    if (!drawerOpen) return
    // Fokus masuk ke panel; saat drawer ditutup, kembalikan fokus ke elemen
    // pembuka agar tidak tersangkut di subtree aria-hidden (warning Chrome).
    const opener = document.activeElement ?? null
    panelRef.current?.querySelector('button')?.focus()
    return () => opener?.focus?.()
  }, [drawerOpen])

  // Escape menutup drawer; Tab dikurung di dalam panel (focus trap, R-32).
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeDrawer()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, closeDrawer])

  // Drawer selalu di-DOM; buka/tutup lewat class supaya transition masuk & keluar sama.

  return (
    <div
      className={`fixed inset-0 z-50 ${drawerOpen ? 'drawer-open' : ''}`}
      role="dialog"
      aria-modal={drawerOpen ? true : undefined}
      aria-hidden={!drawerOpen || undefined}
      aria-label="Keranjang belanja"
      inert={!drawerOpen || undefined}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Tutup keranjang"
        onClick={closeDrawer}
        className="absolute inset-0 h-full w-full cursor-pointer bg-indigo-950/30 opacity-0 transition-opacity duration-300"
      />
      <div
        ref={panelRef}
        className="drawer-panel absolute top-0 right-0 flex h-full w-full flex-col bg-card shadow-2xl shadow-slate-950/20 sm:max-w-sm sm:rounded-l-3xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-serif text-xl font-bold tracking-[-0.01em]">Keranjang</h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Tutup keranjang"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M5 8h14l-1.5 12h-11L5 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            </span>
            <p className="font-serif text-xl font-semibold">Keranjangmu masih kosong</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pilih varian produk di katalog, lalu tekan Tambah ke keranjang.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    {describeItem(item) && (
                      <p className="tabular text-[13px] text-muted-foreground">{describeItem(item)}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Kurangi ${item.name}`}
                        onClick={() => setQty(item.id, item.qty - 1)}
                        className="h-7 w-7 cursor-pointer rounded-lg border border-border tabular text-sm transition-colors hover:bg-muted active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-6 text-center tabular text-sm">{item.qty}</span>
                      <button
                        type="button"
                        aria-label={`Tambah ${item.name}`}
                        disabled={Number.isFinite(item.stock) && item.qty >= item.stock}
                        onClick={() => setQty(item.id, item.qty + 1)}
                        className="h-7 w-7 cursor-pointer rounded-lg border border-border tabular text-sm transition-colors hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-medium">{rp(item.price * item.qty)}</p>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="mt-1 cursor-pointer text-[13px] text-destructive underline underline-offset-2 transition-transform active:scale-95"
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="tabular font-serif text-xl font-bold">{rp(subtotal)}</span>
              </div>
              <button
                type="button"
                disabled={blocked}
                onClick={() => {
                  closeDrawer()
                  window.location.assign('/checkout')
                }}
                className="mt-3 w-full cursor-pointer rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent shadow-lg shadow-indigo-950/10 transition-colors hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Lanjut ke pembayaran
              </button>
              <p className="mt-2 text-center text-[12px] text-muted-foreground">
                {blocked ? 'Ada item yang stoknya habis. Hapus dulu untuk melanjutkan.' : 'Kamu akan menyelesaikan pesanan di halaman checkout.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
