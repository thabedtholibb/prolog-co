# Backend Schema Documentation — Prolog.co

**Status:** Draft Baseline v1.0  
**Tanggal:** 6 November 2026  
**Project:** Supabase PostgreSQL Database Specification  

---

## 1. Source-of-Truth Philosophy & Drift Prevention

### 1.1 Evaluasi & Pelajaran dari `idssmbg`
Dokumentasi backend Prolog.co secara eksplisit mengadopsi filosofi DDL dari proyek `idssmbg`:
- `supabase/schema.sql` (tulisan tangan) berfungsi sebagai **satu-satunya acuan struktur utama (*intended source of truth*)**.
- Perubahan bertahap dikelola melalui file `supabase/migrations/YYYYMMDDHHMMSS_name.sql` yang bersifat *append-only*.

⚠️ **Peringatan PENTING (Mencegah Schema Drift):**  
Berdasarkan temuan pada `idssmbg`, di mana blok DDL pada `schema.sql` tidak pernah dieksekusi di database live produksi (menyebabkan hilangnya kolom dan policy RLS di live DB):
> **Aturan Wajib:** Sebelum melakukan deployment fitur baru, pengembang WAJIB menjalankan `supabase db diff` dan `supabase/verify.sql` untuk memverifikasi bahwa database Supabase live tepat identik dengan `schema.sql`.

---

## 2. Entity Relationship Overview & Primary Key Strategy

### 2.1 Primary Key (PK) Strategy
- **Internal Database PK:** Menggunakan `UUID` (`gen_random_uuid()`) untuk seluruh tabel utama (`products`, `product_variants`, `orders`, `carts`, `customers`, `user_roles`). Hal ini menjamin keunikan global, keamanan dari URL enumeration attack, dan kemudahan migrasi.
- **Display Order Number (Manusiawi):** Nomor pesanan yang ditampilkan ke pelanggan menggunakan kolom terpisah `order_number` bertipe `TEXT` (format: `PRL-2026-XXXXX`), di-generate via PostgreSQL Sequence & Trigger (bukan dijadikan PK).

---

## 3. Database Schema DDL (SQL)

```sql
-- Schema namespace khusus Prolog (opsional, default public)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. CUSTOMERS PROFILE (Mirip pola app_users di idssmbg, terhubung ke auth.users)
--------------------------------------------------------------------------------
CREATE TABLE public.customers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone_number TEXT,
    default_address JSONB, -- { street, city, province, postal_code, country }
    aktif BOOLEAN NOT NULL DEFAULT true, -- Konvensi no-soft-delete idssmbg
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 2. PRODUCTS (Katalog Produk Utama)
--------------------------------------------------------------------------------
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('sudoku', 'booksleeve', 'keychain')),
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 3. PRODUCT VARIANTS (4 SKU Sudoku Phase 1)
--------------------------------------------------------------------------------
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE, -- SDK-JRN-MTH, SDK-JRN-REG, SDK-PUR-MTH, SDK-PUR-REG
    name TEXT NOT NULL,       -- e.g. "Sudoku Journaling - Monthly Edition"
    content_axis TEXT NOT NULL CHECK (content_axis IN ('journaling', 'pure')),
    edition_axis TEXT NOT NULL CHECK (edition_axis IN ('monthly', 'regular')),
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    weight_grams INT NOT NULL DEFAULT 300,
    gltf_asset_url TEXT,     -- Path model 3D di Supabase Storage
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 4. PRODUCT CONFIGURATIONS (Scaffold Kosong utk Kesiapan Phase 2 Booksleeve/Keychain)
--------------------------------------------------------------------------------
-- Tabel ini disiapkan di Phase 1 namun belum diisi data (tidak memicu refactor skema di Phase 2)
CREATE TABLE public.product_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,   -- e.g. "Material Canvas", "Custom Name Embroidery"
    option_name TEXT NOT NULL,  -- e.g. "Navy Canvas", "Gold Thread"
    price_delta NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- Tambahan harga modifikasi 3D
    aktif BOOLEAN NOT NULL DEFAULT true
);

--------------------------------------------------------------------------------
-- 5. CARTS & CART ITEMS
--------------------------------------------------------------------------------
CREATE TABLE public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    session_id TEXT, -- Utk guest user sebelum login
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 6. ORDERS & ORDER ITEMS
--------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1;

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE DEFAULT ('PRL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 5, '0')),
    customer_id UUID REFERENCES public.customers(id),
    customer_email TEXT NOT NULL,
    shipping_address JSONB NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'IDR' CHECK (currency = 'IDR'), -- Phase 1 parked IDR; kolom disiapkan utk ekspansi fase berikutnya
    shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'processing', 'shipped', 'cancelled', 'completed')),
    payment_gateway TEXT CHECK (payment_gateway IN ('doit', 'midtrans')), -- midtrans hanya untuk order historis
    payment_transaction_id TEXT,
    tracking_number TEXT,
    stock_returned BOOLEAN NOT NULL DEFAULT false,
    needs_manual_review BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    sku TEXT NOT NULL,
    price_at_purchase NUMERIC(12,2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE TABLE public.payment_webhook_events (
    provider TEXT NOT NULL CHECK (provider = 'doit'),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, event_id)
);

--------------------------------------------------------------------------------
-- 7. USER ROLES (Akses Dashboard Admin — Phase 1)
--------------------------------------------------------------------------------
-- Role disimpan di tabel (bukan hanya JWT claim) agar superadmin dapat mengelola
-- admin lain langsung dari AdminRoles tanpa ketergantungan ke API admin eksternal.
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- Semua admin boleh membaca daftar admin; hanya superadmin boleh menulis.
CREATE POLICY "Admin roles read" ON public.user_roles FOR SELECT USING (public.is_admin());
CREATE POLICY "Superadmin roles write" ON public.user_roles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    )
);
```

