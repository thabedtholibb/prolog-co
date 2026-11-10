import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Loading } from './StatsPanel.jsx'
import { inputCls, btnPrimary, Field, Panel, EmptyState } from './ui.jsx'

/*
 * Kelola user_roles - HANYA superadmin (RLS: Superadmin roles write).
 * Admin baru punya akun auth dulu (daftar singkat di bawah), lalu ditetapkan role.
 */
export default function AdminRoles() {
  return (
    <section className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
      <RolesList />
      <AccessTools />
    </section>
  )
}

function RolesList() {
  const [roles, setRoles] = useState({ step: 'loading' })
  const [notif, setNotif] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('user_roles').select('user_id,role,created_at').order('created_at')
    if (error) return setRoles({ step: 'error', message: error.message })
    setRoles({ step: 'ready', rows: data ?? [] })
  }

  useEffect(() => {
    load()
  }, [notif])

  if (roles.step === 'loading') return <Loading />
  if (roles.step === 'error') return <p className="text-sm text-destructive">Gagal memuat role: {roles.message}</p>

  async function demote(row, nextRole) {
    const { error } = await supabase.from('user_roles').update({ role: nextRole }).eq('user_id', row.user_id)
    setNotif(error ? { ok: false, text: `Gagal: ${error.message}` } : { ok: true, text: 'Role diperbarui.' })
  }

  async function remove(row) {
    if (!window.confirm('Hapus akses admin ini? Akun tetap ada, hanya kehilangan akses dashboard.')) return
    const { error } = await supabase.from('user_roles').delete().eq('user_id', row.user_id)
    setNotif(error ? { ok: false, text: `Gagal: ${error.message}` } : { ok: true, text: 'Akses dihapus.' })
  }

  return (
    <Panel title="Akses saat ini" aside={`${roles.rows.length} akun`} bodyClass={roles.rows.length ? 'p-0' : 'p-4'}>
      {notif && (
        <p
          className={`px-4 pt-3 text-[12px] ${notif.ok ? 'text-accent' : 'text-destructive'}`}
          role="status"
        >
          {notif.text}
        </p>
      )}
      {roles.rows.length === 0 ? (
        <EmptyState title="Belum ada akses admin" hint="Tetapkan akses lewat panel di samping." />
      ) : (
        <ul className="divide-y divide-border/60">
          {roles.rows.map((row) => (
            <li key={row.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="tabular truncate text-[12px] font-semibold">{row.user_id.slice(0, 8)}…</p>
                <p className="text-[11px] text-muted-foreground">
                  Ditambahkan {new Date(row.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
              <select
                value={row.role}
                onChange={(e) => demote(row, e.target.value)}
                aria-label="Role"
                className="h-8 cursor-pointer rounded-md border border-border bg-card px-2 text-[12px] outline-none transition-colors focus:border-primary"
              >
                <option value="superadmin">superadmin</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="button"
                onClick={() => remove(row)}
                className="h-8 cursor-pointer rounded-md px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] motion-reduce:transition-none"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function AccessTools() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [notif, setNotif] = useState(null)

  async function assign() {
    const { data: found, error: e1 } = await supabase.rpc('find_user_id_by_email', { p_email: email.trim() })
    if (e1 || !found?.length) {
      setNotif({ ok: false, text: e1 ? e1.message : 'Akun dengan email itu belum ada. Daftarkan dulu di bawah.' })
      return
    }
    const userId = found[0].user_id
    const { error: e2 } = await supabase.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id' })
    setNotif(
      e2
        ? { ok: false, text: `Gagal: ${e2.message}` }
        : { ok: true, text: `${email.trim()} kini ${role}. Perubahan berlaku seketika.` },
    )
  }

  async function registerPassword(e) {
    e.preventDefault()
    // data1: daftar akun auth tanpa menggeser sesi superadmin (fetch manual)
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    const r = await fetch(`${url}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: new FormData(e.currentTarget).get('email'),
        password: new FormData(e.currentTarget).get('password'),
      }),
    })
    setNotif(
      r.ok
        ? { ok: true, text: 'Akun dibuat. Bila konfirmasi email aktif, selesaikan dulu, lalu tetapkan role-nya.' }
        : { ok: false, text: `Gagal daftar: ${(await r.json()).msg ?? 'cek email/sandi'}` },
    )
  }

  return (
    <Panel title="Tetapkan akses" bodyClass="p-4">
      {notif && (
        <p className={`mb-3 text-[12px] ${notif.ok ? 'text-accent' : 'text-destructive'}`} role="status">
          {notif.text}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <Field label="Email akun">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="nama@prolog.co"
          />
        </Field>
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="admin">admin</option>
            <option value="superadmin">superadmin</option>
          </select>
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={assign} className={btnPrimary}>
          Tetapkan
        </button>
      </div>

      <details className="mt-3 border-t border-border/70 pt-3">
        <summary className="cursor-pointer select-none text-[12px] text-muted-foreground [&::-webkit-details-marker]:hidden">
          Daftar akun baru (jika belum ada)
        </summary>
        <form className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={registerPassword}>
          <input
            name="email"
            type="email"
            required
            placeholder="email@prolog.co"
            className={inputCls}
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Sandi (min. 8 karakter)"
            className={inputCls}
          />
          <button type="submit" className={`${btnPrimary} sm:w-auto`}>
            Daftarkan
          </button>
        </form>
      </details>
    </Panel>
  )
}
