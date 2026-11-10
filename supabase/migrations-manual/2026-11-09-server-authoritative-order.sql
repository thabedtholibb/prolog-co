/*
 * Prioritas 1: order server-authoritative + stok.
 *
 * - Harga, subtotal, ongkir, dan total dihitung di server dari variant_id.
 * - Stok divalidasi + dikurangi dalam transaksi yang sama (row lock).
 * - order_items ditulis oleh fungsi, bukan klien.
 * - Insert langsung orders/order_items dicabut agar tidak ada jalur bypass harga.
 * - Status cancelled mengembalikan stok sekali (stock_returned).
 *
 * Catatan: reservasi stok dimulai saat draft order dibuat. Order pending yang
 * ditinggalkan akan dikembalikan lewat webhook expiry/cancel pada Sprint 4.
 */

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_returned BOOLEAN NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.create_order(TEXT, JSONB, NUMERIC, NUMERIC, TEXT);

DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order item" ON public.order_items;

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

REVOKE ALL ON FUNCTION public.create_order(TEXT, JSONB, JSONB, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(TEXT, JSONB, JSONB, NUMERIC, TEXT) TO anon, authenticated;

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
