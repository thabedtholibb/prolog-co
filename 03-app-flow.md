# App Flow Documentation — Prolog.co

**Status:** Draft Baseline v1.0  
**Tanggal:** 6 November 2026  
**Project:** User Journey & Application State Flows  

---

## 1. Primary Customer Journey Map

```mermaid
journey
    title Alur Pembelian Pelanggan Prolog.co (Sudoku Phase 1)
    section Penemuan (Discovery)
      Buka Halaman Utama (Landing): 5: Pelanggan
      Membaca Filosofi Anti-Doomscroll: 4: Pelanggan
      Klik "Jelajahi Sudoku": 5: Pelanggan
    section Interaksi Produk & Varian
      Lihat Preview Buku 3D (Rotate/Zoom): 5: Pelanggan
      Pilih Sumbu 1 (Dengan/Tanpa Journaling): 4: Pelanggan
      Pilih Sumbu 2 (Monthly/Reguler): 4: Pelanggan
      Harga & Detail SKU Diperbarui Instant: 5: Pelanggan
    section Cart & Checkout
      Klik "Tambah ke Keranjang": 5: Pelanggan
      Drawer Keranjang Terbuka: 4: Pelanggan
      Klik "Lanjut ke Pembayaran": 5: Pelanggan
      Isi Alamat & Pilih Kurir: 4: Pelanggan
      Bayar via hosted checkout doit.id (QRIS/VA aktif): 4: Pelanggan
    section Pasca Pembelian
      Halaman Konfirmasi Order & Invoice: 5: Pelanggan
      Email Notifikasi Resi & Panduan Mindful: 5: Pelanggan
```

---

### 1.1 State Halaman Produk "Coming Soon" (Booksleeve & Keychain)
Line non-Sudoku tetap tampil di katalog dan memiliki halaman produk, namun dalam state teaser:
- Kartu produk menampilkan badge "Coming Soon", tanpa harga dan tanpa CTA "Tambah ke Keranjang".
- Viewer 3D menampilkan model placeholder yang diredam (desaturasi) — tetap konsisten dengan janji brand visual 3D di semua lini.
- Tidak ada flow pembelian; hanya teks pengantar bahwa lini akan segera dirilis.

---

## 2. Variant Selection Logic & Price Resolution

Pelanggan memilih varian produk Sudoku melalui dua kontrol toggle biner independen. Sistem langsung memetakan kombinasi tersebut ke 1 dari 4 SKU resmi tanpa *price delta calculation engine* kompleks (karena harga sudah ditentukan kaku per SKU di Phase 1).

### 2.1 Pemetaan Matrix Toggle ke SKU & Harga

```
                 [ Sumbu 1: Konten ]
               /                     \
   (Dengan Journaling)         (Tanpa Journaling / Pure)
          /           \               /            \
   [Monthly]       [Reguler]     [Monthly]      [Reguler]
       |               |             |              |
  SDK-JRN-MTH     SDK-JRN-REG   SDK-PUR-MTH    SDK-PUR-REG
  (Rp 69.000)     (Rp 149.000)  (Rp 49.000)    (Rp 119.000)
```

---

## 3. Cart State Diagram

```mermaid
stateDiagram-v2
    [*] --> Empty: Pengunjung pertama kali / Reset
    
    Empty --> Active: Tambah item pertama
    Active --> Active: Tambah / Ubah jumlah item
    Active --> Empty: Hapus semua item
    
    Active --> CheckoutPending: Klik "Checkout"
    
    CheckoutPending --> PaymentProcessing: Submit Alamat & Gateway
    CheckoutPending --> Active: Batalkan / Kembalikan ke Cart
    
    PaymentProcessing --> Paid: Gateway mengonfirmasi callback sukses
    PaymentProcessing --> PaymentFailed: Transaksi ditolak / Expired
    
    PaymentFailed --> CheckoutPending: Coba ulang bayar
    Paid --> Fulfilled: Resi pengiriman diinput oleh admin
    Fulfilled --> [*]
```

---

