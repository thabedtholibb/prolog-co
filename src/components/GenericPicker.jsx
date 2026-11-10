import { useEffect, useState } from 'react'
import { useCartStore } from '../store/useCartStore.js'
import { rp } from '../lib/format.js'

/*
 * Picker generik untuk varian non-sudoku (booksleeve, keychain, kategori admin).
 * Opsi bebas (mis. charms) dikirim sebagai bagian identitas baris keranjang.
 */
export default function GenericPicker({ variants = [], options = {}, disabled = false, note = '' }) {
  const add = useCartStore((s) => s.add)
  const firstAvailable = variants.find((v) => Number(v.stock) > 0) ?? variants[0]
  const [selectedId, setSelectedId] = useState(firstAvailable?.id)
  const selected = variants.find((v) => v.id === selectedId) ?? firstAvailable

  useEffect(() => {
    if (!variants.some((v) => v.id === selectedId)) setSelectedId(firstAvailable?.id)
  }, [variants, selectedId, firstAvailable])

  if (!selected) return null
  const soldOut = Number(selected.stock) <= 0
  const blocked = soldOut || disabled

  return (
    <div className="mt-4 border-t border-border/80 pt-4">
      {variants.length > 1 && (
        <div role="group" aria-label="Pilih varian" className="flex flex-wrap gap-1.5">
          {variants.map((variant) => {
            const active = variant.id === selected.id
            const empty = Number(variant.stock) <= 0
            return (
              <button
                key={variant.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(variant.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 active:scale-[0.98] motion-reduce:transition-none ${
                  active
                    ? 'border-primary/30 bg-indigo-50 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-indigo-200 hover:text-foreground'
                } ${empty ? 'opacity-60' : ''}`}
              >
                {variant.name}
                {empty && <span className="text-[11px] uppercase tracking-[0.08em]">habis</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular font-serif text-xl font-bold leading-none">{rp(selected.price)}</p>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">{selected.name}</p>
        </div>
        <p className="shrink-0 text-[12px] text-muted-foreground">
          {soldOut ? 'Stok habis' : `Stok ${selected.stock}`}
        </p>
      </div>

      <button
        type="button"
        disabled={blocked}
        onClick={() => add({ ...selected, options })}
        className="mt-3 w-full cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent shadow-md shadow-indigo-950/10 transition-[background-color,transform] hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {soldOut ? 'Stok habis' : 'Tambah ke keranjang'}
      </button>
      {note && <p className="mt-2 text-[12px] text-muted-foreground">{note}</p>}
    </div>
  )
}
