import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { rp } from '../lib/format.js'
import { PRODUCT_CATEGORIES, slugify, categoryLabel, isSudoku } from '../lib/catalog.js'
import { Loading } from './StatsPanel.jsx'
import { inputCls, btnPrimary, Field, Panel, EmptyState, AdminIcon } from './ui.jsx'

/*
 * Katalog admin: tambah produk & varian, lalu inline-edit harga, stok,
 * toggle aktif. Semua tulis lewat RLS admin (products/variants FOR ALL).
 */
export default function CatalogManager() {
  const [data, setData] = useState({ step: 'loading' })
  const [notif, setNotif] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    async function load() {
      const [{ data: products, error: e1 }, { data: variants, error: e2 }] = await Promise.all([
        supabase.from('products').select('id,slug,name,description,category,aktif').order('created_at'),
        supabase.from('product_variants').select('id,product_id,sku,name,content_axis,edition_axis,price,stock,aktif').order('sku'),
      ])
      if (!alive) return
      if (e1 || e2) return setData({ step: 'error', message: e1?.message ?? e2?.message })
      setData({ step: 'ready', products: products ?? [], variants: variants ?? [] })
    }
    load()
    return () => {
      alive = false
    }
  }, [reload])

  function notify(ok, text) {
    setNotif({ ok, text })
    if (ok) window.setTimeout(() => setNotif(null), 3000)
  }

  const refresh = () => setReload((n) => n + 1)

  if (data.step === 'loading') return <Loading />
  if (data.step === 'error') return <p className="text-sm text-destructive">Gagal memuat katalog: {data.message}</p>

  const productName = (id) => data.products.find((p) => p.id === id)?.name ?? ''
  const variants = [...data.variants].sort(
    (a, b) => productName(a.product_id).localeCompare(productName(b.product_id)) || a.sku.localeCompare(b.sku),
  )

  async function save(v) {
    const patch = { price: v.price, stock: v.stock, aktif: v.aktif }
    const { error } = await supabase.from('product_variants').update(patch).eq('id', v.id)
    notify(
      !error,
      error ? `Gagal: ${error.message}` : `SKU ${v.sku} tersimpan. Harga ${rp(v.price)}, stok ${v.stock}.`,
    )
  }

  async function toggleProduct(p) {
    const { error } = await supabase.from('products').update({ aktif: !p.aktif }).eq('id', p.id)
    if (error) return notify(false, `Gagal: ${error.message}`)
    notify(true, `${p.name} ${p.aktif ? 'disembunyikan dari situs' : 'tampil di situs'}.`)
    refresh()
  }

  return (
    <section className="space-y-3">
      {notif && (
        <p className={`text-[12px] ${notif.ok ? 'text-accent' : 'text-destructive'}`} role="status">
          {notif.text}
        </p>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <AddProduct products={data.products} onDone={refresh} notify={notify} />
        <AddVariant products={data.products} onDone={refresh} notify={notify} />
      </div>

      <Panel
        title="Produk"
        aside={`${data.products.length} produk`}
        bodyClass={data.products.length ? 'p-0' : 'p-4'}
      >
        {data.products.length === 0 ? (
          <EmptyState title="Belum ada produk" hint="Mulai dari panel Tambah produk di atas." />
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border/70 text-[11px] font-medium text-muted-foreground">
                <th className="px-4 py-2 font-medium">Produk</th>
                <th className="w-16 px-2 py-2 text-center font-medium">Varian</th>
                <th className="w-[76px] px-4 py-2 text-right font-medium">Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.products.map((p) => {
                const count = data.variants.filter((v) => v.product_id === p.id).length
                return (
                  <tr key={p.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <p className="font-medium leading-snug">{p.name}</p>
                      <p className="tabular truncate text-[11px] text-muted-foreground">
                        {p.slug} · {categoryLabel(p.category)}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 text-center tabular text-[12px] text-muted-foreground">{count}</td>
                    <td className="px-4 py-2.5 text-right">
                      <label
                        className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-muted-foreground"
                        title="Aktif dijual"
                      >
                        <input
                          type="checkbox"
                          checked={p.aktif}
                          onChange={() => toggleProduct(p)}
                          aria-label={`Aktif dijual: ${p.name}`}
                          className="h-3.5 w-3.5 cursor-pointer accent-primary"
                        />
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title="Varian"
        aside={`${data.variants.length} varian`}
        bodyClass={variants.length ? 'p-0' : 'p-4'}
      >
        {variants.length === 0 ? (
          <EmptyState title="Belum ada varian" hint="Varian menyimpan SKU, harga, dan stok." />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_80px_64px_60px] items-center gap-3 border-b border-border/70 px-4 py-2 text-[11px] font-medium text-muted-foreground sm:grid">
              <span>SKU / produk</span>
              <span>Harga (Rp)</span>
              <span>Stok</span>
              <span>Aktif</span>
              <span className="text-right">Simpan</span>
            </div>
            <ul className="divide-y divide-border/60">
              {variants.map((v) => (
                <VariantRow key={v.id} variant={v} productName={productName(v.product_id)} onSave={save} />
              ))}
            </ul>
          </>
        )}
      </Panel>
    </section>
  )
}

/* ---------------------------------------------------------------- tambah produk */

function AddProduct({ products, onDone, notify }) {
  const [form, setForm] = useState({ name: '', slug: '', category: '', description: '' })
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categories = [...new Set([...PRODUCT_CATEGORIES, ...products.map((p) => p.category)])]
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    const name = form.name.trim()
    const slug = (form.slug.trim() || slugify(name)).toLowerCase()
    const category = slugify(form.category)
    if (!name) return setError('Nama produk wajib diisi.')
    if (!slug) return setError('Slug tidak valid. Isi manual.')
    if (!category) return setError('Kategori wajib diisi. Contoh: notebook atau tote-bag.')
    setSaving(true)
    const { error: err } = await supabase.from('products').insert({
      name,
      slug,
      category,
      description: form.description.trim() || null,
      aktif: true,
    })
    setSaving(false)
    if (err) return setError(err.message)
    notify(true, `Produk "${name}" dibuat.`)
    setForm({ name: '', slug: '', category: '', description: '' })
    setSlugTouched(false)
    onDone()
  }

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
        <AdminIcon name="plus" className="h-4 w-4 text-muted-foreground" />
        Tambah produk
        <AdminIcon
          name="chevron"
          className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <form className="grid gap-3 border-t border-border/70 p-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Nama produk">
          <input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value
              setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))
            }}
            className={inputCls}
            placeholder="Sarung buku linen"
            required
          />
        </Field>
        <Field label="Slug URL">
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true)
              set('slug', e.target.value)
            }}
            className={`${inputCls} tabular`}
            placeholder="sarung-buku-linen"
          />
        </Field>
        <Field label="Kategori">
          <input
            list="kategori-produk"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className={inputCls}
            placeholder="booksleeve, notebook, tote-bag"
            required
          />
          <datalist id="kategori-produk">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Deskripsi (opsional)" className="sm:col-span-2">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 motion-reduce:transition-none"
            placeholder="Satu atau dua kalimat untuk kartu produk."
          />
        </Field>
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
          Kategori bebas. Sudoku tampil di beranda setelah punya varian aktif; kategori lain langsung tampil sebagai
          kartu teaser.
        </p>
        {error && <p className="text-[12px] text-destructive sm:col-span-2">{error}</p>}
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Menyimpan...' : 'Simpan produk'}
          </button>
        </div>
      </form>
    </details>
  )
}