## 4. Checkout & Payment Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant FE as React Frontend (Store)
    participant SB as Supabase DB & Auth
    participant GW as Payment Gateway (doit.id - IDR)
    participant WH as Webhook Handler API

    C->>FE: Pilih Varian & Tambah ke Cart
    C->>FE: Klik Checkout
    FE->>SB: Buat Draft Order (Status: 'pending_payment')
    SB-->>FE: Return Order ID (UUID) & Order Number (PRL-2026-XXXXX)
    
    FE->>GW: Minta hosted payment URL dari Supabase Edge Function
    GW-->>FE: Return hosted_url
    
    FE->>C: Tampilkan hosted checkout doit.id di modal
    C->>GW: Input Informasi Pembayaran & Bayar
    
    alt Pembayaran Sukses
        GW-->>WH: Kirim webhook payment.paid (HTTP POST, HMAC)
        WH->>SB: Update Order Status -> 'paid'
        WH-->>GW: Return HTTP 200 OK
        GW-->>C: Tampilkan Screen Sukses
        FE->>C: Redirect ke /order-success?id=PRL-2026-XXXXX
    else Pembayaran Gagal / Kadaluarsa
        GW-->>WH: Kirim webhook payment.expired (HTTP POST, HMAC)
        WH->>SB: Update Order Status -> 'cancelled'
        FE->>C: Tampilkan Pesan Gagal & Tombol Coba Lagi
    end
```

---

## 5. Admin & Content Operations Flow (Phase 1: Admin Dashboard Built-in)

Phase 1 menyediakan **Admin Dashboard ringan** di route SPA terproteksi `/admin` (akses hanya untuk role `superadmin`/`admin` via tabel `user_roles` + RLS). Supabase Studio tetap dipertahankan sebagai jalur cadangan untuk troubleshooting teknis, bukan sebagai alur operasional utama.

### 5.1 Modul Dashboard
1. **Katalog & Varian:** Admin membuka `CatalogManager`, mengedit nilai `price`, `stock`, atau toggle `aktif` pada tabel `product_variants` secara inline (simpan langsung via Supabase client; validasi RLS admin write).
2. **Fulfillment Pesanan:** Admin membuka `OrderManager`, memfilter tabel `orders` dengan status `paid`, menginput kode resi pada kolom `tracking_number`, dan mengubah status pesanan menjadi `shipped`.
3. **Statistik Sederhana:** `StatsPanel` menampilkan ringkasan penjualan, jumlah order per status, dan SKU terlaris.
4. **Kelola Admin:** Superadmin membuka `AdminRoles` untuk menambah/menghapus admin dan mengubah role lewat tabel `user_roles`.
5. **Database Trigger:** Perubahan status pesanan ke `shipped` pada langkah 2 secara otomatis memicu Supabase Edge Function untuk mengirimkan email notifikasi resi kepada pelanggan.

### 5.2 Bootstrap Admin Pertama
Admin pertama tidak dapat diangkat melalui dashboard (tidak ada admin sebelumnya), sehingga di-seed langsung via SQL ke tabel `user_roles` (lihat `05-backend-schema.md` §7) menggunakan Service Role Key.

---

## 6. Anti-Slop UI & Calm UX Commitment

Selaras dengan filosofi brand *Anti-Doomscroll*, seluruh layar transaksi (terutama Cart & Checkout) wajib mematuhi aturan UX berikut (ditegaskan melalui pemeriksaan `antislop-ui`):

- ❌ **No Fake Urgency:** Dilarang menggunakan countdown timer palsu (*"Hanya tersisa 5 menit!"*).
- ❌ **No Forced Upsells:** Dilarang menggunakan pop-up modal agresif sebelum checkout (*"Tambah pena ini hanya Rp 10.000!"*).
- ❌ **No Dark Patterns:** Tombol pembatalan/penghapusan keranjang harus sejelas tombol konfirmasi.
- ✅ **Calm Confirmation:** Tampilan sukses checkout memuat pesan tenang bernuansa istirahat sejenak, bukan pesan hiruk-pikuk seolah dalam perlombaan.
