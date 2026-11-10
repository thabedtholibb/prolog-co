-- Sprint 5: AdminRoles perlu mapping email -> auth.users.id dari client.
-- SECURITY DEFINER dengan guard is_admin di dalam; anon dilarang.
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Hanya admin yang boleh mencari user';
    END IF;
    RETURN QUERY SELECT u.id, u.email::text FROM auth.users u WHERE u.email = p_email LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_email FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO authenticated;