⚠️ **Bootstrap:** Admin pertama (superadmin) tidak dapat diangkat lewat dashboard, karena belum ada admin sebelumnya. Seed akun pertama via SQL berikut, dijalankan dengan Service Role Key:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<uuid-akun-supabase>', 'superadmin');
```

---

## 4. Row Level Security (RLS) Policies (Refleksi Pola `idssmbg`)

Seluruh tabel wajib diaktifkan RLS (`ALTER TABLE x ENABLE ROW LEVEL SECURITY;`). Keamanan diatur menggunakan **SQL Helper Functions** di namespace helper.

### 4.1 SQL Helper Functions
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
Fungsi meng-query tabel `user_roles` (bukan klaim JWT) sehingga perubahan role oleh superadmin berlaku seketika tanpa menunggu refresh token.

### 4.2 Contoh Implementasi RLS Policy
```sql
-- Katalog produk & varian: Publik bisa baca jika aktif, hanya Admin bisa tulis
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public products read" ON public.products FOR SELECT USING (aktif = true);
CREATE POLICY "Admin products write" ON public.products FOR ALL USING (public.is_admin());

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public variants read" ON public.product_variants FOR SELECT USING (aktif = true);
CREATE POLICY "Admin variants write" ON public.product_variants FOR ALL USING (public.is_admin());

-- Orders: Customer hanya bisa melihat pesanan milik sendiri (atau via email match)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer own order read" ON public.orders FOR SELECT 
USING (auth.uid() = customer_id OR public.is_admin());
```

---

## 5. Forward-Looking Path: Jalur Ekstensi Configurator 3D (Phase 2+)

Tabel `product_configurations` yang sudah disiapkan di atas akan digunakan saat lini Booksleeve/Keychain rilis tanpa perlu mengubah skema `orders` atau `order_items`:
1. Pengguna memilih bahan leather pada 3D visualizer.
2. Visualizer mengambil opsi dari `product_configurations` di mana `group_name = 'Material'` dan `option_name = 'Leather'`, yang memiliki `price_delta = 35000.00`.
3. Kalkulasi total harga varian menjadi `product_variants.price + SUM(price_delta)`.
4. Nilai akhir ini disimpan langsung pada `order_items.price_at_purchase` tanpa merusak histori transaksi lama.
