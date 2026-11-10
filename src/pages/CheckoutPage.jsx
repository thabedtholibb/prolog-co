import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useCartStore, useCartSubtotal } from '../store/useCartStore.js'
import { checkoutOptions, describeItem } from '../store/cartLogic.js'
import { DOIT, createDoitPayment, payWithDoit } from '../lib/doit.js'
import { rp } from '../lib/format.js'
import Brand from '../components/Brand.jsx'

const EMPTY = { full_name: '', email: '', phone: '', street: '', city: '', province: '', postal_code: '' }
const LAST_ORDER_KEY = 'prolog-last-order'
const CHECKOUT_INTENT_KEY = 'prolog-checkout-intent'

async function cartFingerprint(items, email, promoCode = '') {
  const lines = items.map((i) => `${i.id}:${i.qty}:${i.price}`).sort()
  const source = JSON.stringify([email.trim().toLowerCase(), lines, promoCode])
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Mode privat/penyimpanan penuh: jangan gagalkan pesanan yang sudah dibuat.
  }
}

function readCheckoutIntent() {
  try {
    const value = JSON.parse(sessionStorage.getItem(CHECKOUT_INTENT_KEY) ?? 'null')
    return value?.fingerprint && value?.key ? value : null
  } catch {
    return null
  }
}

function clearCheckoutIntent() {
  try {
    sessionStorage.removeItem(CHECKOUT_INTENT_KEY)
  } catch {
    // Storage tidak boleh menghentikan alur pembayaran.
  }
}

function validate(f) {
  const errs = {}
  if (!f.full_name.trim()) errs.full_name = 'Nama lengkap wajib diisi'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) errs.email = 'Email tidak valid'
  if (!f.street.trim()) errs.street = 'Alamat wajib diisi'
  if (!f.city.trim()) errs.city = 'Kota wajib diisi'
  if (!f.province.trim()) errs.province = 'Provinsi wajib diisi'
  if (!/^\d{5}$/.test(f.postal_code)) errs.postal_code = 'Kode pos 5 angka'
  return errs
}

