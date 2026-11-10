# Implementation Plan Documentation — Prolog.co

**Status:** Draft Baseline v1.0  
**Tanggal:** 6 November 2026  
**Project:** Implementation Plan & Phased Roadmap  

---

## 1. Phased Build Order (Urutan Pengerjaan)

Pengerjaan proyek Prolog.co Phase 1 dibagi ke dalam 6 sprint teknis berurutan dengan prinsip *contract-first* (backend schema mendahului UI):

```mermaid
gantt
    title Phased Roadmap Implementation Prolog.co (Phase 1)
    dateFormat  YYYY-MM-DD
    section Phase 1 Setup
    Sprint 1: Schema & Supabase Setup       :done, s1, 2026-11-10, 5d
    Sprint 2: Static Catalog & UI Components:active, s2, 2026-11-15, 7d
    section Phase 2 Core Commerce
    Sprint 3: Cart & Zustand Store          :s3, 2026-11-22, 5d
    Sprint 4: Checkout & Payment Integration:s4, 2026-11-27, 7d
    section Phase 3 Interactive & Polish
    Sprint 5: Admin Dashboard & Role Mgmt   :s5, 2026-12-04, 6d
    Sprint 6: R3F Lightweight 3D Viewer     :s6, 2026-12-10, 6d
    Sprint 7: SEO, Performance & A11y Audit :s7, 2026-12-16, 4d
```

---

## 2. Rincian Task per Sprint

### Sprint 1: Backend Schema & Auth Baseline
- [ ] Inisialisasi proyek Supabase lokal (`supabase init`).
- [ ] Buat file `supabase/schema.sql` memuat DDL 9 tabel utama + RLS policies (termasuk `user_roles`).
- [ ] Jalankan migrasi ke Supabase Cloud & verifikasi schema diff (`supabase db diff`).
- [ ] Input data seed 4 SKU Sudoku di `product_variants`.
- [ ] Bootstrap superadmin pertama ke tabel `user_roles` via Service Role Key.

### Sprint 2: Storefront UI & Layout System
- [ ] Setup React 19 + Vite 6 + Tailwind CSS.
- [ ] Implementasi token warna & tipografi dari `04-design-brief.md` (Playfair Display + Plus Jakarta Sans + JetBrains Mono).
- [ ] Buat komponen `ProductCard`, `HeroBanner`, dan `VariantPicker` (toggle 2 sumbu: Konten x Edisi).

### Sprint 3: Client State & Cart Engine
- [ ] Setup Zustand store (`useCartStore.js`) dengan fitur tambah, kurangi, hapus item, dan hitung subtotal.
- [ ] Hubungkan `VariantPicker` ke Cart Store.
- [ ] Buat UI Drawer Keranjang dengan transisi halus.

### Sprint 4: Checkout & Webhook Payment
- [x] Integrasi doit.id hosted checkout untuk QRIS dan Virtual Account yang aktif pada akun merchant; sandbox API menghasilkan hosted URL.
- [x] Supabase Edge Functions membuat payment doit.id dan memverifikasi webhook HMAC; event dedupe, expiry, stok, dan late payment ditangani server-side.
- [x] Halaman `/order-success` dan `/order-failed`.
- [x] Jadwalkan `cancel_expired_orders()` via pg_cron setiap 15 menit; job berjalan sukses dan pembatalan mengembalikan stok (teruji di DB, panggilan kedua idempoten).
- [x] Tetapkan biaya layanan Virtual Account ditanggung pembeli; MDR QRIS tetap merchant sesuai aturan BI. Validasi webhook memakai `amount` (nilai invoice), bukan `total_amount`.
- [ ] Set `fee_payer = customer` untuk metode VA di portal Doit → Payment Methods, lalu verifikasi `fee_payer`/`total_amount` pada respons `GET /v1/methods?amount=...`.
- [ ] Daftarkan webhook URL doit.id (`https://uyhwsquhmwlwebzcglun.supabase.co/functions/v1/doit-webhook`) dan uji event bertanda tangan serta transaksi `paid`/`expired`.

### Sprint 5: Admin Dashboard & Role Management
- [ ] Setup React Router + `AdminLayout.jsx` sebagai route terproteksi `/admin` (guard role `superadmin`/`admin` dari tabel `user_roles`).
- [ ] `CatalogManager.jsx`: inline-edit `price`, `stock`, toggle `aktif` pada `product_variants`.
- [ ] `OrderManager.jsx`: filter orders status `paid`, input `tracking_number`, ubah status ke `shipped` (memicu email resi otomatis).
- [ ] `StatsPanel.jsx`: SQL view agregat (total penjualan, order per status, SKU terlaris).
- [ ] `AdminRoles.jsx`: hanya superadmin — kelola entri `user_roles`.
- [ ] Set route `/admin` + sub-halaman `noindex` dan tanpa tautan dari navigasi publik.

### Sprint 6: 3D Interactive Model Viewer (R3F)
- [ ] Setup R3F Canvas (`@react-three/fiber`, `@react-three/drei`).
- [ ] Buat modul `materials.js` dengan material singleton Matte Uncoated Paper (mengikuti pola `digitaltwin`).
- [ ] Ekspor model 3D buku Sudoku format GLTF terkompresi Draco (< 2.5MB).
- [ ] Implementasi interaksi flip/buka-tutup halaman buku untuk melihat contoh isi puzzle.
- [ ] Hubungkan pergantian toggle varian dengan update tekstur kover model 3D secara instan.
- [ ] State "Coming Soon": model placeholder desaturasi + badge untuk halaman produk Booksleeve/Keychain.
- [ ] Tambahkan fallback foto 2D jika WebGL gagal/terdapat `prefers-reduced-motion`.

