import { useCartCount, useCartStore } from '../store/useCartStore.js'

export default function CartButton({ inline = false }) {
  const count = useCartCount()
  const openDrawer = useCartStore((s) => s.openDrawer)

  return (
    <button
      type="button"
      onClick={openDrawer}
      className={
        inline
          ? 'ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-2.5 py-2 text-[12px] font-semibold text-on-primary shadow-md shadow-indigo-600/20 transition-transform hover:-translate-y-0.5 active:scale-95 sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-[13px]'
          : 'fixed top-4 right-4 z-40 flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2.5 tabular text-[13px] font-semibold text-on-primary shadow-lg shadow-indigo-600/25 transition-transform active:scale-95'
      }
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 5h10l-1 9H4L3 5Z" />
        <path d="M6 5V4a2 2 0 0 1 4 0v1" />
      </svg>
      {inline ? (
        <>
          Keranjang
          <span aria-live="polite" className="rounded-md bg-white/20 px-1.5 py-0.5 tabular text-[11px]">{count}</span>
          <span className="sr-only">item, buka keranjang</span>
        </>
      ) : (
        <>
          <span className="sr-only">Keranjang </span>
          {count}
        </>
      )}
    </button>
  )
}
