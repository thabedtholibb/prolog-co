import { useEffect, useRef } from 'react'

/*
 * Reveal: panduan perhatian satu arah, 1x per elemen (disconnect setelah
 * muncul). Tujuan animasi ditulis eksplisit (R-19).
 */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          io.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  )
}

const BEATS = [
  {
    kicker: 'Bab Pertama',
    title: 'Sore yang lupa habisnya',
    body: 'Kita semua tahu rasanya: layar menyala lebih lama dari yang kita inginkan. Scroll terasa seperti napas, tetapi tidak pernah tenang. Penat itu halus, dan hampir tidak terasa datang.',
  },
  {
    kicker: 'Bab Kedua',
    title: 'Satu pertanyaan sederhana',
    body: 'Prolog.co bermula saat kami bertanya: kalau layar tidak pernah memelihara jeda, mungkin benda nyata bisa memeliharanya. Benda nyata meminta sedikit saja. Ia dibuka, dipegang, dikerjakan pelan-pelan, lalu menuntun kita pulang ke diri sendiri.',
  },
  {
    kicker: 'Bab Ketiga',
    title: 'Prolog, teman awal cerita',
    body: 'Prolog berarti satu hal: semua cerita butuh awal yang jujur. Prolog.co hadir sebagai teman awal cerita. Sebelum halaman pertama dibuka, sebelum bab demi bab bergulir. Versinya bisa disesuaikan dengan ritmemu, pengingat sederhana bahwa ceritamu selalu bisa dimulai lagi.',
  },
]

export default function Story() {
  return (
    <section id="kisah" aria-label="Kisah terbentuknya Prolog.co" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-10 pb-20 sm:px-6 sm:pt-14 sm:pb-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#F3F4F6_0%,#ffffff_52%,#E6E8ED_100%)] px-5 py-12 ring-1 ring-indigo-100/80 sm:px-8 sm:py-16 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-300/25 blur-3xl"
        />
        <div className="relative grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
          <Reveal as="div" className="self-start lg:sticky lg:top-24">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">Kisah Prolog</p>
            <h2 className="mt-3 font-serif text-3xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-4xl">
              Semua cerita butuh awal yang jujur.
            </h2>
            <p className="mt-4 max-w-[34ch] text-[15px] leading-[1.7] text-muted-foreground">
              Tiga bab kecil tentang layar, jeda, dan kebiasaan pulang. Bukan manifesto, hanya alasan kami
              membuat benda-benda ini.
            </p>
            <a
              href="#katalog"
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[14px] font-semibold text-on-primary shadow-lg shadow-indigo-600/20 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Temui teman perjalananmu
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </a>
          </Reveal>

          <div className="space-y-4">
            {BEATS.map((b, i) => (
              <Reveal key={b.kicker} as="div" delay={i * 90}>
                <article className="group rounded-2xl border border-white bg-card p-6 shadow-lg shadow-indigo-950/5 transition-transform duration-300 hover:-translate-y-0.5 sm:p-7">
                  <div className="flex items-start gap-4 sm:gap-5">
                      <span className="font-serif text-4xl font-bold leading-none text-muted-foreground transition-colors group-hover:text-primary">
                      0{i + 1}
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{b.kicker}</p>
                      <h3 className="mt-2 font-serif text-xl font-semibold leading-tight tracking-[-0.01em]">
                        {b.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">{b.body}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
