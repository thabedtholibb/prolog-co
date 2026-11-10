-- F-AUD-1: INSERT order via anon + RETURNING gagal 42501 (policy SELECT menolak anon).
-- Solusi standar Supabase: RPC SECURITY DEFINER; client tak perlu membaca langsung.
CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_email TEXT,
  p_shipping_address JSONB,
  p_total_amount NUMERIC,
  p_shipping_cost NUMERIC,
  p_payment_gateway TEXT DEFAULT 'midtrans'
)
RETURNS public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.orders (customer_email, shipping_address, total_amount, shipping_cost, payment_gateway)
  VALUES (p_customer_email, p_shipping_address, p_total_amount, p_shipping_cost, p_payment_gateway)
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.create_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(TEXT, JSONB, NUMERIC, NUMERIC, TEXT) TO anon, authenticated;