### Sprint 7: Polish, SEO & Accessibility Pass
- [ ] Prerender halaman katalog. Data produk dan harga berasal dari Supabase; perlu dipilih strategi snapshot/hydration dan canonical domain sebelum menghasilkan HTML statis.
- [x] Tambahkan Schema.org JSON-LD `Product` dari produk, varian, harga, dan stok aktif.
- [ ] Selesaikan audit WCAG 2.2 AA. Lighthouse storefront (desktop) 100 untuk Accessibility, Best Practices, dan SEO; focus trap cart/admin, status live, error form terhubung, dan tanpa overflow 320/390/1280 px sudah terverifikasi. Audit manual halaman checkout/admin dan uji keyboard penuh belum dijalankan.
- [x] Tambahkan E2E checkout happy/error, validasi form, pelacakan order, route loading, JSON-LD, fokus drawer, dan overflow horizontal.
- [x] Lazy-load route task dan 3D viewer saat mendekati viewport.
- [x] Tambahkan checklist launch, monitoring hari pertama, dan prosedur insiden pembayaran di `docs/launch-readiness.md`.
- [x] Hardening grant tabel publik: akses `anon` dibatasi ke katalog aktif; operasi admin tetap melalui `authenticated` + RLS.
- [x] Voucher promo v1: banner promo aktif, kode voucher nominal, validasi server-side, redemption limit, dan panel admin.
- [x] FAQ publik ringkas dengan accordion dan route `/faq`.
- [x] Halaman kontak, kebijakan privasi, dan syarat penggunaan tersedia di `/kontak`, `/privasi`, dan `/syarat`; kebijakan pembatalan/retur masih menunggu keputusan operasional.

---

## 3. Milestones & Quality Gates

| Milestone | Target Output | Criteria Gate |
|---|---|---|
| **M1: Database Ready** | Schema & RLS live di Supabase | `supabase/verify.sql` lolos tanpa drift. |
| **M2: Catalog Browsable** | UI katalog & toggle 4 SKU jalan | Responsivitas 375px–1440px tanpa horizontal scroll. |
| **M3: Cart Operational** | State keranjang tersimpan | Persistensi `localStorage` bertahan saat page refresh. |
| **M4: Payments Live** | Webhook callback memicu update order | Doit webhook terverifikasi dan test pembayaran sandbox mengubah `pending_payment` menjadi `paid`; event duplikat tidak menggandakan efek. Menunggu URL webhook portal dan event provider valid. |
| **M5: Admin Operational** | Dashboard `/admin` berfungsi penuh | Admin edit harga/stok & fulfill order tanpa menyentuh Supabase Studio; perubahan role superadmin berlaku seketika. |
| **M6: 3D Viewer Integrated** | Viewer 3D R3F responsif | FPS ≥ 30 di mobile GPU, flip halaman Sudoku berfungsi, teaser Coming Soon tampil untuk Booksleeve/Keychain, fallback 2D berfungsi jika WebGL di-disable. |
| **M7: Launch Ready** | Website live di produksi | TTI < 3s, SEO prerender valid, `/admin` noindex, bebas rage-click pada checkout. |

---

## 4. Table of Deferred Items (Fitur Ditunda & Trigger Revisit)

| Fitur Ditunda | Alasan Penundaan | Trigger Revisit (Kapan Dikerjakan) |
|---|---|---|
| **Full 3D Customizer Engine with Dynamic Pricing** | Sudoku Phase 1 tidak memiliki atribut kustom yang merubah harga. | Kickoff Phase 2 saat lini produk **Booksleeve** atau **Keychain** mulai dikembangkan. |
| **Auto-Recurring Subscriptions** | Model bisnis edisi *Monthly* difokuskan pada pembelian manual satuan seperti e-commerce konvensional. | Jika data survei pelanggan menunjukkan > 30% pembeli menginginkan fitur debit otomatis bulanan. |
| **Stripe & Ekspansi Internasional (USD, multi-currency)** | Phase 1 fokus market Indonesia dengan satu gateway doit.id + satu mata uang IDR untuk meminimalkan kompleksitas checkout, webhook, dan compliance. Kolom `currency` sudah disiapkan di tabel `orders` sebagai pintu ekspansi tanpa refactor skema. | Saat pembeli luar negeri menunjukkan permintaan signifikan atau lini produk siap masuk marketplace internasional. |
| **Lini Booksleeve & Keychain (rilis penuh)** | Fokus launching produk tunggal (Sudoku) untuk validasi pasar & operasi awal; keduanya tampil sebagai teaser "Coming Soon" di storefront. | Pasca 3 bulan launching Sudoku dengan target minimal 500 unit terjangkau. |
| **Multi-Warehouse & Automated Shipping Rates** | Fulfillment saat ini ditangani dari 1 lokasi gudang terpusat. | Saat volume pesanan harian melampaui 100 order/hari dan membutuhkan integrasi API Biteship/Ongkir otomatis. |
| **Fitur Admin Lanjutan (audit log, granular permission, dsb.)** | Dashboard admin Phase 1 sengaja diringankan; audit log & permission granular menambah kompleksitas tanpa kebutuhan operasional aktual. | Saat pelacakan siapa-lagi-melakukan-apa (accountability) dibutuhkan atau jumlah admin melebihi 3 orang. |
