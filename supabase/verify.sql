-- ===========================================================================
-- Prolog.co — verify.sql (Quality Gate M1)
-- Jalankan di Supabase Studio (SQL Editor) atau `supabase db --help` query.
-- Nol rows/output gagal = schema drift. WAJIB lolos sebelum deploy (doc 05 §1.1).
-- ===========================================================================

-- 1. Semua tabel inti ada
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'customers', 'products', 'product_variants', 'product_configurations',
        'carts', 'cart_items', 'orders', 'order_items', 'user_roles',
        'promotions', 'promotion_redemptions'
    );

-- 2. Cek tipe & constraint kunci (harus 7 baris)
SELECT conrelid::regclass AS tbl, conname
FROM pg_constraint
WHERE conname IN (
    'orders_status_check', 'orders_currency_check', 'orders_payment_gateway_check',
    'product_variants_sku_key', 'order_items_quantity_check',
    'product_variants_content_axis_check', 'product_variants_edition_axis_check'
);

-- 3. Semua 9 tabel: RLS aktif (nol = gagal)
SELECT c.relname
FROM pg_class c
JOIN pg_tables t ON t.schemaname = 'public' AND t.tablename = c.relname
WHERE c.relrowsecurity = false
    AND c.relnamespace = 'public'::regnamespace;

-- 4. Policy inti ada (nol baris relatif polisi = drift)
SELECT COUNT(*) AS n_policies FROM pg_policies WHERE schemaname = 'public';

-- 5. Helper functions ada (nol baris = gagal)
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
    AND p.proname IN ('is_admin', 'touch_updated_at');

-- 6. Seed 4 SKU (nol baris = seed belum jalan)
SELECT sku FROM public.product_variants ORDER BY sku;
