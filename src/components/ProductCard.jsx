import { Suspense, useState } from 'react'
import { LazyComingSoonViewer } from './3d/lazy.js'
import Deferred3D from './3d/Deferred3D.jsx'
import { use3DReady } from './3d/use3DReady.js'
import { safeBlurb, stageKey, categoryLabel } from '../lib/catalog.js'
import { DEFAULT_CHARMS, charmLabels, hasCharm } from '../lib/keychain.js'
import GenericPicker from './GenericPicker.jsx'

const STAGE = {
  keychain: {
    label: 'Keychain',
    chip: 'Modular',
    bg: 'bg-[linear-gradient(145deg,#F3F4F6_0%,#ffffff_55%,#E6E8ED_100%)]',
    glow: 'bg-indigo-400/15',
    accent: 'text-primary',
    chipClass: 'bg-indigo-50 text-primary',
  },
  booksleeve: {
    label: 'Booksleeve',
    chip: 'Linen',
    bg: 'bg-[linear-gradient(145deg,#F3F4F6_0%,#E6E8ED_55%,#ffffff_100%)]',
    glow: 'bg-indigo-400/15',
    accent: 'text-primary',
    chipClass: 'bg-secondary text-primary',
  },
  /* Kategori di luar model yang kita punya: jangan pura-pura jadi booksleeve. */
  unknown: {
    label: 'Produk baru',
    chip: 'Baru',
    bg: 'bg-[linear-gradient(145deg,#F3F4F6_0%,#E6E8ED_55%,#ffffff_100%)]',
    glow: 'bg-indigo-300/20',
    accent: 'text-primary',
    chipClass: 'bg-indigo-50 text-primary',
  },
}

/*
 * Kartu produk non-sudoku. Tanpa varian aktif ia jadi teaser 3D tanpa harga.
 * Begitu admin menambahkan varian, kartu yang sama menampilkan picker + CTA
 * tanpa perlu komponen baru. Keychain tetap punya konfigurator ornamen.
 */
export default function ProductCard({ product, variants = [] }) {
  const mode = use3DReady()
  const stage = stageKey(product.category)
  const meta = STAGE[stage]
  const modelled = stage !== 'unknown'
  const label = modelled ? meta.label : categoryLabel(product.category)
  const blurb = safeBlurb(product.description)
  const buyable = variants.length > 0
  const inStock = variants.some((v) => Number(v.stock) > 0)
  const [charms, setCharms] = useState(DEFAULT_CHARMS)

  const options =
    product.category === 'keychain' && hasCharm(charms) ? { charms: charmLabels(charms) } : {}
  const optionsMissing = product.category === 'keychain' && !hasCharm(charms)

  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-xl shadow-indigo-950/5 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-950/10">
      <div className={`relative overflow-hidden p-2 ${meta.bg}`}>
        <div aria-hidden="true" className={`pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${meta.glow}`} />
        <div className="relative">
          {modelled && mode === '3d' ? (
            <Suspense fallback={<div className="aspect-[4/3] w-full" aria-hidden="true" />}>
              <Deferred3D fallback={<div className="aspect-[4/3] w-full" aria-hidden="true" />}>
                <LazyComingSoonViewer
                  category={product.category}
                  label={meta.label}
                  charms={charms}
                  onToggleCharm={(key) => setCharms((current) => ({ ...current, [key]: !current[key] }))}
                />
              </Deferred3D>
            </Suspense>
          ) : modelled ? (
            <div
              className="flex aspect-[4/3] w-full items-center justify-center"
              aria-label={`${product.name} ${buyable ? 'siap dibeli' : 'sedang disiapkan'}`}
            >
              <span className="rounded-full border border-border bg-card px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {buyable ? (inStock ? 'Siap dibeli' : 'Stok habis') : 'Segera'}
              </span>
            </div>
          ) : buyable ? (
            <ReadyStage name={product.name} label={label} available={inStock} />
          ) : (
            <ComingSoonClock name={product.name} />
          )}
        </div>
        <span
          className={`pointer-events-none absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm ${
            !buyable
              ? 'bg-card/90 text-muted-foreground'
              : inStock
                ? 'bg-emerald-50/95 text-emerald-700'
                : 'bg-rose-50/95 text-rose-700'
          }`}
        >
          {buyable ? (inStock ? 'Siap kirim' : 'Stok habis') : 'Segera'}
        </span>
        <span className={`pointer-events-none absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold ${meta.chipClass}`}>
          {meta.chip}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-6 pt-5">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${meta.accent}`}>{label}</p>
        <h3 className="font-serif text-2xl font-semibold leading-[1.1] tracking-[-0.01em]">{product.name}</h3>
        {blurb && <p className="text-[14.5px] leading-[1.65] text-muted-foreground">{blurb}</p>}
        {buyable && (
          <GenericPicker
            variants={variants}
            options={options}
            disabled={optionsMissing}
            note={optionsMissing ? 'Pilih minimal satu ornamen untuk membeli.' : ''}
          />
        )}
      </div>
    </article>
  )
}

/* Kategori tanpa model 3D tetapi sudah punya varian: panggung netral, bukan jam "segera". */
function ReadyStage({ name, label, available }) {
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 px-6 text-center" aria-label={`${name} ${available ? 'siap dibeli' : 'stok habis'}`}>
      <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <p className="max-w-[20ch] font-serif text-2xl font-semibold leading-[1.1]">{name}</p>
      {!available && <p className="text-[12px] font-medium text-rose-700">Stok habis</p>}
    </div>
  )
}

/* Panggung kosong untuk kategori tanpa model 3D: jam berputar ala coming soon. */
function ComingSoonClock({ name }) {
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4" aria-label={`${name} sedang disiapkan`}>
      <div
        aria-hidden="true"
        className="relative h-24 w-24 rounded-full border border-indigo-200/90 bg-white/70 shadow-[inset_0_2px_12px_rgba(29,40,70,0.12)]"
      >
        <span className="absolute left-1/2 top-2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-300" />
        <span className="absolute right-2 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-indigo-300" />
        <span className="absolute bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-300" />
        <span className="absolute left-2 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-indigo-300" />
        {/* Jarum jam: pembungkus yang berputar, jarumnya diam di dalam. */}
        <span className="absolute inset-0 animate-[spin_72s_linear_infinite] motion-reduce:animate-none">
          <span className="absolute bottom-1/2 left-1/2 h-[22%] w-[2.5px] -translate-x-1/2 rounded-full bg-primary/60" />
        </span>
        <span className="absolute inset-0 animate-[spin_6s_linear_infinite] motion-reduce:animate-none">
          <span className="absolute bottom-1/2 left-1/2 h-[32%] w-[2px] -translate-x-1/2 rounded-full bg-primary" />
        </span>
        <span className="absolute inset-0 animate-[spin_2.4s_linear_infinite] motion-reduce:animate-none">
          <span className="absolute bottom-1/2 left-1/2 h-[36%] w-px -translate-x-1/2 rounded-full bg-emerald-500/80" />
        </span>
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Segera hadir</p>
    </div>
  )
}
