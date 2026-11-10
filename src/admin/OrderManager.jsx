import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { rp } from '../lib/format.js'
import { filterOrders } from './adminLogic.js'
import { formatOptions } from '../store/cartLogic.js'
import { Loading } from './StatsPanel.jsx'
import { inputCls, btnPrimary, EmptyState } from './ui.jsx'

const STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'cancelled', 'completed']
const STATUS_LABELS = {
  pending_payment: 'Menunggu bayar',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  cancelled: 'Dibatalkan',
  completed: 'Selesai',
}
const STATUS_DOT = {
  pending_payment: 'bg-amber-500',
  paid: 'bg-emerald-500',
  processing: 'bg-indigo-500',
  shipped: 'bg-sky-500',
  cancelled: 'bg-rose-500',
  completed: 'bg-slate-400',
}

/*
 * Fulfillment: filter status, isi resi, ubah status (Admin orders write RLS).
 * Catatan: email resi otomatis menyusul saat provider email tersambung (Edge Function).
 */
export default function OrderManager() {
  const [data, setData] = useState({ step: 'loading' })
  const [statusFilter, setStatusFilter] = useState('semua')
  const [notif, setNotif] = useState(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const [{ data: orders, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('order_items').select('order_id,sku,options,quantity,price_at_purchase'),
      ])
      if (!alive) return
      if (e1 || e2) return setData({ step: 'error', message: e1?.message ?? e2?.message })
      const itemsByOrder = (items ?? []).reduce((acc, i) => {
        ;(acc[i.order_id] = acc[i.order_id] ?? []).push(i)
        return acc
      }, {})
      setData({ step: 'ready', orders: orders ?? [], itemsByOrder })
    }
    load()
    return () => {
      alive = false
    }
  }, [notif])

  if (data.step === 'loading') return <Loading />
  if (data.step === 'error') return <p className="text-sm text-destructive">Gagal memuat pesanan: {data.message}</p>

  const visible = filterOrders(data.orders, statusFilter)
  const counts = data.orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  async function update(order, patch) {
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id)
    setNotif(error ? { ok: false, text: `Gagal: ${error.message}` } : { ok: true, text: `Pesanan ${order.order_number} tersimpan.` })
    if (!error) window.setTimeout(() => setNotif(null), 2500)
  }

  return (
    <section>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {['semua', ...STATUSES].map((key) => {
          const active = statusFilter === key
          const count = key === 'semua' ? data.orders.length : counts[key] ?? 0
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setStatusFilter(key)}
              className={`h-8 shrink-0 cursor-pointer rounded-lg border px-2.5 text-[12px] transition-colors duration-150 active:scale-[0.97] motion-reduce:transition-none ${
                active
                  ? 'border-primary/25 bg-secondary font-semibold text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {key === 'semua' ? 'Semua' : STATUS_LABELS[key]}
              <span className={`ml-1.5 tabular ${active ? 'text-primary/70' : 'text-muted-foreground/70'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {notif && (
        <p className={`mt-3 text-[12px] ${notif.ok ? 'text-accent' : 'text-destructive'}`} role="status">
          {notif.text}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="mt-3 rounded-xl border border-border bg-card">
          <EmptyState
            title={data.orders.length === 0 ? 'Belum ada pesanan' : 'Tidak ada pesanan dengan status ini'}
            hint={
              data.orders.length === 0
                ? 'Pesanan dari toko akan muncul di sini lengkap dengan item dan alamatnya.'
                : 'Coba pilih status lain atau tampilkan semua.'
            }
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {visible.map((o) => (
            <li key={o.id} className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 tabular text-[13px] font-semibold">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[o.status]}`} />
                    {o.order_number}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleString('id-ID')} · {o.customer_email}
                  </p>
                  {o.needs_manual_review && (
                    <p className="mt-1 text-[12px] font-medium text-rose-700" role="alert">
                      Pembayaran diterima, tetapi stok perlu diperiksa sebelum diproses.
                    </p>
                  )}
                </div>
                <p className="tabular text-[15px] font-semibold">{rp(o.total_amount)}</p>
              </div>

              <ul className="space-y-0.5 px-4 pb-2 text-[12px] text-muted-foreground">
                {(data.itemsByOrder[o.id] ?? []).map((i, j) => (
                  <li key={j} className="tabular">
                    {i.sku}
                    {formatOptions(i.options) ? ` · ${formatOptions(i.options)}` : ''} ×{i.quantity} · {rp(i.price_at_purchase * i.quantity)}
                  </li>
                ))}
              </ul>

              <details className="px-4 pb-2 text-[12px] text-muted-foreground">
                <summary className="cursor-pointer select-none py-0.5">Alamat pengiriman</summary>
                <p className="mt-1 leading-relaxed">
                  {Object.values(o.shipping_address ?? {}).filter(Boolean).join(', ')}
                </p>
              </details>

              <div className="flex flex-wrap items-end gap-2 border-t border-border/70 px-4 py-2.5">
                <label className="flex items-center gap-2 text-[12px]">
                  <span className="text-muted-foreground">Status</span>
                  <select
                    value={o.status}
                    onChange={(e) => update(o, { status: e.target.value })}
                    className="h-8 cursor-pointer rounded-md border border-border bg-card px-2 text-[12px] outline-none transition-colors focus:border-primary"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ml-auto">
                  <ResiInput order={o} onSave={(v) => update(o, { tracking_number: v })} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Email resi otomatis menyusul saat koneksi layanan email aktif.
      </p>
    </section>
  )
}

/* Resi disimpan eksplisit (button), bukan on-blur: intent jelas, zero silent-loss. */
function ResiInput({ order, onSave }) {
  const [draft, setDraft] = useState(order.tracking_number ?? '')
  useEffect(() => {
    setDraft(order.tracking_number ?? '')
  }, [order.tracking_number])
  const dirty = draft !== (order.tracking_number ?? '')

  return (
    <div className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-[11px]">
        <span className="text-muted-foreground">Nomor resi</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Kosong jika belum dikirim"
          className={`${inputCls} h-8 w-44 px-2 text-[12px]`}
        />
      </label>
      <button
        type="button"
        disabled={!dirty}
        onClick={() => onSave(draft.trim())}
        className={`${btnPrimary} h-8 px-3 text-[12px]`}
      >
        Simpan
      </button>
    </div>
  )
}
