import { useEffect, useRef, useState } from 'react'
import { useCartStore } from '../store/useCartStore.js'
import { supabase } from '../lib/supabase.js'
import { rp } from '../lib/format.js'
import { nextMonths } from '../lib/months.js'

const CONTENT_LABELS = {
  journaling: 'Dengan Journaling',
  pure: 'Murni Puzzle',
}
const EDITION_LABELS = {
  monthly: { name: 'Monthly', note: 'porsi 1 bulan' },
  regular: { name: 'Reguler', note: 'buku tebal, sekali beli' },
}
const LEVELS = ['easy', 'medium', 'hard']
const LEVEL_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const SIZES = ['50', '75', '100']

/**
 * Toggle sumbu: Edisi x Konten (peta ke SKU) + Ukuran (reguler: 50/75/100),
 * Level, dan Bulan tersimpan di options order.
 */
export default function VariantPicker({ variants, onSelected, onPreview }) {
  const add = useCartStore((s) => s.add)
  const first = variants?.find((v) => v.content_axis === 'journaling' && v.edition_axis === 'monthly') ?? variants?.[0]
  const [selectedId, setSelectedId] = useState(first?.id)
  const [month, setMonth] = useState(() => nextMonths()[0])
  const [difficulty, setDifficulty] = useState('medium')
  const [size, setSize] = useState(SIZES[0])
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef(null)

  useEffect(() => {
    if (!variants?.some((v) => v.id === selectedId)) setSelectedId(first?.id)
  }, [variants, selectedId, first])

  const selected = variants?.find((v) => v.id === selectedId) ?? first ?? null
  const isMonthly = selected?.edition_axis === 'monthly'
  const isRegular = selected?.edition_axis === 'regular'
  const MONTHS = nextMonths()

  // viewer 3D ikut berubah instan saat toggle varian (kontrak Sprint 6)
  useEffect(() => {
    if (selected && onSelected) onSelected(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  // pratinjau 3D ikut level & bulan, bukan hanya SKU
  useEffect(() => {
    if (selected && onPreview) onPreview({ variant: selected, level: difficulty, month })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, difficulty, month])

  // tutup popover info saat Escape atau klik di luar
  useEffect(() => {
    if (!infoOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setInfoOpen(false)
    }
    const onClick = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) setInfoOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [infoOpen])

  if (!variants?.length || !selected) return null

  return (
    <section>
      <fieldset className="mt-1">
        <legend className="sr-only">Edisi</legend>
        <div ref={infoRef} className="relative flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Edisi</span>
          <button
            type="button"
            aria-label="Penjelasan edisi"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
            className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-indigo-200 hover:text-primary"
          >
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7.5v3.5" />
              <circle cx="8" cy="5.3" r="0.6" fill="currentColor" stroke="none" />
            </svg>
          </button>
          {infoOpen && (
            <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-xl shadow-indigo-950/10">
              <p className="text-[12px] leading-relaxed text-foreground">
                Semua edisi Sudoku terdapat 4×4 dan 9×9. Jika ingin lebih seru, tambahkan dengan journaling.
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-foreground">
                <span className="font-semibold">Monthly:</span> 31 sudoku
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-foreground">
                <span className="font-semibold">Reguler:</span> pilih 50, 75, atau 100 sudoku
              </p>
            </div>
          )}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {variants
            .filter((v, i, arr) => arr.findIndex((x) => x.edition_axis === v.edition_axis) === i)
            .map((v) => (
              <button
                key={v.edition_axis}
                type="button"
                aria-pressed={selected.edition_axis === v.edition_axis}
                onClick={() =>
                  setSelectedId(
                    variants.find((x) => x.edition_axis === v.edition_axis && x.content_axis === selected.content_axis)?.id ??
                      variants.find((x) => x.edition_axis === v.edition_axis)?.id,
                  )
                }
                className={`cursor-pointer rounded-xl border-2 px-4 py-2.5 text-left text-[13.5px] transition-[border-color,background-color,transform] active:scale-[0.98] ${
                  selected.edition_axis === v.edition_axis
                    ? 'border-primary bg-indigo-50'
                    : 'border-border bg-card hover:border-indigo-200'
                }`}
              >
                <span className={`block font-semibold ${selected.edition_axis === v.edition_axis ? 'text-primary' : 'text-foreground'}`}>
                  {EDITION_LABELS[v.edition_axis].name}
                </span>
                <span className="block text-[12px] text-muted-foreground">{EDITION_LABELS[v.edition_axis].note}</span>
              </button>
            ))}
        </div>
      </fieldset>

      {isRegular && (
        <fieldset className="mt-4">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Jumlah sudoku</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
                className={`cursor-pointer rounded-xl border-2 px-3 py-2.5 text-center text-[13.5px] font-medium transition-[border-color,background-color,transform] active:scale-[0.98] ${
                  size === s
                    ? 'border-primary bg-indigo-50 text-primary'
                    : 'border-border bg-card text-foreground hover:border-indigo-200'
                }`}
              >
                {s} sudoku
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="mt-4">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Konten</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {variants
            .filter((v, i, arr) => arr.findIndex((x) => x.content_axis === v.content_axis) === i)
            .map((v) => (
              <button
                key={v.content_axis}
                type="button"
                aria-pressed={selected.content_axis === v.content_axis}
                onClick={() =>
                  setSelectedId(
                    variants.find((x) => x.content_axis === v.content_axis && x.edition_axis === selected.edition_axis)?.id ??
                      variants.find((x) => x.content_axis === v.content_axis)?.id,
                  )
                }
                className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-left text-[13.5px] font-medium transition-[border-color,background-color,transform] active:scale-[0.98] ${
                  selected.content_axis === v.content_axis
                    ? 'border-primary bg-indigo-50 text-primary'
                    : 'border-border bg-card text-foreground hover:border-indigo-200'
                }`}
              >
                {CONTENT_LABELS[v.content_axis]}
              </button>
            ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Level</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              aria-pressed={difficulty === lv}
              onClick={() => setDifficulty(lv)}
              className={`cursor-pointer rounded-xl border-2 px-3 py-2.5 text-center text-[13.5px] font-medium transition-[border-color,background-color,transform] active:scale-[0.98] ${
                difficulty === lv
                  ? 'border-primary bg-indigo-50 text-primary'
                  : 'border-border bg-card text-foreground hover:border-indigo-200'
              }`}
            >
              {LEVEL_LABELS[lv]}
            </button>
          ))}
        </div>
      </fieldset>

      {isMonthly && (
        <fieldset className="mt-4">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Bulan yang dibeli
          </legend>
          <label className="mt-2 flex flex-col gap-1">
            <span className="sr-only">Bulan edisi monthly</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full cursor-pointer rounded-xl border-2 border-border bg-card px-3.5 py-3 text-[14px] font-medium outline-none transition-colors focus:border-primary"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-[12px] leading-relaxed text-muted-foreground">
              Buku puzzle untuk bulan itu. Beli sekali per bulan, tanpa langganan.
            </span>
          </label>
        </fieldset>
      )}

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="font-serif text-[1.9rem] font-bold leading-none tabular tracking-[-0.02em]" aria-live="polite">
            {rp(selected.price)}
          </p>
        </div>
        <p className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
          Stok {selected.stock > 0 ? `${selected.stock} unit` : 'habis'}
        </p>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        Atur versimu di atas. Sekali beli, tanpa langganan.
      </p>
      <button
        type="button"
        disabled={selected.stock <= 0}
        onClick={() => add({ ...selected, month: isMonthly ? month : undefined, difficulty, size: isRegular ? size : undefined })}
        className="mt-4 w-full cursor-pointer rounded-xl bg-accent px-6 py-3.5 text-[14px] font-semibold text-on-accent shadow-lg shadow-indigo-950/10 transition-[background-color,transform] hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {selected.stock <= 0 ? 'Stok habis' : 'Tambah ke keranjang'}
      </button>
    </section>
  )
}
