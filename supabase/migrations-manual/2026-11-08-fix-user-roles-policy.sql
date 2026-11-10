-- Sprint 5 fix: FOR ALL policy pada user_roles (termasuk SELECT) memicu rekursi takhingga.
DROP POLICY IF EXISTS "Superadmin roles write" ON public.user_roles;
DROP FUNCTION IF EXISTS public.is_superadmin() CASCADE;

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
