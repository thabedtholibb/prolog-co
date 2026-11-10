/*
 * Order lifecycle: kadaluwarsa draft order + lacak pesanan + realtime.
 *
 * - orders.expires_at: draft order kedaluwarsa 24 jam (DEFAULT), jadi reservasi
 *   stok tidak ditahan selamanya.
 * - cancel_expired_orders(): melepas stok order pending_payment yang kedaluwarsa
 *   (restock lewat trigger trg_orders_restock). Dipanggil oportunistik di awal
 *   create_order, dan bisa dipanggil admin/cron.
 * - get_order(): lookup aman untuk guest dengan nomor pesanan + email.
 * - realtime: products & product_variants masuk publikasi supabase_realtime.
 *
 * Catatan: pg_cron belum tersedia di project ini (ekstensi tidak terpasang).
 * Pengamanan produksi penuh lewat Scheduled Edge Function menyusul bareng Sprint 4.
 */

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours');

/* Lepas reservasi draft order yang sudah lewat batas bayar. */
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
GRANT EXECUTE ON FUNCTION public.cancel_expired_orders() TO anon, authenticated;

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

/* Tambahkan rilis reservasi kedaluwarsa sebelum pengecekan stok di create_order. */
CREATE OR REPLACE FUNCTION public.create_order(
    p_customer_email TEXT,
    p_shipping_address JSONB,
    p_items JSONB,
    p_expected_total NUMERIC DEFAULT NULL,
    p_payment_gateway TEXT DEFAULT 'midtrans'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    c_flat_shipping CONSTANT NUMERIC := 15000; -- samakan dengan MIDTRANS.SHIPPING_FLAT
    v_item JSONB;
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
    IF p_payment_gateway IS DISTINCT FROM 'midtrans' THEN
        RAISE EXCEPTION 'Gateway pembayaran tidak dikenal.' USING ERRCODE = '22023';
    END IF;

    -- Lepas reservasi draft order yang sudah kedaluwarsa sebelum memesan stok baru.
    PERFORM public.cancel_expired_orders();

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

        UPDATE public.product_variants
        SET stock = stock - v_qty
        WHERE id = v_variant.id;

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

    v_total := v_subtotal + c_flat_shipping;

    IF p_expected_total IS NOT NULL AND round(p_expected_total, 2) <> round(v_total, 2) THEN
        RAISE EXCEPTION 'Total pesanan berubah. Muat ulang halaman lalu coba lagi.' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.orders (customer_email, shipping_address, total_amount, shipping_cost, payment_gateway)
    VALUES (btrim(p_customer_email), p_shipping_address, v_total, c_flat_shipping, p_payment_gateway)
    RETURNING * INTO v_order;

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
        'shipping_cost', v_order.shipping_cost,
        'total_amount', v_order.total_amount
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(TEXT, JSONB, JSONB, NUMERIC, TEXT) TO anon, authenticated;

/* Realtime: publikasikan tabel katalog agar storefront menyimak perubahan. */
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
