import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { rp } from '../lib/format.js'
import { sumRevenue, countByStatus, topSkus, REVENUE_STATUS } from './adminLogic.js'
import { Panel, EmptyState } from './ui.jsx'

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

export default function StatsPanel() {
  const [data, setData] = useState({ step: 'loading' })

  useEffect(() => {
    let alive = true
    async function load() {
      const [{ data: orders, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase.from('orders').select('order_number,total_amount,status,created_at'),
        supabase.from('order_items').select('sku,quantity,price_at_purchase'),
      ])
      if (!alive) return
      if (e1 || e2) return setData({ step: 'error', message: e1?.message ?? e2?.message })
      setData({ step: 'ready', orders: orders ?? [], items: items ?? [] })
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  if (data.step === 'loading') return <Loading />
  if (data.step === 'error') return <p className="text-sm text-destructive">Gagal memuat statistik: {data.message}</p>

  const revenue = sumRevenue(data.orders)
  const counts = countByStatus(data.orders)
  const best = topSkus(data.items).slice(0, 3)
  const paidPlus = data.orders.filter((o) => REVENUE_STATUS.has(o.status)).length
  const total = data.orders.length
  const maxBest = best[0]?.qty ?? 0

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div>
            <p className="text-[12px] font-medium text-muted-foreground">Total pendapatan</p>
            <p className="mt-1 tabular text-[30px] font-semibold leading-none tracking-[-0.01em]">{rp(revenue)}</p>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Dari <span className="tabular font-semibold text-foreground">{paidPlus}</span> order yang sudah dibayar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ['Order dibayar+', paidPlus],
          ['Menunggu bayar', counts.pending_payment ?? 0],
          ['Total order', total],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="min-h-8 text-[11px] font-medium text-muted-foreground sm:min-h-0 sm:text-[12px]">{label}</p>
            <p className="mt-0.5 tabular text-[20px] font-semibold leading-tight sm:text-[22px]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Order per status" aside={`${total} order`}>
          <ul className="space-y-2.5">
            {Object.entries(STATUS_LABELS).map(([key, label]) => {
              const count = counts[key] ?? 0
              const pct = total ? (count / total) * 100 : 0
              return (
                <li key={key} className="flex items-center gap-2.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[key]}`} />
                  <span className="w-[112px] shrink-0 text-[12px] text-muted-foreground">{label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className={`block h-full rounded-full ${STATUS_DOT[key]}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                    />
                  </span>
                  <span className="w-5 shrink-0 text-right tabular text-[12px] font-medium">{count}</span>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="SKU terlaris" aside="3 teratas">
          {best.length === 0 ? (
            <EmptyState
              title="Belum ada item terjual"
              hint="Angka muncul otomatis setelah pesanan pertama masuk."
            />
          ) : (
            <ol className="space-y-3">
              {best.map((b) => (
                <li key={b.sku} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="tabular block truncate text-[12px] font-semibold">{b.sku}</span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${maxBest ? Math.max((b.qty / maxBest) * 100, 4) : 0}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 tabular text-[12px] text-muted-foreground">{b.qty} unit</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </section>
  )
}

export function Loading() {
  return <p className="text-[13px] text-muted-foreground">Memuat data...</p>
}
