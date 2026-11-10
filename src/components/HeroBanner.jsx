import { Reveal } from './Story.jsx'
import HeroFlow from './HeroFlow.jsx'

/*
 * Chip melayang: keunggulan lintas produk (bukan cuma sudoku).
 * Tiga produk = tiga manfaat: jeda, menjaga, mendampingi.
 */
const CHIPS = [
  {
    className: '-left-2 top-6 -rotate-2 sm:-left-8',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M3 8h10M8 3v10" />
      </svg>
    ),
    title: 'Jeda dari doom-scrolling',
    note: 'Buku puzzle & refleksi',
  },
  {
    className: '-right-2 top-[38%] rotate-2 sm:-right-8',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M8 2.5 14 4.5v6L8 12.5 2 10.5v-6L8 2.5Z" />
        <path d="M8 2.5v10" />
      </svg>
    ),
    title: 'Menjaga bukumu',
    note: 'Sarung linen',
  },
  {
    className: 'bottom-6 -left-3 -rotate-1 sm:bottom-8 sm:-left-8',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M6 2.5h6a1 1 0 0 1 1 1v10l-4-2.2L5 13.5v-10a1 1 0 0 1 1-1Z" />
      </svg>
    ),
    title: 'Mendampingi membacamu',
    note: 'Kit & pembatas buku',
  },
]

/*
 * Hero: dua kolom ala Think Decision. Kiri cerita + ajakan membaca kisah;
 * kanan panggung dengan buku generik (bukan sudoku) dan chip manfaat.
 * Tidak ada harga atau tombol beli di layar pertama.
 */
export default function HeroBanner() {
  return (
    <Reveal as="header" className="relative overflow-hidden">
      <HeroFlow />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 lg:pb-28 lg:pt-14">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-card px-3 py-1.5 text-[12px] font-medium text-primary shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Teman cerita dan perjalananmu
          </p>
          <h1 className="mt-6 font-serif text-[2.7rem] font-bold leading-[0.98] tracking-[-0.035em] text-foreground sm:text-[3.7rem] lg:text-[4.3rem]">
            <span className="text-primary underline decoration-primary decoration-[0.09em] underline-offset-[0.14em]">
              Jeda
            </span>{' '}
            untuk diri sendiri, sebelum scroll memakan waktumu.
          </h1>
          <p className="mt-6 max-w-lg text-[16px] leading-[1.7] text-muted-foreground sm:text-[17px]">
            Kami membuat benda untuk menemani jedamu dari layar. Buku untuk jeda, sarung untuk menjaga bukumu,
            gantungan untuk mendampingi. Satu jeda kecil yang nyata.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#kisah"
              className="group inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[15px] font-semibold text-on-primary shadow-lg shadow-indigo-600/25 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Baca kisah kami
              <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </a>
            <a
              href="#katalog"
              className="inline-flex cursor-pointer items-center rounded-xl border border-border bg-card px-6 py-3.5 text-[15px] font-semibold text-foreground shadow-sm transition-colors hover:border-indigo-200 hover:text-primary"
            >
              Lihat produk
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div
            aria-hidden="true"
            className="absolute inset-x-4 top-6 bottom-2 rounded-[2.5rem] bg-[radial-gradient(closest-side,rgba(29,40,70,0.24),rgba(148,148,146,0.12),transparent)] blur-2xl"
          />
          <div className="relative overflow-hidden rounded-[2rem] border border-indigo-100/80 bg-[linear-gradient(150deg,#F3F4F6_0%,#ffffff_55%,#E6E8ED_100%)] p-7 pt-10 shadow-2xl shadow-indigo-950/10 sm:p-9 sm:pt-12">
            <div className="relative mx-auto w-[74%] [perspective:1500px]">
              <div className="anim-float">
                <div className="relative aspect-[1/1.414] overflow-hidden rounded-l-md rounded-r-2xl bg-[linear-gradient(160deg,#1D2846_0%,#2C395B_58%,#495571_100%)] shadow-[28px_36px_60px_-28px_rgba(29,40,70,0.48)] [transform:rotateY(-17deg)_rotateX(5deg)_rotateZ(-1.5deg)]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-6 rounded-l-md bg-[linear-gradient(90deg,rgba(7,13,28,0.4),rgba(7,13,28,0.06),transparent)]"
                  />
                  <div aria-hidden="true" className="absolute inset-y-0 left-6 w-px bg-white/20" />
                  <div aria-hidden="true" className="absolute inset-3 rounded-md border border-white/10" />
                  {/* mark pembatas buku sebagai ikon utama */}
                  <div className="absolute left-1/2 top-[22%] -translate-x-1/2 text-white/95">
                    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M7 3h10a1 1 0 0 1 1 1v16l-6-3.5L6 20V4a1 1 0 0 1 1-1Z" />
                    </svg>
                  </div>
                  <div className="absolute inset-x-5 bottom-[14%] text-center">
                    <span className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-white">Prolog.co</span>
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                      Teman ceritamu
                    </p>
                  </div>
                  {/* pita penanda */}
                  <div aria-hidden="true" className="absolute -top-1 right-5 h-12 w-4 rounded-b-md bg-primary shadow-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Chip manfaat: menonjol keluar dari kartu, sedikit miring, angkat saat disentuh */}
          {CHIPS.map((c) => (
            <div
              key={c.title}
              className={`absolute z-10 ${c.className} rounded-2xl border border-white/70 bg-card/95 px-3.5 py-2.5 text-left shadow-[0_18px_38px_-16px_rgba(30,27,75,0.5)] ring-1 ring-slate-900/5 backdrop-blur-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:rotate-0 hover:scale-[1.03] hover:shadow-[0_26px_50px_-18px_rgba(30,27,75,0.55)] active:scale-95`}
            >
              <div className="flex items-center gap-1.5 text-primary">
                {c.icon}
                <span className="text-[12px] font-semibold text-foreground">{c.title}</span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-tight text-muted-foreground">{c.note}</p>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  )
}
