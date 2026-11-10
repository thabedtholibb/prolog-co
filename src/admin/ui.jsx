/*
 * Potongan UI admin: ukuran kontrol, panel, dan ikon garis.
 * Semua panel memakai border + tone step, tanpa shadow saat diam.
 */

export const inputCls =
  'h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 motion-reduce:transition-none'

export const btnPrimary =
  'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-[13px] font-semibold text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none'

export const btnGhost =
  'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-[13px] font-medium text-foreground transition-colors duration-150 hover:border-slate-300 hover:bg-muted active:scale-[0.97] motion-reduce:transition-none'

export const btnQuiet =
  'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97] motion-reduce:transition-none'

export function Panel({ title, aside, children, className = '', bodyClass = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card ${className}`}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          {aside && <span className="text-[12px] text-muted-foreground">{aside}</span>}
        </header>
      )}
      <div className={bodyClass || 'p-4'}>{children}</div>
    </section>
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center gap-1 py-7 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      {hint && <p className="max-w-[42ch] text-[12px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* Ikon garis 16px; diwarisi warna teks induk. */
export function AdminIcon({ name, className = 'h-4 w-4' }) {
  const common = {
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  }
  switch (name) {
    case 'chart':
      return (
        <svg {...common}>
          <path d="M2.5 13.5h11" />
          <path d="M4 11V9M6.5 11V6M9 11V4.5M11.5 11V7.5" />
        </svg>
      )
    case 'orders':
      return (
        <svg {...common}>
          <path d="M2.5 5.5 8 3l5.5 2.5v6L8 14l-5.5-2.5v-6Z" />
          <path d="M2.5 5.5 8 8l5.5-2.5M8 8v6" />
        </svg>
      )
    case 'catalog':
      return (
        <svg {...common}>
          <path d="M8.2 2.5H3v5.2l5.3 5.3a1 1 0 0 0 1.4 0l3.8-3.8a1 1 0 0 0 0-1.4L8.2 2.5Z" />
          <circle cx="5.6" cy="5.1" r="0.9" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <circle cx="6.2" cy="5.6" r="2.3" />
          <path d="M2.5 13.2c.5-2.3 2-3.5 3.7-3.5s3.2 1.2 3.7 3.5" />
          <path d="M10.6 3.8a2.3 2.3 0 0 1 0 4.4M11.5 9.9c1.4.4 2.3 1.5 2.7 3.3" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m4 6 4 4 4-4" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...common}>
          <path d="M6.5 2.5H3v11h3.5M9 5.5 12.5 8 9 10.5M6.5 8h6" />
        </svg>
      )
    case 'external':
      return (
        <svg {...common}>
          <path d="M6 3.5H3.5v9h9V10M9 3.5h3.5V7M12.5 3.5 7.5 8.5" />
        </svg>
      )
    case 'menu':
      return (
        <svg {...common}>
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
        </svg>
      )
    case 'close':
      return (
        <svg {...common}>
          <path d="m4 4 8 8M12 4l-8 8" />
        </svg>
      )
    default:
      return null
  }
}
