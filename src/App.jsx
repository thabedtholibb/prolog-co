import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import { splitCatalog, teaserWindow, TEASER_LIMIT, safeBlurb } from './lib/catalog.js'
import { useCartStore } from './store/useCartStore.js'
import SiteHeader from './components/SiteHeader.jsx'
import Brand from './components/Brand.jsx'
import HeroBanner from './components/HeroBanner.jsx'
import Story, { Reveal } from './components/Story.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import FeaturedProduct from './components/FeaturedProduct.jsx'
import ProductCard from './components/ProductCard.jsx'
import PromotionBanner from './components/PromotionBanner.jsx'
import InfoPage from './pages/InfoPage.jsx'

const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'))
const AdminPage = lazy(() => import('./admin/AdminPage.jsx'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage.jsx'))
const OrderFailedPage = lazy(() => import('./pages/OrderFailedPage.jsx'))
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage.jsx'))
const FaqPage = lazy(() => import('./pages/FaqPage.jsx'))

const REFRESH_THROTTLE_MS = 2000
const NON_STOREFRONT_PATHS = ['/checkout', '/order-success', '/order-failed', '/lacak', '/faq', '/kontak', '/privasi', '/syarat']

function isStorefrontPath(pathname) {
  return pathname === '/' || (!pathname.startsWith('/admin') && !NON_STOREFRONT_PATHS.includes(pathname))
}

export default function App() {
  const [state, setState] = useState({ status: 'loading' })
  const requestId = useRef(0)
  const lastLoad = useRef(0)
  const location = useLocation()

  const load = useCallback(async ({ quiet = false } = {}) => {
    const now = Date.now()
    if (quiet && now - lastLoad.current < REFRESH_THROTTLE_MS) return
    lastLoad.current = now
    const id = ++requestId.current

    const [{ data: products, error: errP }, { data: variants, error: errV }] = await Promise.all([
      supabase.from('products').select('*').eq('aktif', true).order('created_at'),
      supabase.from('product_variants').select('*').eq('aktif', true).order('sku'),
    ])
    if (id !== requestId.current) return

    if (errP || errV) {
      // Refetch diam-diam gagal: pertahankan katalog lama daripada mengosongkan layar.
      setState((prev) =>
        prev.status === 'ready' ? prev : { status: 'error', message: errP?.message ?? errV?.message },
      )
      return
    }
    if (!products?.length) {
      setState({ status: 'empty' })
      return
    }
    const next = { status: 'ready', products, variants: variants ?? [] }
    setState(next)
    useCartStore.getState().sync(next.variants)
  }, [])

  useEffect(() => {
    if (!isStorefrontPath(location.pathname)) return
    load()

    let lastRefresh = 0
    function refresh() {
      if (document.hidden) return
      const now = Date.now()
      if (now - lastRefresh < REFRESH_THROTTLE_MS) return
      lastRefresh = now
      load({ quiet: true })
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load, location.pathname])

  // Realtime: perubahan katalog (produk/varian) dari admin langsung di-refetch,
  // tanpa polling berkala. Fallback focus/visibility tetap ada di atas.
  useEffect(() => {
    if (!isStorefrontPath(location.pathname)) return
    const channel = supabase
      .channel('catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => load({ quiet: true }))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load, location.pathname])

  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-6 py-32 text-center text-muted-foreground">Memuat halaman...</p>}>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/order-success" element={<OrderSuccessPage />} />
        <Route path="/order-failed" element={<OrderFailedPage />} />
        <Route path="/lacak" element={<TrackOrderPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/kontak" element={<InfoPage kind="contact" />} />
        <Route path="/privasi" element={<InfoPage kind="privacy" />} />
        <Route path="/syarat" element={<InfoPage kind="terms" />} />
        <Route path="*" element={<Home state={state} />} />
      </Routes>
    </Suspense>
  )
}

function Home({ state }) {
  const [showAllSoon, setShowAllSoon] = useState(false)
  if (state.status === 'loading') {
    return <p className="mx-auto max-w-3xl px-6 py-32 text-center text-muted-foreground">Memuat katalog...</p>
  }
  if (state.status === 'error') {
    return (
      <p className="mx-auto max-w-3xl px-6 py-32 text-center text-destructive">
        Gagal memuat katalog: {state.message}. Cek koneksi atau coba muat ulang halaman.
      </p>
    )
  }
  if (state.status === 'empty') {
    return (
      <p className="mx-auto max-w-3xl px-6 py-32 text-center text-muted-foreground">
        Katalog masih kosong. Jalankan supabase/seed.sql untuk mengisi produk awal.
      </p>
    )
  }

  const { sudoku, ready, soon } = splitCatalog(state.products, state.variants)
  const visibleSoon = teaserWindow(soon, showAllSoon)
  const structuredProducts = [...sudoku, ...ready].map((product) => {
    const offers = state.variants
      .filter((variant) => variant.product_id === product.id)
      .map((variant) => ({
        '@type': 'Offer',
        url: `${window.location.origin}/#katalog`,
        priceCurrency: 'IDR',
        price: Number(variant.price),
        availability: Number(variant.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      }))
    return offers.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: safeBlurb(product.description),
          brand: { '@type': 'Brand', name: 'Prolog.co' },
          offers,
        }
      : null
  }).filter(Boolean)
  const jsonLd = JSON.stringify(structuredProducts).replace(/</g, '\\u003c')

  return (
    <>
      {structuredProducts.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      )}
      <SiteHeader />
      <CartDrawer />
      <HeroBanner />
      <PromotionBanner />
      <Story />
      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-24 sm:gap-24 sm:px-6">
        {sudoku.map((product, i) => (
          <FeaturedProduct
            key={product.id}
            product={product}
            variants={state.variants.filter((v) => v.product_id === product.id)}
            heading={i === 0}
            anchor={i === 0}
          />
        ))}
        {ready.length > 0 && (
          <section id="produk-siap" aria-labelledby="produk-siap-title" className="scroll-mt-24">
            <Reveal as="div" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Siap dibeli</p>
                <h2
                  id="produk-siap-title"
                  className="mt-2 max-w-[22ch] font-serif text-3xl font-bold leading-[1.03] tracking-[-0.02em] sm:text-4xl"
                >
                  Benda lain yang sudah siap.
                </h2>
              </div>
              <p className="max-w-[36ch] text-[15px] leading-[1.7] text-muted-foreground">
                Varian dan stoknya sudah aktif. Pilih yang sesuai, lalu lanjutkan ke keranjang.
              </p>
            </Reveal>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {ready.map((p, i) => (
                <Reveal key={p.id} as="div" delay={i * 90}>
                  <ProductCard product={p} variants={state.variants.filter((v) => v.product_id === p.id)} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
        {soon.length > 0 && (
          <section id="dalam-persiapan" aria-labelledby="dalam-persiapan-title" className="scroll-mt-24">
            <Reveal as="div" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">Lini mendatang</p>
                <h2
                  id="dalam-persiapan-title"
                  className="mt-2 max-w-[20ch] font-serif text-3xl font-bold leading-[1.03] tracking-[-0.02em] sm:text-4xl"
                >
                  Benda lain dari meja kerja kami.
                </h2>
              </div>
              <p className="max-w-[36ch] text-[15px] leading-[1.7] text-muted-foreground">
                Masih disempurnakan. Putar modelnya pelan-pelan, tanpa harga dan tanpa buru-buru.
              </p>
            </Reveal>
            <div id="produk-lain" className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {visibleSoon.map((p, i) => (
                <Reveal key={p.id} as="div" delay={i * 90}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
            {soon.length > TEASER_LIMIT && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllSoon((v) => !v)}
                  aria-expanded={showAllSoon}
                  aria-controls="produk-lain"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-[14px] font-semibold text-foreground shadow-sm transition-colors hover:border-indigo-200 hover:text-primary"
                >
                  {showAllSoon ? 'Tampilkan lebih sedikit' : `Lihat ${soon.length - visibleSoon.length} produk lainnya`}
                  <svg
                    viewBox="0 0 16 16"
                    className={`h-4 w-4 transition-transform ${showAllSoon ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path d="M4 6.5 8 10.5l4-4" />
                  </svg>
                </button>
              </div>
            )}
          </section>
        )}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-start gap-3">
              <Brand dark mark logoClass="h-24" />
              <p className="font-serif text-xl font-semibold leading-tight tracking-[-0.02em] sm:text-2xl">
                Setiap pembaca adalah seorang penulis ceritanya.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
              <a href="/lacak" className="text-[13px] font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline">Lacak pesanan</a>
              <a href="/faq" className="text-[13px] font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline">FAQ</a>
              <a href="/kontak" className="text-[13px] font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline">Kontak</a>
              <a href="/privasi" className="text-[13px] font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline">Privasi</a>
              <a href="/syarat" className="text-[13px] font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline">Syarat penggunaan</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