const FIELDS = [
  ['full_name', 'Nama lengkap'],
  ['email', 'Email'],
  ['phone', 'Nomor HP (opsional)'],
  ['street', 'Alamat lengkap'],
  ['city', 'Kota'],
  ['province', 'Provinsi'],
]

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items)
  const clear = useCartStore((s) => s.clear)
  const subtotal = useCartSubtotal()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [stage, setStage] = useState('idle') // idle | creating | paying | failed
  const [promotions, setPromotions] = useState([])
  const [promotionsReady, setPromotionsReady] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null)
  const [promoMessage, setPromoMessage] = useState('')
  const checkoutIntent = useRef(readCheckoutIntent())

  useEffect(() => {
    let alive = true
    async function loadPromotions() {
      const { data } = await supabase.from('promotions').select('code, discount_amount, minimum_subtotal').eq('active', true)
      if (!alive) return
      setPromotions(data ?? [])
      setPromotionsReady(true)
    }
    loadPromotions()
    return () => { alive = false }
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const ongkir = DOIT.SHIPPING_FLAT
  const discount = promo ? Math.min(Number(promo.discount_amount), subtotal) : 0
  const total = subtotal - discount + ongkir
  const paymentReady = DOIT.paymentReady()

  function applyPromo() {
    const code = promoInput.trim().toUpperCase()
    const candidate = promotions.find((item) => item.code === code)
    if (!candidate || subtotal < Number(candidate.minimum_subtotal)) {
      setPromo(null)
      setPromoMessage('Kode voucher tidak berlaku untuk keranjang ini.')
      return
    }
    setPromo(candidate)
    setPromoMessage(`Voucher aktif, potongan ${rp(Math.min(Number(candidate.discount_amount), subtotal))}.`)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (!paymentReady) return
    if (items.length === 0) return

    setStage('creating')
    try {
      // Server menghitung harga/stok. Kunci sesi menjaga retry tetap pada order sama.
       const fingerprint = await cartFingerprint(items, form.email, promo?.code ?? '')
      let intent = checkoutIntent.current
      if (!intent || intent.fingerprint !== fingerprint) {
        intent = { fingerprint, key: crypto.randomUUID() }
        checkoutIntent.current = intent
        writeSession(CHECKOUT_INTENT_KEY, JSON.stringify(intent))
      }

      const orderArgs = {
        p_customer_email: form.email,
        p_shipping_address: { ...form, country: 'Indonesia' },
        p_items: items.map((i) => ({
          variant_id: i.variantId,
          quantity: i.qty,
          options: checkoutOptions(i),
        })),
        p_expected_total: total,
        p_payment_gateway: 'doit',
        p_promo_code: promo?.code ?? null,
      }
      let { data: order, error } = await supabase.rpc('create_order', {
        ...orderArgs,
        p_idempotency_key: intent.key,
      })
      if (error) throw new Error(error.message)
      if (order?.status === 'cancelled') {
        // Pesanan lama sudah kedaluwarsa/dibatalkan; buat attempt baru.
        intent = { fingerprint, key: crypto.randomUUID() }
        checkoutIntent.current = intent
        writeSession(CHECKOUT_INTENT_KEY, JSON.stringify(intent))
        ;({ data: order, error } = await supabase.rpc('create_order', {
          ...orderArgs,
          p_idempotency_key: intent.key,
        }))
        if (error) throw new Error(error.message)
      }
      if (!order?.id) throw new Error('Pesanan tidak terbentuk. Coba lagi.')

      writeSession(
        LAST_ORDER_KEY,
        JSON.stringify({ ...order, customer_email: form.email }),
      )

      if (['paid', 'processing', 'shipped', 'completed'].includes(order.status)) {
        clear()
        clearCheckoutIntent()
        checkoutIntent.current = null
        navigate(`/order-success?id=${order.order_number}`)
        return
      }

      // API key doit.id tinggal di Edge Function; browser hanya menerima hosted URL.
      const payment = await createDoitPayment(order.id, form.email)
      if (payment.status === 'paid') {
        clear()
        clearCheckoutIntent()
        checkoutIntent.current = null
        navigate(`/order-success?id=${order.order_number}`)
        return
      }

      // Hosted checkout Doit dibuka sebagai modal; webhook tetap sumber status order.
      setStage('paying')
      const result = await payWithDoit(payment.hosted_url)
      if (result.ok) {
        clear()
        clearCheckoutIntent()
        checkoutIntent.current = null
        navigate(`/order-success?id=${order.order_number}`)
        return
      }
      setStage('failed')
      if (result.status === 'expired') {
        clearCheckoutIntent()
        checkoutIntent.current = null
        setErrors({ _form: 'Tagihan kedaluwarsa. Coba bayar lagi untuk membuat tagihan baru.' })
        setTimeout(() => setStage('idle'), 0)
        return
      }
      if (result.status === 'closed' || result.status === 'pending') {
        // Popup ditutup: gunakan order dan tagihan sama saat mencoba lagi.
        setTimeout(() => setStage('idle'), 0)
      } else {
        navigate(`/order-failed?id=${order.order_number}`)
      }
    } catch (err) {
      setStage('failed')
      if (err.code === 'payment_expired') {
        clearCheckoutIntent()
        checkoutIntent.current = null
      }
      setErrors({ _form: err.message ?? String(err) })
    }
  }

  if (items.length === 0) {
    return (
      <>
        <CheckoutHeader />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="font-serif text-3xl font-bold">Tidak ada yang perlu dibayar</h1>
          <p className="mt-4 text-muted-foreground">Keranjangmu kosong. Pilih dulu produk di katalog.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-8 cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-indigo-600/20 transition-transform active:scale-95"
          >
            Kembali ke katalog
          </button>
        </main>
      </>
    )
  }

  return (
    <>
      <CheckoutHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">Satu langkah lagi</p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Checkout</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Isi alamat, lalu pilih metode pembayaran di halaman doit.id. Ongkir flat {rp(ongkir)}.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-5">
          <section className="md:col-span-3">
            <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-xl shadow-indigo-950/5 sm:p-8">
              <h2 className="font-serif text-xl font-semibold">Alamat pengiriman</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FIELDS.map(([key, label]) => (
                  <label key={key} className={`flex flex-col gap-1 text-sm ${key === 'street' ? 'sm:col-span-2' : 'sm:col-span-1'}`}>
                    <span className="font-medium text-muted-foreground">{label}</span>
                    <input
                      id={`checkout-${key}`}
                      type={key === 'email' ? 'email' : 'text'}
                      value={form[key]}
                      onChange={set(key)}
                      aria-invalid={Boolean(errors[key])}
                      aria-describedby={errors[key] ? `checkout-${key}-error` : undefined}
                      className="rounded-xl border-2 border-border bg-card px-3.5 py-2.5 outline-none transition-colors focus:border-primary"
                    />
                    {errors[key] && (
                      <span id={`checkout-${key}-error`} className="text-[13px] text-destructive" role="alert">
                        {errors[key]}
                      </span>
                    )}
                  </label>
                ))}
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-muted-foreground">Kode pos</span>
                  <input
                    id="checkout-postal_code"
                    inputMode="numeric"
                    value={form.postal_code}
                    onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                    aria-invalid={Boolean(errors.postal_code)}
                    aria-describedby={errors.postal_code ? 'checkout-postal_code-error' : undefined}
                    className="rounded-xl border-2 border-border bg-card px-3.5 py-2.5 outline-none transition-colors focus:border-primary"
                  />
                  {errors.postal_code && (
                    <span id="checkout-postal_code-error" className="text-[13px] text-destructive" role="alert">
                      {errors.postal_code}
                    </span>
                  )}
                </label>
              </div>
            </div>
          </section>

          <section className="md:col-span-2">
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-xl shadow-indigo-950/5">
              <h2 className="font-serif text-xl font-semibold">Ringkasan</h2>
              <ul className="mt-3 divide-y divide-border">
                {items.map((i) => (
                  <li key={i.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{i.name}</span>
                      <span className="tabular block text-[12.5px] text-muted-foreground">
                        {describeItem(i)}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-muted-foreground">{i.qty} item</span>
                    </span>
                    <span className="tabular shrink-0">{rp(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular">{rp(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Voucher {promo.code}</span><span className="tabular">-{rp(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Ongkir (flat)</span><span className="tabular">{rp(ongkir)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total pesanan</span><span className="tabular font-serif text-lg">{rp(total)}</span></div>
              </div>
              <div className="mt-5 flex gap-2">
                <label className="sr-only" htmlFor="promo-code">Kode voucher</label>
                <input id="promo-code" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Kode voucher" className="min-w-0 flex-1 rounded-xl border-2 border-border bg-card px-3.5 py-2.5 text-sm uppercase outline-none focus:border-primary" />
                <button type="button" onClick={applyPromo} disabled={!promotionsReady} className="cursor-pointer rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:border-primary disabled:cursor-wait disabled:opacity-60">Pakai</button>
              </div>
              {promoMessage && <p className={`mt-2 text-[13px] ${promo ? 'text-emerald-700' : 'text-destructive'}`} role="status">{promoMessage}</p>}
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                Biaya layanan Virtual Account ditanggung pembeli dan ditambahkan di halaman pembayaran. QRIS tidak menambah biaya.
              </p>
              <button
                type="submit"
                disabled={stage === 'creating' || stage === 'paying' || !paymentReady}
                className="mt-5 w-full cursor-pointer rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent shadow-lg shadow-indigo-950/10 transition-[background-color,transform] hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {stage === 'creating' && 'Membuat pesanan...'}
                {stage === 'paying' && 'Selesaikan pembayaran di jendela doit.id'}
                {(stage === 'idle' || stage === 'failed') && (paymentReady ? 'Bayar sekarang' : 'Pembayaran belum aktif')}
              </button>
              {!paymentReady ? (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Pembayaran doit.id sedang disiapkan. Pesananmu aman di keranjang. Kamu bisa melanjutkan kapan saja.
                </p>
              ) : stage === 'failed' && errors._form ? (
                <p className="mt-2 text-[13px] text-destructive" role="alert">{errors._form}</p>
              ) : (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Metode pembayaran dan biaya layanannya ditampilkan di halaman doit.id sebelum kamu membayar.
                </p>
              )}
            </div>
          </section>
        </form>
      </main>
    </>
  )
}

function CheckoutHeader() {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="/" className="cursor-pointer">
          <Brand logoClass="h-8 sm:h-9" />
        </a>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
          </svg>
          Pembayaran aman
        </span>
      </div>
    </header>
  )
}
