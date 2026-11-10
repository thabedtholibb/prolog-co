import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { rp } from '../lib/format.js'
import Brand from '../components/Brand.jsx'

const STATUS_LABEL = {
  pending: 'Menunggu pembayaran',
  pending_payment: 'Menunggu pembayaran',
  paid: 'Sudah dibayar',
  processing: 'Sedang disiapkan',
  shipped: 'Dikirim',
  delivered: 'Diterima',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
}

function readLastOrder(orderNumber) {
  try {
    const value = JSON.parse(sessionStorage.getItem('prolog-last-order') ?? 'null')
    return value?.order_number === orderNumber ? value : null
  } catch {
    return null
  }
}

/* Halaman sukses: tenang, tanpa countdown, tanpa upsell (Anti-Doomscroll 03 §6) */
export default function OrderSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const orderNumber = params.get('id')
  const cached = readLastOrder(orderNumber)
  const [state, setState] = useState(cached ? { status: 'ready', order: cached } : { status: 'loading' })

  useEffect(() => {
    if (!orderNumber) {
      setState({ status: 'empty' })
      return
    }
    // Guest tidak punya akses SELECT ke orders; checkout menyimpan ringkasan aman
    // di sessionStorage agar halaman ini tetap terbaca setelah redirect.
    if (readLastOrder(orderNumber)) return
    supabase
      .from('orders')
      .select('order_number, total_amount, shipping_cost, status, shipping_address')
      .eq('order_number', orderNumber)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setState({ status: 'error', message: error.message })
        else if (!data) setState({ status: 'notfound' })
        else setState({ status: 'ready', order: data })
      })
  }, [orderNumber])

  // Segarkan status dari server selama masih menunggu pembayaran (get_order butuh
  // email; guest memakai email dari cache). Berhenti saat status berubah atau ~5 menit.
  useEffect(() => {
    if (!orderNumber) return
    const cached = readLastOrder(orderNumber)
    if (!cached?.customer_email) return
    let alive = true
    let attempts = 0
    let timer = null

    async function refresh() {
      attempts += 1
      const { data, error } = await supabase.rpc('get_order', {
        p_order_number: orderNumber,
        p_email: cached.customer_email,
      })
      if (!alive || error || !data) return
      setState((prev) => (prev.status === 'ready' ? { status: 'ready', order: { ...prev.order, ...data } } : prev))
      if (data.status !== 'pending_payment' || attempts >= 20) {
        if (timer) clearInterval(timer)
      }
    }

    refresh()
    timer = setInterval(refresh, 15000)
    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  }, [orderNumber])

  if (state.status === 'loading') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl font-bold">Memuat pesananmu</h1>
        <p className="mt-4 text-muted-foreground">
          {orderNumber ? `Nomor pesanan: ${orderNumber}` : 'Nomor pesanan tidak terbaca.'}
        </p>
      </main>
    )
  }
  if (state.status === 'empty' || state.status === 'notfound') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl font-bold">Pesanan tidak ditemukan</h1>
        <p className="mt-4 text-muted-foreground">Nomor pesanan tidak terbaca atau sudah tidak tersedia. Cek email konfirmasi.</p>
      </main>
    )
  }
  if (state.status === 'error') {
    return <p className="mx-auto max-w-2xl px-6 py-24 text-center text-destructive">Gagal memuat pesanan: {state.message}</p>
  }

  const { order } = state
  const paid = ['paid', 'processing', 'shipped', 'delivered'].includes(order.status)
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <div className="mb-6 flex justify-center">
        <Brand logoClass="h-10" />
      </div>
      <h1 className="font-serif text-3xl font-bold">Terima kasih. Sudah berhenti sejenak.</h1>
      <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted-foreground">
        {paid
          ? 'Pembayaran sudah terkonfirmasi. Pesananmu sedang disiapkan.'
          : 'Pesananmu sudah kami terima. Kami akan menyiapkannya setelah pembayaran terkonfirmasi.'}{' '}
        Rincian dan status pembayaran dikirim ke emailmu.
      </p>
      <dl className="mx-auto mt-10 max-w-sm rounded-[1.25rem] border border-border bg-card p-6 text-left shadow-xl shadow-indigo-950/5">
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">Nomor pesanan</dt>
          <dd className="tabular">{order.order_number}</dd>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="tabular" aria-live="polite">{STATUS_LABEL[order.status] ?? order.status}</dd>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="tabular">{rp(Number(order.total_amount))}</dd>
        </div>
      </dl>
      <p className="mx-auto mt-3 max-w-sm text-left text-[12px] leading-relaxed text-muted-foreground">
        Biaya layanan metode pembayaran dibayarkan bersama tagihan dan tidak termasuk total pesanan di atas.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-indigo-600/20 transition-transform active:scale-95"
        >
          Kembali ke beranda
        </button>
        <button
          type="button"
          onClick={() => navigate('/lacak')}
          className="cursor-pointer rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition-transform hover:border-indigo-200 active:scale-95"
        >
          Lacak pesanan
        </button>
      </div>
    </main>
  )
}