/* ---------------------------------------------------------------- tambah varian */

function AddVariant({ products, onDone, notify }) {
  const [form, setForm] = useState({
    product_id: products[0]?.id ?? '',
    sku: '',
    name: '',
      edition_axis: 'monthly',
    price: '',
    stock: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const selectedProduct = products.find((p) => p.id === form.product_id)
  const needsAxes = isSudoku(selectedProduct?.category)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.product_id) return setError('Pilih produk induk dulu.')
    if (!form.sku.trim() || !form.name.trim()) return setError('SKU dan nama varian wajib diisi.')
    setSaving(true)
    const { error: err } = await supabase.from('product_variants').insert({
      product_id: form.product_id,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      content_axis: needsAxes ? (form.edition_axis === 'monthly' ? 'journaling' : 'pure') : null,
      edition_axis: needsAxes ? form.edition_axis : null,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      aktif: true,
    })
    setSaving(false)
    if (err) return setError(err.message)
    notify(true, `Varian ${form.sku.toUpperCase()} dibuat.`)
    setForm((f) => ({ ...f, sku: '', name: '', price: '', stock: '' }))
    onDone()
  }

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
        <AdminIcon name="plus" className="h-4 w-4 text-muted-foreground" />
        Tambah varian
        <AdminIcon
          name="chevron"
          className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <form className="grid gap-3 border-t border-border/70 p-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Produk induk" className="sm:col-span-2">
          <select
            value={form.product_id}
            onChange={(e) => set('product_id', e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {categoryLabel(p.category)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="SKU">
          <input
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
            className={`${inputCls} tabular`}
            placeholder="SDK-JRN-MTH"
            required
          />
        </Field>
        <Field label="Nama varian">
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputCls}
            placeholder="Journaling Monthly"
            required
          />
        </Field>
        {needsAxes && (
          <>
            <Field label="Edisi">
              <select
                value={form.edition_axis}
                onChange={(e) => set('edition_axis', e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="monthly">monthly</option>
                <option value="regular">regular</option>
              </select>
            </Field>
            <p className="self-end text-[11px] leading-relaxed text-muted-foreground">
              Monthly otomatis Journaling. Reguler otomatis Murni Puzzle.
            </p>
          </>
        )}
        <Field label="Harga (Rp)">
          <input
            inputMode="numeric"
            value={form.price}
            onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))}
            className={`${inputCls} tabular`}
            placeholder="69000"
          />
        </Field>
        <Field label="Stok (unit)">
          <input
            inputMode="numeric"
            value={form.stock}
            onChange={(e) => set('stock', e.target.value.replace(/\D/g, ''))}
            className={`${inputCls} tabular`}
            placeholder="200"
          />
        </Field>
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
          Sumbu konten dan edisi hanya untuk sudoku. Varian kategori lain disimpan tanpa sumbu; alur beli non-sudoku
          belum dibuka.
        </p>
        {error && <p className="text-[12px] text-destructive sm:col-span-2">{error}</p>}
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Menyimpan...' : 'Simpan varian'}
          </button>
        </div>
      </form>
    </details>
  )
}

