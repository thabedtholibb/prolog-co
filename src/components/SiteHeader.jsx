import Brand from './Brand.jsx'
import CartButton from './CartButton.jsx'

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-8 sm:py-3.5">
        <a href="#" className="flex shrink-0 cursor-pointer items-center" aria-label="Prolog.co, ke atas">
          <Brand logoClass="h-7 sm:h-10" />
        </a>
        <nav aria-label="Navigasi utama" className="flex items-center gap-1 sm:gap-2">
          <a
            href="#kisah"
            className="hidden cursor-pointer rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            Kisah
          </a>
          <a
            href="#katalog"
            className="hidden cursor-pointer rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            Katalog
          </a>
          <CartButton inline />
        </nav>
      </div>
    </header>
  )
}
