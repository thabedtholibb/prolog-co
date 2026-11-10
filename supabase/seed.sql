-- ===========================================================================
-- Prolog.co — seed.sql (Phase 1)
-- Jalankan setelah schema.sql. Idempotent: ON CONFLICT DO NOTHING / UPSERT.
-- ===========================================================================

-- 3 lini produk utama. Booksleeve & Keychain aktif=true state "Coming Soon" (sesuai PRD §4.2):
-- tampil di katalog tanpa varian/harga, tanpa CTA pembelian.
INSERT INTO public.products (slug, name, description, category)
VALUES
    ('sudoku', 'Prolog Sudoku', 'Buku puzzle reflektif & mindful break. Penawar sederhana dari doom-scrolling.', 'sudoku'),
    ('booksleeve', 'Prolog Booksleeve', 'Pelindung buku kustom material & warna. Segera hadir.', 'booksleeve'),
    ('keychain-reading-kit', 'Prolog Keychain Reading Kit', 'Aksesori membaca kustom modular. Segera hadir.', 'keychain')
ON CONFLICT (slug) DO NOTHING;

-- 4 SKU Phase 1: matriks Konten (Journaling/Pure) x Edisi (Monthly/Regular)
INSERT INTO public.product_variants (
    product_id, sku, name, content_axis, edition_axis, price, stock, weight_grams
)
SELECT
    p.id, v.sku::text, v.name, v.content_axis, v.edition_axis, v.price, v.stock, v.weight_grams
FROM public.products p
    JOIN (VALUES
        ('journaling', 'monthly', 'SDK-JRN-MTH', 'Prolog Sudoku Journaling - Monthly Edition',  69000.00, 200, 300),
        ('journaling', 'regular', 'SDK-JRN-REG', 'Prolog Sudoku Journaling - Regular Edition', 149000.00, 200, 850),
        ('pure',       'monthly', 'SDK-PUR-MTH', 'Prolog Sudoku Classic - Monthly Edition',   49000.00, 200, 300),
        ('pure',       'regular', 'SDK-PUR-REG', 'Prolog Sudoku Classic - Regular Edition',  119000.00, 200, 850)
    ) AS v(content_axis, edition_axis, sku, name, price, stock, weight_grams)
ON TRUE
WHERE p.slug = 'sudoku'
ON CONFLICT (sku) DO NOTHING;

-- ---------------------------------------------------------------------------
-- BOOTSTRAP SUPERADMIN PERTAMA
-- Type & ganti <uuid-akun-supabase> dengan id dari auth.users
-- (buat dulu akunnya via Supabase Dashboard.auth, lalu jalankan baris ini).
-- Admin berikutnya diangkat lewat dashboard /admin oleh superadmin.
-- ---------------------------------------------------------------------------
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<uuid-akun-supabase>', 'superadmin')
-- ON CONFLICT (user_id) DO NOTHING;
