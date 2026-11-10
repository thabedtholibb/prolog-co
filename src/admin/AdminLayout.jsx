import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Brand from '../components/Brand.jsx'
import StatsPanel from './StatsPanel.jsx'
import OrderManager from './OrderManager.jsx'
import CatalogManager from './CatalogManager.jsx'
import AdminRoles from './AdminRoles.jsx'
import PromotionsManager from './PromotionsManager.jsx'
import { AdminIcon } from './ui.jsx'

/*
 * Route terproteksi /admin (noindex). Guard role dari tabel user_roles:
 * superadmin/admin. Tanpa sesi -> form login inline; sesi tanpa role -> ditolak.
 *
 * Shell: sidebar tetap di desktop, drawer di ponsel. Semua panel memakai
 * satu sistem kontrol yang sama (lihat ui.jsx) supaya halaman terasa ringkas.
 */
export function useAdminAuth() {
  const [state, setState] = useState({ step: 'loading', role: null, email: null })

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      const session = (await supabase.auth.getSession()).data.session
      if (!alive) return
      if (!session) {
        setState({ step: 'anon', role: null, email: null })
        return
      }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle()
      if (!data) {
        await supabase.auth.signOut()
        if (alive) setState({ step: 'denied', role: null, email: null })
        return
      }
      if (alive) setState({ step: 'ready', role: data.role, email: session.user.email ?? '' })
    }
    refresh()
    return () => {
      alive = false
    }
  }, [])

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    const session = (await supabase.auth.getSession()).data.session
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle()
    if (!data) {
      await supabase.auth.signOut()
      return 'Akun ini tidak punya akses admin.'
    }
    setState({ step: 'ready', role: data.role, email: session.user.email ?? '' })
    return null
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setState({ step: 'anon', role: null, email: null })
  }

  return { ...state, login, logout }
}

const NAV = [
  {
    label: 'Ringkasan',
    items: [
      {
        key: 'statistik',
        label: 'Statistik',
        icon: 'chart',
        blurb: 'Pendapatan, status pesanan, dan SKU yang bergerak.',
      },
    ],
  },
  {
    label: 'Toko',
    items: [
      {
        key: 'pesanan',
        label: 'Pesanan',
        icon: 'orders',
        blurb: 'Status, nomor resi, dan alamat pengiriman.',
      },
      {
        key: 'katalog',
        label: 'Katalog',
        icon: 'catalog',
        blurb: 'Produk, varian, harga, dan stok.',
      },
      {
        key: 'promosi',
        label: 'Promosi',
        icon: 'catalog',
        blurb: 'Kode voucher dan banner promo aktif.',
      },
    ],
  },
  {
    label: 'Sistem',
    items: [
      {
        key: 'admin',
        label: 'Kelola admin',
        icon: 'users',
        blurb: 'Siapa saja yang boleh masuk ke dashboard.',
        superadmin: true,
      },
    ],
  },
]

const META = Object.fromEntries(NAV.flatMap((g) => g.items).map((i) => [i.key, i]))

