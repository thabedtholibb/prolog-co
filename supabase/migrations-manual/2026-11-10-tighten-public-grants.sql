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
  public.user_roles
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.products,
  public.product_variants,
  public.product_configurations
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.products,
  public.product_variants,
  public.product_configurations
TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.orders, public.order_items TO authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
