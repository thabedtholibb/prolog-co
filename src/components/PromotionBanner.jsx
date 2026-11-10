import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { rp } from '../lib/format.js'

export default function PromotionBanner() {
  const [promo, setPromo] = useState(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('promotions')
      .select('name, code, discount_amount, minimum_subtotal, ends_at')
      .eq('active', true)
      .order('ends_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setPromo(data)
      })
    return () => {
      alive = false
    }
  }, [])

  if (!promo) return null
  return (
    <aside className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" aria-label="Promosi aktif">
      <div className="flex flex-col gap-3 rounded-2xl bg-primary px-5 py-4 text-on-primary sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold">{promo.name}</p>
          <p className="mt-1 text-[13px] text-on-primary/75">
            Potongan {rp(Number(promo.discount_amount))}
            {Number(promo.minimum_subtotal) > 0 ? ` untuk belanja minimal ${rp(Number(promo.minimum_subtotal))}` : ''}.
          </p>
        </div>
        <code className="w-fit rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold tracking-[0.08em]">{promo.code}</code>
      </div>
    </aside>
  )
}