export default function AdminLayout() {
  const { step, role, email, login, logout } = useAdminAuth()
  const [tab, setTab] = useState('statistik')
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const drawerRef = useRef(null)
  const menuTriggerRef = useRef(null)

  // /admin noindex + tanpa tautan dari navigasi publik (kontrak Sprint 5).
  useEffect(() => {
    document.getElementById('admin-noindex')?.remove()
    const meta = document.createElement('meta')
    meta.id = 'admin-noindex'
    meta.setAttribute('name', 'robots')
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  // Drawer ponsel: Escape menutup, Tab dikurung di panel, latar tidak ikut bergulir.
  useEffect(() => {
    if (!open) return
    const opener = menuTriggerRef.current
    drawerRef.current?.querySelector('button')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const panel = drawerRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (!window.matchMedia('(min-width: 1024px)').matches) opener?.focus()
    }
  }, [open])

  // Saat layar melebar, drawer tidak relevan lagi.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      setIsDesktop(mq.matches)
      if (mq.matches) setOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (step === 'loading') return <BootScreen />

  if (step !== 'ready') {
    return <LoginCard step={step} onLogin={(e, p) => login(e, p)} />
  }

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.superadmin || role === 'superadmin'),
  })).filter((g) => g.items.length > 0)

  const active = META[tab] ?? META.statistik
  const roleLabel = role === 'superadmin' ? 'Superadmin' : 'Admin'
  const initial = (email || 'A').charAt(0).toUpperCase()

  return (
    <div className="admin-shell min-h-dvh bg-background lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-3 lg:hidden">
        <button
          type="button"
          ref={menuTriggerRef}
          onClick={() => setOpen(true)}
          aria-label="Buka menu admin"
          aria-expanded={open}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97] motion-reduce:transition-none"
        >
          <AdminIcon name="menu" className="h-[18px] w-[18px]" />
        </button>
        <Brand logoClass="h-5" />
        <span className="ml-auto text-[12px] text-muted-foreground">Admin</span>
      </header>

      <button
        type="button"
        tabIndex={-1}
        aria-label="Tutup menu"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-indigo-950/35 transition-opacity duration-150 motion-reduce:transition-none lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        ref={drawerRef}
        role={!isDesktop ? 'dialog' : undefined}
        aria-modal={!isDesktop && open ? true : undefined}
        aria-label={!isDesktop ? 'Menu admin' : undefined}
        inert={!isDesktop && !open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <Brand logoClass="h-6" />
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-on-secondary">
            Admin
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="ml-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97] motion-reduce:transition-none lg:hidden"
          >
            <AdminIcon name="close" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Menu admin">
          {groups.map((group, gi) => (
            <div key={group.label} className={gi === 0 ? '' : 'mt-5'}>
              <p className="px-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground">{group.label}</p>
              {group.items.map((item) => {
                const isActive = tab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTab(item.key)
                      setOpen(false)
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors duration-150 motion-reduce:transition-none ${
                      isActive
                        ? 'bg-secondary font-semibold text-primary'
                        : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <AdminIcon
                      name={item.icon}
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <a
            href="/"
            className="flex h-8 items-center gap-2 rounded-md px-2 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
          >
            <AdminIcon name="external" />
            Lihat toko
          </a>
          <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-muted/60 p-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold uppercase text-on-secondary">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium">{email || 'Admin'}</p>
              <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Keluar"
              title="Keluar"
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-destructive active:scale-[0.97] motion-reduce:transition-none"
            >
              <AdminIcon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <div>
            <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-[-0.01em]">{active.label}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{active.blurb}</p>
          </div>
          <div className="mt-5">
            {tab === 'statistik' && <StatsPanel />}
            {tab === 'pesanan' && <OrderManager />}
            {tab === 'katalog' && <CatalogManager />}
            {tab === 'promosi' && <PromotionsManager />}
            {tab === 'admin' && <AdminRoles />}
          </div>
        </main>
      </div>
    </div>
  )
}

function BootScreen() {
  return (
    <div className="admin-shell grid min-h-dvh place-items-center bg-background px-6">
      <div className="flex flex-col items-center gap-3">
        <Brand logoClass="h-7" />
        <p className="text-[12px] text-muted-foreground">Membuka dashboard admin...</p>
      </div>
    </div>
  )
}

function LoginCard({ step, onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(await onLogin(email.trim(), password))
    setBusy(false)
  }

  return (
    <div className="admin-shell grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-7">
          <Brand logoClass="h-6" />
          <h1 className="mt-5 font-serif text-[24px] font-semibold leading-tight tracking-[-0.01em]">Masuk admin</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Dashboard khusus tim Prolog.co.</p>

          {step === 'denied' && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              Akun ini tidak punya akses admin.
            </p>
          )}

          <form className="mt-5 flex flex-col gap-3" noValidate onSubmit={submit}>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-muted-foreground">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-10 rounded-lg border border-border bg-card px-3 text-[13px] outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 motion-reduce:transition-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-muted-foreground">Sandi</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10 rounded-lg border border-border bg-card px-3 text-[13px] outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 motion-reduce:transition-none"
              />
            </label>
            {err && <p className="text-[12px] text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 h-10 cursor-pointer rounded-lg bg-accent text-[13px] font-semibold text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {busy ? 'Memeriksa...' : 'Masuk'}
            </button>
          </form>
        </div>
        <a
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 px-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <AdminIcon name="external" className="h-3.5 w-3.5" />
          Kembali ke toko
        </a>
      </div>
    </div>
  )
}
