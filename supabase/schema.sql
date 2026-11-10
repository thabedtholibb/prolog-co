-- ===========================================================================
-- Prolog.co — schema.sql (SOURCE OF TRUTH)
-- Per kontrak 05-backend-schema.md. Append-only via supabase/migrations/ setelah baseline ini.
-- ⚠️ WAJIB: sebelum deploy, verifikasi live DB identik dengan file ini:
--    supabase db diff  +  jalankan supabase/verify.sql
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. CUSTOMERS PROFILE (terhubung ke auth.users)
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
    -- Kategori bebas berupa slug: sudoku, booksleeve, keychain, notebook, dst.
    category TEXT NOT NULL CHECK (category ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 3. PRODUCT VARIANTS (semua kategori; sumbu konten/edisi hanya untuk sudoku)
--------------------------------------------------------------------------------
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE, -- SDK-JRN-MTH, SDK-JRN-REG, SDK-PUR-MTH, SDK-PUR-REG
    name TEXT NOT NULL,
    -- Sumbu konten/edisi hanya dipakai produk sudoku; varian lain boleh null.
    content_axis TEXT CHECK (content_axis IN ('journaling', 'pure')),
    edition_axis TEXT CHECK (edition_axis IN ('monthly', 'regular')),
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    weight_grams INT NOT NULL DEFAULT 300,
    gltf_asset_url TEXT,
    aktif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- 4. PRODUCT CONFIGURATIONS (Scaffold kosong untuk Phase 2 Booksleeve/Keychain)
--------------------------------------------------------------------------------
CREATE TABLE public.product_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,   -- e.g. "Material Canvas", "Custom Name Embroidery"
    option_name TEXT NOT NULL,  -- e.g. "Navy Canvas", "Gold Thread"
    price_delta NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    aktif BOOLEAN NOT NULL DEFAULT true
);

--------------------------------------------------------------------------------
-- 5. CARTS & CART ITEMS
-- ponytail: Phase 1 cart utama hidup di Zustand + localStorage (TRD §3.1).
-- Tabel ini scaffold utk sync server-side jika nanti dibutuhkan; jangan difill dulu.
--------------------------------------------------------------------------------
CREATE TABLE public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    session_id TEXT,
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
    currency TEXT NOT NULL DEFAULT 'IDR' CHECK (currency = 'IDR'), -- Phase 1 parked IDR; kolom siap untuk ekspansi tanpa refactor
    shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'processing', 'shipped', 'cancelled', 'completed')),
    payment_gateway TEXT CHECK (payment_gateway IN ('doit', 'midtrans')),
    payment_transaction_id TEXT,
    tracking_number TEXT,
    stock_returned BOOLEAN NOT NULL DEFAULT false,
    needs_manual_review BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'), -- draft order kedaluwarsa 24 jam
    idempotency_key TEXT, -- kunci deterministik cart+email; mencegah order dobel
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uidx ON public.orders (idempotency_key);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    sku TEXT NOT NULL,
    price_at_purchase NUMERIC(12,2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    options JSONB NOT NULL DEFAULT '{}'::jsonb  -- atribut tambahan (mis. {"month": "Desember 2026"})
);

CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE CHECK (code = upper(code) AND code ~ '^[A-Z0-9][A-Z0-9_-]{2,30}$'),
    discount_amount NUMERIC(12,2) NOT NULL CHECK (discount_amount > 0),
    minimum_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (minimum_subtotal >= 0),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ,
    max_redemptions INT CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    redemption_count INT NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);

CREATE TABLE public.promotion_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL CHECK (discount_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_webhook_events (
    provider TEXT NOT NULL CHECK (provider = 'doit'),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, event_id)
);
REVOKE ALL ON TABLE public.payment_webhook_events FROM anon, authenticated;
GRANT ALL ON TABLE public.payment_webhook_events TO service_role;

--------------------------------------------------------------------------------
-- 7. USER ROLES (Akses Dashboard Admin)
--------------------------------------------------------------------------------
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- HELPER FUNCTIONS
--------------------------------------------------------------------------------
-- Query tabel user_roles (bukan klaim JWT) agar perubahan role superadmin aktif seketika.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid());
END;
$$;

