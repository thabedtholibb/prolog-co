import { useState, Suspense } from 'react'
import VariantPicker from './VariantPicker.jsx'
import { LazyBookViewer } from './3d/lazy.js'
import Fallback2D from './3d/Fallback2D.jsx'
import Deferred3D from './3d/Deferred3D.jsx'
import { use3DReady } from './3d/use3DReady.js'
import { nextMonths } from '../lib/months.js'

const FACTS = ['Kertas matte', 'Tanpa langganan', '3 level kesulitan']

export default function FeaturedProduct({ product, variants, heading = true, anchor = false }) {
  const mode = use3DReady()
  const [activeVariant, setActiveVariant] = useState(null)
  const [preview, setPreview] = useState(null)
  const first =
    variants?.find((v) => v.content_axis === 'journaling' && v.edition_axis === 'monthly') ?? variants?.[0]
  const shown = activeVariant ?? first
  const level = preview?.level ?? 'medium'
  const month = preview?.month ?? nextMonths()[0]

  return (
    <article id={anchor ? 'katalog' : undefined} aria-labelledby={anchor ? 'katalog-judul' : undefined} className="scroll-mt-24">
      {heading && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">Koleksi utama</p>
            <h2
              id="katalog-judul"
              className="mt-2 max-w-[18ch] font-serif text-3xl font-bold leading-[1.03] tracking-[-0.02em] sm:text-4xl"
            >
              Buku Sudoku, dibuat untuk jeda.
            </h2>
          </div>
          <p className="max-w-[38ch] text-[15px] leading-[1.7] text-muted-foreground">
            Satu buku, satu level, satu bulan. Putar modelnya, ketuk kover untuk melihat isi, lalu susun versimu.
          </p>
        </div>
      )}

      <div className={`${heading ? 'mt-8' : ''} overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-2xl shadow-indigo-950/10 sm:p-6 lg:p-8`}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
          <div>
            <div className="relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(160deg,#F3F4F6_0%,#ffffff_55%,#E6E8ED_100%)] p-2 ring-1 ring-indigo-100">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/15 blur-3xl"
              />
              <div className="relative">
                {mode === '3d' && shown ? (
                  <Deferred3D fallback={<Fallback2D variant={shown} level={level} month={month} />}>
                    <Suspense fallback={<Fallback2D variant={shown} level={level} month={month} />}>
                      <LazyBookViewer variant={shown} level={level} month={month} />
                    </Suspense>
                  </Deferred3D>
                ) : (
                  <Fallback2D variant={shown} level={level} month={month} />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-primary">
                Prolog Sudoku
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Siap kirim
              </span>
            </div>
            <h3 className="mt-3 font-serif text-3xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-[2.1rem]">
              {product.name}
            </h3>
            <p className="mt-3 max-w-[44ch] text-[15px] leading-[1.7] text-muted-foreground">
              {product.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {FACTS.map((f) => (
                <span key={f} className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
                  {f}
                </span>
              ))}
            </div>
            <div className="mt-7">
              {variants?.length ? (
                <VariantPicker variants={variants} onSelected={setActiveVariant} onPreview={setPreview} />
              ) : (
                <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                  Varian untuk seri ini belum tersedia. Tambahkan varian dari panel admin agar bisa dibeli.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