/* ---------------------------------------------------------------- baris varian */

function VariantRow({ variant, productName, onSave }) {
  const [draft, setDraft] = useState({ ...variant })

  // draft pulih saat data server berubah (refetch setelah simpan/tambah)
  useEffect(() => {
    setDraft({ ...variant })
  }, [variant])

  const dirty = draft.price !== variant.price || draft.stock !== variant.stock || draft.aktif !== variant.aktif

  return (
    <li className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_110px_80px_64px_60px] sm:items-center sm:gap-3">
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="tabular text-[12px] font-semibold">{variant.sku}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {productName} · {variant.name}
          {variant.edition_axis && ` · ${variant.edition_axis === 'monthly' ? 'Monthly · Journaling' : 'Reguler · Murni Puzzle'}`}
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-muted-foreground sm:hidden">Harga (Rp)</span>
        <input
          inputMode="numeric"
          value={draft.price}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '')
            setDraft((d) => ({ ...d, price: digits === '' ? 0 : parseInt(digits, 10) }))
          }}
          className={`${inputCls} tabular h-8 px-2 text-[12px]`}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-muted-foreground sm:hidden">Stok</span>
        <input
          inputMode="numeric"
          value={draft.stock}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '')
            setDraft((d) => ({ ...d, stock: digits === '' ? 0 : parseInt(digits, 10) }))
          }}
          className={`${inputCls} tabular h-8 px-2 text-[12px]`}
        />
      </label>

      <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted-foreground">
        <input
          type="checkbox"
          checked={draft.aktif}
          onChange={(e) => setDraft((d) => ({ ...d, aktif: e.target.checked }))}
          aria-label={`Aktif dijual: ${variant.sku}`}
          className="h-3.5 w-3.5 cursor-pointer accent-primary"
        />
        <span className="sm:hidden">Aktif</span>
      </label>

      <div className="flex justify-end sm:block">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSave(draft)}
          title={dirty ? 'Simpan perubahan' : 'Tidak ada perubahan'}
          className={
            dirty
              ? `${btnPrimary} h-8 px-2.5 text-[12px] sm:w-full`
              : 'inline-flex h-8 cursor-default items-center justify-center rounded-lg border border-border px-2.5 text-[12px] font-medium text-muted-foreground/60 sm:w-full'
          }
        >
          Simpan
        </button>
      </div>
    </li>
  )
}
