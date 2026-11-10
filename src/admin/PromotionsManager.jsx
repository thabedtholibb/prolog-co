import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { rp } from '../lib/format.js'

const EMPTY = { name: '', code: '', discount_amount: '', minimum_subtotal: '0', starts_at: '', ends_at: '', max_redemptions: '' }

function iso(value) {
  return value ? new Date(value).toISOString() : null
}

export default function PromotionsManager() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    else setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function create(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await supabase.from('promotions').insert({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      discount_amount: Number(form.discount_amount),
      minimum_subtotal: Number(form.minimum_subtotal || 0),
      starts_at: iso(form.starts_at) ?? new Date().toISOString(),
      ends_at: iso(form.ends_at),
      max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
    })
    setBusy(false)
    if (error) setMessage(error.message)
    else { setForm(EMPTY); setMessage('Promo dibuat.'); load() }
  }

  async function toggle(row) {
    const { error } = await supabase.from('promotions').update({ active: !row.active, updated_at: new Date().toISOString() }).eq('id', row.id)
    if (error) setMessage(error.message)
    else load()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-serif text-lg font-semibold">Buat promo voucher</h2><p className="mt-1 text-[12px] text-muted-foreground">Versi saat ini memakai potongan nominal.</p></div>
          <button disabled={busy} className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-on-accent disabled:opacity-60">{busy ? 'Menyimpan...' : 'Simpan promo'}</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nama promo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Kode voucher" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} required placeholder="JEDA10" />
          <Field label="Potongan (Rp)" type="number" value={form.discount_amount} onChange={(v) => setForm({ ...form, discount_amount: v })} required min="1" />
          <Field label="Minimal subtotal (Rp)" type="number" value={form.minimum_subtotal} onChange={(v) => setForm({ ...form, minimum_subtotal: v })} min="0" />
          <Field label="Mulai" type="datetime-local" value={form.starts_at} onChange={(v) => setForm({ ...form, starts_at: v })} />
          <Field label="Berakhir" type="datetime-local" value={form.ends_at} onChange={(v) => setForm({ ...form, ends_at: v })} />
          <Field label="Batas penggunaan" type="number" value={form.max_redemptions} onChange={(v) => setForm({ ...form, max_redemptions: v })} min="1" placeholder="Kosong = tanpa batas" />
        </div>
        {message && <p className="mt-3 text-[13px] text-muted-foreground" role="status">{message}</p>}
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4"><h2 className="font-serif text-lg font-semibold">Promo tersimpan</h2></div>
        <div className="divide-y divide-border">
          {rows.length === 0 && <p className="px-5 py-8 text-sm text-muted-foreground">Belum ada promo.</p>}
          {rows.map((row) => (
            <div key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold">{row.name} <code className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{row.code}</code></p><p className="mt-1 text-xs text-muted-foreground">Potongan {rp(Number(row.discount_amount))} · Terpakai {row.redemption_count}{row.max_redemptions ? `/${row.max_redemptions}` : ''}</p></div>
              <button type="button" onClick={() => toggle(row)} className="w-fit cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-primary">{row.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, ...props }) {
  return <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground"><span>{label}</span><input {...props} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label>
}
