-- Enforce quota and protect subscription state on the server.
CREATE OR REPLACE FUNCTION public.consume_analysis_quota()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile public.profiles%ROWTYPE;
  plan_limit integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;

  SELECT * INTO current_profile
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF current_profile.plan IN ('pro', 'elite') THEN RETURN true; END IF;

  plan_limit := 3;
  IF current_profile.daily_usage_date <> current_date THEN
    UPDATE public.profiles
      SET daily_usage_date = current_date, daily_usage_count = 1
      WHERE id = auth.uid();
    RETURN true;
  END IF;

  IF current_profile.daily_usage_count >= plan_limit THEN RETURN false; END IF;
  UPDATE public.profiles
    SET daily_usage_count = daily_usage_count + 1
    WHERE id = auth.uid();
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_analysis_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_analysis_quota() TO authenticated;

-- Users may edit their display name, but plan and quota fields are server-owned.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