-- Insert pesanan dari storefront (anon). Harga & stok dihitung di server;
-- klien hanya mengirim variant_id, quantity, dan options.
-- (42501: anon insert + RETURNING ditolak policy SELECT "Customer own order read")
CREATE OR REPLACE FUNCTION public.create_order(
    p_customer_email TEXT,
    p_shipping_address JSONB,
    p_items JSONB,
    p_expected_total NUMERIC DEFAULT NULL,
    p_payment_gateway TEXT DEFAULT 'doit',
    p_idempotency_key TEXT DEFAULT NULL,
    p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    c_flat_shipping CONSTANT NUMERIC := 15000; -- ongkir flat saat ini
    v_item JSONB;
    v_line JSONB;
    v_variant public.product_variants%ROWTYPE;
    v_category TEXT;
    v_product_active BOOLEAN;
    v_qty INT;
    v_options JSONB;
    v_key TEXT;
    v_value JSONB;
    v_value_text TEXT;
    v_key_count INT;
    v_month TEXT;
    v_difficulty TEXT;
    v_subtotal NUMERIC := 0;
    v_discount NUMERIC := 0;
    v_promotion public.promotions%ROWTYPE;
    v_normalized_promo TEXT;
    v_total NUMERIC;
    v_order public.orders%ROWTYPE;
    v_lines JSONB := '[]'::jsonb;
BEGIN
    IF p_customer_email IS NULL
       OR btrim(p_customer_email) = ''
       OR p_customer_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'Email tidak valid.' USING ERRCODE = '22023';
    END IF;

    IF p_shipping_address IS NULL OR jsonb_typeof(p_shipping_address) <> 'object' THEN
        RAISE EXCEPTION 'Alamat pengiriman tidak valid.' USING ERRCODE = '22023';
    END IF;

    IF btrim(COALESCE(p_shipping_address->>'full_name', '')) = ''
       OR btrim(COALESCE(p_shipping_address->>'street', '')) = ''
       OR btrim(COALESCE(p_shipping_address->>'city', '')) = ''
       OR btrim(COALESCE(p_shipping_address->>'province', '')) = ''
       OR COALESCE(p_shipping_address->>'postal_code', '') !~ '^[0-9]{5}$' THEN
        RAISE EXCEPTION 'Alamat pengiriman belum lengkap.' USING ERRCODE = '22023';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Keranjang kosong.' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_items) > 20 THEN
        RAISE EXCEPTION 'Terlalu banyak baris pesanan.' USING ERRCODE = '22023';
    END IF;
    IF p_payment_gateway IS DISTINCT FROM 'doit' THEN
        RAISE EXCEPTION 'Gateway pembayaran tidak dikenal.' USING ERRCODE = '22023';
    END IF;

    -- Lepas reservasi draft order yang sudah kedaluwarsa sebelum memesan stok baru.
    PERFORM public.cancel_expired_orders();

    IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 2000 THEN
        RAISE EXCEPTION 'Kunci idempotensi terlalu panjang.' USING ERRCODE = '22023';
    END IF;

    -- Idempotensi: kunci sama mengembalikan order yang sudah ada, tanpa efek samping.
    IF p_idempotency_key IS NOT NULL THEN
        SELECT o.* INTO v_order
        FROM public.orders o
        WHERE o.idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'id', v_order.id,
                'order_number', v_order.order_number,
                'status', v_order.status,
                'subtotal', v_order.total_amount - v_order.shipping_cost,
                'discount_amount', v_order.discount_amount,
                'promo_code', v_order.promo_code,
                'shipping_cost', v_order.shipping_cost,
                'total_amount', v_order.total_amount
            );
        END IF;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF jsonb_typeof(v_item) <> 'object'
           OR COALESCE(v_item->>'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'Baris pesanan tidak valid.' USING ERRCODE = '22023';
        END IF;

        BEGIN
            v_qty := (v_item->>'quantity')::int;
        EXCEPTION WHEN others THEN
            RAISE EXCEPTION 'Jumlah item tidak valid.' USING ERRCODE = '22023';
        END;
        IF v_qty IS NULL OR v_qty < 1 OR v_qty > 10 THEN
            RAISE EXCEPTION 'Jumlah per item harus 1 sampai 10.' USING ERRCODE = '22023';
        END IF;

        SELECT v.* INTO v_variant
        FROM public.product_variants v
        WHERE v.id = (v_item->>'variant_id')::uuid
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Varian tidak ditemukan.' USING ERRCODE = '22023';
        END IF;
        IF NOT v_variant.aktif THEN
            RAISE EXCEPTION 'Varian % sudah tidak dijual.', v_variant.sku USING ERRCODE = '22023';
        END IF;

        SELECT p.category, p.aktif INTO v_category, v_product_active
        FROM public.products p
        WHERE p.id = v_variant.product_id;

        IF NOT FOUND OR NOT v_product_active THEN
            RAISE EXCEPTION 'Produk untuk varian % sudah tidak aktif.', v_variant.sku USING ERRCODE = '22023';
        END IF;

        v_options := COALESCE(v_item->'options', '{}'::jsonb);
        IF jsonb_typeof(v_options) <> 'object' THEN
            RAISE EXCEPTION 'Opsi varian tidak valid.' USING ERRCODE = '22023';
        END IF;

        SELECT count(*) INTO v_key_count FROM jsonb_object_keys(v_options);
        IF v_key_count > 10 THEN
            RAISE EXCEPTION 'Terlalu banyak opsi varian.' USING ERRCODE = '22023';
        END IF;

        FOR v_key, v_value IN SELECT e.key, e.value FROM jsonb_each(v_options) AS e LOOP
            IF v_key !~ '^[a-z0-9_]{1,30}$' OR jsonb_typeof(v_value) <> 'string' THEN
                RAISE EXCEPTION 'Opsi varian tidak valid.' USING ERRCODE = '22023';
            END IF;
            v_value_text := v_value #>> '{}';
            IF length(v_value_text) > 120 THEN
                RAISE EXCEPTION 'Nilai opsi varian terlalu panjang.' USING ERRCODE = '22023';
            END IF;
        END LOOP;

        IF v_category = 'sudoku' THEN
            v_difficulty := v_options->>'difficulty';
            IF v_difficulty IS NULL OR v_difficulty NOT IN ('easy', 'medium', 'hard') THEN
                RAISE EXCEPTION 'Level sudoku wajib dipilih.' USING ERRCODE = '22023';
            END IF;
            IF v_variant.edition_axis = 'monthly' THEN
                v_month := btrim(COALESCE(v_options->>'month', ''));
                IF v_month = '' THEN
                    RAISE EXCEPTION 'Bulan edisi monthly wajib dipilih.' USING ERRCODE = '22023';
                END IF;
            END IF;
        END IF;

        IF v_variant.stock < v_qty THEN
            RAISE EXCEPTION 'Stok % tinggal %.', v_variant.sku, v_variant.stock USING ERRCODE = 'P0001';
        END IF;

        v_subtotal := v_subtotal + (v_variant.price * v_qty);
        v_lines := v_lines || jsonb_build_array(
            jsonb_build_object(
                'variant_id', v_variant.id,
                'sku', v_variant.sku,
                'price', v_variant.price,
                'quantity', v_qty,
                'options', v_options
            )
        );
    END LOOP;

    v_normalized_promo := upper(btrim(COALESCE(p_promo_code, '')));
    IF v_normalized_promo <> '' THEN
        SELECT * INTO v_promotion
        FROM public.promotions
        WHERE code = v_normalized_promo
        FOR UPDATE;

        IF NOT FOUND OR NOT v_promotion.active
           OR v_promotion.starts_at > now()
           OR (v_promotion.ends_at IS NOT NULL AND v_promotion.ends_at <= now())
           OR (v_promotion.max_redemptions IS NOT NULL AND v_promotion.redemption_count >= v_promotion.max_redemptions)
           OR v_subtotal < v_promotion.minimum_subtotal THEN
            RAISE EXCEPTION 'Kode voucher tidak berlaku.' USING ERRCODE = 'P0001';
        END IF;

        v_discount := LEAST(v_promotion.discount_amount, v_subtotal);
    END IF;

    v_total := v_subtotal - v_discount + c_flat_shipping;

    IF p_expected_total IS NOT NULL AND round(p_expected_total, 2) <> round(v_total, 2) THEN
        RAISE EXCEPTION 'Total pesanan berubah. Muat ulang halaman lalu coba lagi.' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.orders (customer_email, shipping_address, total_amount, shipping_cost, discount_amount, promo_code, payment_gateway, idempotency_key)
    VALUES (btrim(p_customer_email), p_shipping_address, v_total, c_flat_shipping, v_discount, NULLIF(v_normalized_promo, ''), p_payment_gateway, p_idempotency_key)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING * INTO v_order;

    IF v_order.id IS NULL THEN
        -- Race: transaksi lain membuat order dengan kunci sama.
        SELECT o.* INTO v_order
        FROM public.orders o
        WHERE o.idempotency_key = p_idempotency_key;

        RETURN jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'status', v_order.status,
            'subtotal', v_order.total_amount - v_order.shipping_cost,
            'discount_amount', v_order.discount_amount,
            'promo_code', v_order.promo_code,
            'shipping_cost', v_order.shipping_cost,
            'total_amount', v_order.total_amount
        );
    END IF;

    IF v_promotion.id IS NOT NULL THEN
        INSERT INTO public.promotion_redemptions (promotion_id, order_id, code, discount_amount)
        VALUES (v_promotion.id, v_order.id, v_promotion.code, v_discount);
        UPDATE public.promotions
        SET redemption_count = redemption_count + 1, updated_at = now()
        WHERE id = v_promotion.id;
    END IF;

    -- Stok dikurangi hanya setelah order benar-benar dibuat (bukan di loop validasi).
    FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
        UPDATE public.product_variants
        SET stock = stock - (v_line->>'quantity')::int
        WHERE id = (v_line->>'variant_id')::uuid;
    END LOOP;

    INSERT INTO public.order_items (order_id, variant_id, sku, price_at_purchase, quantity, options)
    SELECT
        v_order.id,
        (line->>'variant_id')::uuid,
        line->>'sku',
        (line->>'price')::numeric,
        (line->>'quantity')::int,
        line->'options'
    FROM jsonb_array_elements(v_lines) AS line;

    RETURN jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'status', v_order.status,
        'subtotal', v_subtotal,
        'discount_amount', v_discount,
        'promo_code', NULLIF(v_normalized_promo, ''),
        'shipping_cost', v_order.shipping_cost,
        'total_amount', v_order.total_amount
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(TEXT, JSONB, JSONB, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(TEXT, JSONB, JSONB, NUMERIC, TEXT, TEXT, TEXT) TO anon, authenticated;

/* Lepas reservasi draft order yang sudah lewat batas bayar (restock lewat trigger). */
CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    WITH cancelled AS (
        UPDATE public.orders
        SET status = 'cancelled'
        WHERE status = 'pending_payment'
          AND expires_at IS NOT NULL
          AND expires_at < now()
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM cancelled;
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_expired_orders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_expired_orders() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_expired_orders() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
DO $$
DECLARE
    v_job_id BIGINT;
BEGIN
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'prolog-expire-orders';

    IF v_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_job_id);
    END IF;

    PERFORM cron.schedule(
        'prolog-expire-orders',
        '*/15 * * * *',
        'SELECT public.cancel_expired_orders();'
    );
END;
$$;

/* Lookup pesanan untuk guest: nomor pesanan + email, keduanya harus cocok. */
CREATE OR REPLACE FUNCTION public.get_order(p_order_number TEXT, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_items JSONB;
BEGIN
    IF p_order_number IS NULL OR btrim(p_order_number) = '' THEN
        RAISE EXCEPTION 'Nomor pesanan wajib diisi.' USING ERRCODE = '22023';
    END IF;
    IF p_email IS NULL OR btrim(p_email) = '' THEN
        RAISE EXCEPTION 'Email wajib diisi.' USING ERRCODE = '22023';
    END IF;

    SELECT o.* INTO v_order
    FROM public.orders o
    WHERE o.order_number = p_order_number
      AND lower(o.customer_email) = lower(btrim(p_email));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan tidak ditemukan. Periksa nomor pesanan dan email.' USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'sku', i.sku,
                'name', v.name,
                'options', i.options,
                'quantity', i.quantity,
                'price_at_purchase', i.price_at_purchase
            )
            ORDER BY i.sku
        ),
        '[]'::jsonb
    ) INTO v_items
    FROM public.order_items i
    LEFT JOIN public.product_variants v ON v.id = i.variant_id
    WHERE i.order_id = v_order.id;

    RETURN jsonb_build_object(
        'order_number', v_order.order_number,
        'status', v_order.status,
        'total_amount', v_order.total_amount,
        'shipping_cost', v_order.shipping_cost,
        'created_at', v_order.created_at,
        'expires_at', v_order.expires_at,
        'tracking_number', v_order.tracking_number,
        'items', v_items
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_order(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order(TEXT, TEXT) TO anon, authenticated;

/* Kembalikan stok sekali saat order dibatalkan (admin atau webhook). */
CREATE OR REPLACE FUNCTION public.restock_cancelled_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'cancelled'
       AND OLD.status IS DISTINCT FROM 'cancelled'
       AND NOT COALESCE(NEW.stock_returned, false) THEN
        UPDATE public.product_variants v
        SET stock = v.stock + returned.qty
        FROM (
            SELECT variant_id, SUM(quantity)::int AS qty
            FROM public.order_items
            WHERE order_id = NEW.id
            GROUP BY variant_id
        ) AS returned
        WHERE v.id = returned.variant_id;

        NEW.stock_returned := true;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_restock ON public.orders;
CREATE TRIGGER trg_orders_restock
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.restock_cancelled_order();

/* Process signed Doit events transactionally; duplicate event IDs are no-ops. */
CREATE OR REPLACE FUNCTION public.process_doit_payment_event(
    p_event_id TEXT,
    p_event_type TEXT,
    p_payment_id TEXT,
    p_reference TEXT,
    p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_inserted_event TEXT;
    v_item RECORD;
    v_stock INT;
    v_can_reserve BOOLEAN := true;
BEGIN
    IF p_event_id IS NULL OR btrim(p_event_id) = ''
       OR p_payment_id IS NULL OR btrim(p_payment_id) = ''
       OR p_reference IS NULL OR btrim(p_reference) = '' THEN
        RAISE EXCEPTION 'Webhook payment tidak lengkap.' USING ERRCODE = '22023';
    END IF;

    IF p_event_type NOT IN ('payment.paid', 'payment.expired') THEN
        RETURN jsonb_build_object('result', 'ignored');
    END IF;

    SELECT o.* INTO v_order
    FROM public.orders o
    WHERE o.order_number = p_reference
      AND o.payment_gateway = 'doit'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order Doit tidak ditemukan.' USING ERRCODE = 'P0001';
    END IF;
    IF p_amount IS NULL OR round(p_amount, 2) <> round(v_order.total_amount, 2) THEN
        RAISE EXCEPTION 'Nominal payment tidak cocok dengan order.' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.payment_webhook_events (provider, event_id, event_type, order_id)
    VALUES ('doit', p_event_id, p_event_type, v_order.id)
    ON CONFLICT (provider, event_id) DO NOTHING
    RETURNING event_id INTO v_inserted_event;

    IF v_inserted_event IS NULL THEN
        RETURN jsonb_build_object('result', 'duplicate');
    END IF;

    IF p_event_type = 'payment.expired' THEN
        IF v_order.status = 'pending_payment' THEN
            UPDATE public.orders
            SET status = 'cancelled', payment_transaction_id = p_payment_id
            WHERE id = v_order.id;
            RETURN jsonb_build_object('result', 'expired');
        END IF;
        RETURN jsonb_build_object('result', 'no_change');
    END IF;

    -- Doit can report payment.paid after expiry. Re-reserve released stock when
    -- possible; otherwise mark paid and surface a manual fulfillment hold.
    IF v_order.status = 'cancelled' AND v_order.stock_returned THEN
        FOR v_item IN
            SELECT variant_id, sum(quantity)::int AS quantity
            FROM public.order_items
            WHERE order_id = v_order.id
            GROUP BY variant_id
            ORDER BY variant_id
        LOOP
            SELECT v.stock INTO v_stock
            FROM public.product_variants v
            WHERE v.id = v_item.variant_id
            FOR UPDATE;

            IF NOT FOUND THEN
                v_can_reserve := false;
                EXIT;
            END IF;
            IF v_stock < v_item.quantity THEN
                v_can_reserve := false;
                EXIT;
            END IF;
        END LOOP;

        IF v_can_reserve THEN
            FOR v_item IN
                SELECT variant_id, sum(quantity)::int AS quantity
                FROM public.order_items
                WHERE order_id = v_order.id
                GROUP BY variant_id
                ORDER BY variant_id
            LOOP
                UPDATE public.product_variants
                SET stock = stock - v_item.quantity
                WHERE id = v_item.variant_id;
            END LOOP;

            UPDATE public.orders
            SET status = 'paid',
                payment_transaction_id = p_payment_id,
                stock_returned = false,
                needs_manual_review = false
            WHERE id = v_order.id;
            RETURN jsonb_build_object('result', 'paid', 'stock_reserved', true);
        END IF;

        UPDATE public.orders
        SET status = 'paid',
            payment_transaction_id = p_payment_id,
            needs_manual_review = true
        WHERE id = v_order.id;
        RETURN jsonb_build_object('result', 'paid', 'stock_reserved', false, 'manual_review', true);
    END IF;

    IF v_order.status = 'pending_payment' THEN
        UPDATE public.orders
        SET status = 'paid', payment_transaction_id = p_payment_id
        WHERE id = v_order.id;
        RETURN jsonb_build_object('result', 'paid', 'stock_reserved', true);
    END IF;

    RETURN jsonb_build_object('result', 'no_change');
END;
$$;

REVOKE ALL ON FUNCTION public.process_doit_payment_event(TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_doit_payment_event(TEXT, TEXT, TEXT, TEXT, NUMERIC) TO service_role;

-- Sprint 5: mapping email -> auth.users.id utk kelola admin (superadmin/admin saja).
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Hanya admin yang boleh mencari user';;
    END IF;
    RETURN QUERY SELECT u.id, u.email::text FROM auth.users u WHERE u.email = p_email LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_email FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO authenticated;

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--------------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

-- Katalog & varian: publik baca yang aktif, admin tulis.
CREATE POLICY "Public products read" ON public.products FOR SELECT USING (aktif = true);
CREATE POLICY "Admin products write" ON public.products FOR ALL USING (public.is_admin());

CREATE POLICY "Public variants read" ON public.product_variants FOR SELECT USING (aktif = true);
CREATE POLICY "Admin variants write" ON public.product_variants FOR ALL USING (public.is_admin());

-- ponytail: configurations kosong di Phase 1; policy mengikuti pola katalog agar scaffold tidak tiba-tiba terkunci.
CREATE POLICY "Public configurations read" ON public.product_configurations FOR SELECT USING (aktif = true);
CREATE POLICY "Admin configurations write" ON public.product_configurations FOR ALL USING (public.is_admin());

CREATE POLICY "Public active promotions read" ON public.promotions FOR SELECT
    USING (active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Admin promotions write" ON public.promotions FOR ALL USING (public.is_admin());

-- Customers: user hanya boleh melihat/mengubah profil sendiri.
CREATE POLICY "Customer own profile" ON public.customers FOR ALL
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin customers read" ON public.customers FOR SELECT USING (public.is_admin());

-- Orders: draft order HANYA lewat RPC create_order (harga & stok server-side).
-- Insert langsung ditolak supaya total tidak bisa diisi dari klien.
CREATE POLICY "Customer own order read" ON public.orders FOR SELECT
    USING (auth.uid() = customer_id OR public.is_admin());
CREATE POLICY "Admin orders write" ON public.orders FOR UPDATE USING (public.is_admin());

-- order_items ikut ditulis oleh create_order (SECURITY DEFINER), bukan anon.
CREATE POLICY "Order item read via order" ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND (auth.uid() = o.customer_id OR public.is_admin())
        )
    );
CREATE POLICY "Admin order items write" ON public.order_items FOR UPDATE USING (public.is_admin());

-- Carts: milik customer login; token guest dikelola client (scaffold).
CREATE POLICY "Customer own cart" ON public.carts FOR ALL
    USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Cart item via cart" ON public.cart_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.carts c
            WHERE c.id = cart_id AND (auth.uid() = c.customer_id OR public.is_admin())
        )
    );

-- user_roles: admin baca daftar admin; HANYA superadmin yang tulis.
CREATE POLICY "Admin roles read" ON public.user_roles FOR SELECT USING (public.is_admin());
-- FOR ALL mencakup SELECT dan USING-nya membaca user_roles -> rekursi takhingga.
-- Tulis dipisah per aksi; USING dalam inisiasi query-tabel yang sama pun aman karena
-- tanpa policy SELECT tambahan yang saling memanggil (is_admin SECURITY DEFINER = owner, bypass RLS).
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    );
$$;

CREATE POLICY "Superadmin roles insert" ON public.user_roles FOR INSERT
    WITH CHECK (public.is_superadmin());
CREATE POLICY "Superadmin roles update" ON public.user_roles FOR UPDATE
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
CREATE POLICY "Superadmin roles delete" ON public.user_roles FOR DELETE
    USING (public.is_superadmin());

/* Least-privilege table grants. RLS remains the row-level boundary. */
REVOKE ALL ON TABLE
    public.customers,
    public.products,
    public.product_variants,
    public.product_configurations,
    public.carts,
    public.cart_items,
    public.orders,
    public.order_items,
    public.user_roles,
    public.promotions,
    public.promotion_redemptions
FROM anon, authenticated;

GRANT SELECT ON TABLE
    public.products,
    public.product_variants,
    public.product_configurations,
    public.promotions
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
    public.products,
    public.product_variants,
    public.product_configurations,
    public.promotions
TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.orders, public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.promotions, public.promotion_redemptions TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ponytail: trigger updated_at() otomatis (customers, orders, carts) — 1 trigger, dipasang 3x.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON public.carts
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
