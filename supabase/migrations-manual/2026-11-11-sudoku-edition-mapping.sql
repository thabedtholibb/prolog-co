/* Enforce Sudoku mapping: monthly = journaling, regular = pure. */
CREATE OR REPLACE FUNCTION public.validate_sudoku_variant_axes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $func$
DECLARE
    v_category TEXT;
BEGIN
    SELECT category INTO v_category FROM public.products WHERE id = NEW.product_id;
    IF v_category = 'sudoku'
       AND ((NEW.edition_axis = 'monthly' AND NEW.content_axis IS DISTINCT FROM 'journaling')
         OR (NEW.edition_axis = 'regular' AND NEW.content_axis IS DISTINCT FROM 'pure')) THEN
        RAISE EXCEPTION 'Monthly harus Journaling dan Reguler harus Murni Puzzle.' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS validate_sudoku_variant_axes ON public.product_variants;
CREATE TRIGGER validate_sudoku_variant_axes
    BEFORE INSERT OR UPDATE OF product_id, content_axis, edition_axis ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.validate_sudoku_variant_axes();

UPDATE public.product_variants v
SET aktif = false
FROM public.products p
WHERE p.id = v.product_id
  AND p.category = 'sudoku'
  AND ((v.edition_axis = 'monthly' AND v.content_axis IS DISTINCT FROM 'journaling')
    OR (v.edition_axis = 'regular' AND v.content_axis IS DISTINCT FROM 'pure'));

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

        IF v_category = 'sudoku'
           AND ((v_variant.edition_axis = 'monthly' AND v_variant.content_axis IS DISTINCT FROM 'journaling')
             OR (v_variant.edition_axis = 'regular' AND v_variant.content_axis IS DISTINCT FROM 'pure')) THEN
            RAISE EXCEPTION 'Monthly harus Journaling dan Reguler harus Murni Puzzle.' USING ERRCODE = '22023';
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

