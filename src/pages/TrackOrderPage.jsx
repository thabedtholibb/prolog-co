import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { rp } from '../lib/format.js'
import { formatOptions } from '../store/cartLogic.js'
import Brand from '../components/Brand.jsx'

const STATUS_LABEL = {
  pending_payment: 'Menunggu pembayaran',
  paid: 'Dibayar',
  processing: 'Sedang disiapkan',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}
const STATUS_DOT = {
  pending_payment: 'bg-amber-500',
  paid: 'bg-emerald-500',
  processing: 'bg-indigo-500',
  shipped: 'bg-sky-500',
  completed: 'bg-slate-400',
  cancelled: 'bg-rose-500',
}

/* Lacak pesanan: lookup aman lewat RPC get_order (nomor + email harus cocok). */
export default function TrackOrderPage() {
  const [form, setForm] = useState({ email: '', order_number: '' })
  const [step, setStep] = useState('idle') // idle | loading | ready | error
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setStep('loading')
    setError('')
    const { data, error } = await supabase.rpc('get_order', {
      p_order_number: form.order_number.trim(),
      p_email: form.email.trim(),
    })
    if (error) {
      setError(error.message)
      setStep('error')
      return
    }
    setOrder(data)
    setStep('ready')
  }

  return (
    <>
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="cursor-pointer">
            <Brand logoClass="h-8 sm:h-9" />
          </a>
          <a href="/" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Kembali ke toko
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">Lacak pesanan</p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
          Di mana pesananmu?
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Masukkan email dan nomor pesanan yang kamu terima saat checkout. Keduanya harus cocok.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              placeholder="kamu@email.com"
              className="rounded-xl border-2 border-border bg-card px-3.5 py-2.5 outline-none transition-colors focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-muted-foreground">Nomor pesanan</span>
            <input
              value={form.order_number}
              onChange={set('order_number')}
              required
              placeholder="PRL-2026-00000"
              className="rounded-xl border-2 border-border bg-card px-3.5 py-2.5 outline-none transition-colors focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={step === 'loading'}
            className="cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-indigo-600/20 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {step === 'loading' ? 'Mencari...' : 'Cek pesanan'}
          </button>
        </form>

        {step === 'error' && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}

        {step === 'ready' && order && (
          <div className="mt-8 rounded-[1.5rem] border border-border bg-card p-6 shadow-xl shadow-indigo-950/5 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="tabular text-[15px] font-semibold">{order.order_number}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Dibuat {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground`}>
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[order.status] ?? 'bg-slate-400'}`} />
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            {order.tracking_number && (
              <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-[13px] text-primary">
                Nomor resi: <span className="tabular font-semibold">{order.tracking_number}</span>
              </p>
            )}

            <ul className="mt-4 divide-y divide-border border-t border-border">
              {(order.items ?? []).map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.name ?? item.sku}</span>
                    {formatOptions(item.options) && (
                      <span className="block text-[12.5px] text-muted-foreground">{formatOptions(item.options)}</span>
                    )}
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">{item.quantity} item</span>
                  </span>
                  <span className="tabular shrink-0">{rp(Number(item.price_at_purchase) * item.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkir</span>
                <span className="tabular">{rp(Number(order.shipping_cost))}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular font-serif text-lg">{rp(Number(order.total_amount))}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
