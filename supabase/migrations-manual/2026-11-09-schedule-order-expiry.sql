/* Run stock reservation expiry even when storefront is idle. */
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

REVOKE ALL ON FUNCTION public.cancel_expired_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_expired_orders() TO service_role;

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
