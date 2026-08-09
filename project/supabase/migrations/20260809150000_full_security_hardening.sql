-- Server-owned account state. Authenticated users may only edit display_name.
REVOKE INSERT, DELETE ON public.profiles FROM anon, authenticated;
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;

-- Chart screenshots contain private financial information. Keep the bucket
-- private and allow access only inside the owner's UUID-prefixed folder.
UPDATE storage.buckets SET public = false WHERE id = 'charts';
UPDATE storage.buckets SET file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp']
WHERE id = 'charts';
DROP POLICY IF EXISTS "charts_public_read" ON storage.objects;
DROP POLICY IF EXISTS "charts_owner_read" ON storage.objects;
CREATE POLICY "charts_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'charts' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "charts_owner_insert" ON storage.objects;
CREATE POLICY "charts_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'charts' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "charts_owner_delete" ON storage.objects;
CREATE POLICY "charts_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'charts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- One-time reservations make quota enforcement happen before the costly AI
-- call. The per-minute ceiling protects paid accounts from token theft while
-- preserving unlimited daily usage.
CREATE TABLE IF NOT EXISTS public.analysis_request_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charged_free_quota boolean NOT NULL DEFAULT false,
  quota_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  succeeded boolean
);
CREATE INDEX IF NOT EXISTS idx_analysis_reservations_user_created
  ON public.analysis_request_reservations(user_id, created_at DESC);
ALTER TABLE public.analysis_request_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analysis_request_reservations FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.api_rate_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('payment_initialize','payment_verify','payment_manage')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_rate_events_user_action_created
  ON public.api_rate_events(user_id, action, created_at DESC);
ALTER TABLE public.api_rate_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.begin_analysis_request()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile public.profiles%ROWTYPE;
  reservation uuid;
  charge_free boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO current_profile FROM public.profiles
  WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Six starts per rolling minute and at most two unfinished requests.
  IF (SELECT count(*) FROM public.analysis_request_reservations
      WHERE user_id = auth.uid() AND created_at > now() - interval '1 minute') >= 6
     OR (SELECT count(*) FROM public.analysis_request_reservations
         WHERE user_id = auth.uid() AND completed_at IS NULL
           AND created_at > now() - interval '5 minutes') >= 2 THEN
    RETURN NULL;
  END IF;

  IF current_profile.plan = 'free' THEN
    IF current_profile.daily_usage_date <> current_date THEN
      UPDATE public.profiles SET daily_usage_date = current_date, daily_usage_count = 0
      WHERE id = auth.uid();
      current_profile.daily_usage_count := 0;
    END IF;
    IF current_profile.daily_usage_count >= 3 THEN RETURN NULL; END IF;
    UPDATE public.profiles SET daily_usage_count = daily_usage_count + 1
    WHERE id = auth.uid();
    charge_free := true;
  END IF;

  INSERT INTO public.analysis_request_reservations(user_id, charged_free_quota)
  VALUES (auth.uid(), charge_free) RETURNING id INTO reservation;
  RETURN reservation;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_analysis_request(reservation_id uuid, p_succeeded boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE item public.analysis_request_reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT * INTO item FROM public.analysis_request_reservations
  WHERE id = reservation_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR item.completed_at IS NOT NULL THEN RETURN false; END IF;

  UPDATE public.analysis_request_reservations
  SET completed_at = now(), succeeded = p_succeeded
  WHERE id = reservation_id;
  IF NOT p_succeeded AND item.charged_free_quota AND item.quota_date = current_date THEN
    UPDATE public.profiles SET daily_usage_count = greatest(0, daily_usage_count - 1)
    WHERE id = auth.uid() AND daily_usage_date = current_date;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_analysis_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finish_analysis_request(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_analysis_request() TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_analysis_request(uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.consume_analysis_quota() FROM authenticated;

-- Prevent a journal row from referencing another user's analysis.
CREATE OR REPLACE FUNCTION public.enforce_owned_journal_analysis()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.analysis_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chart_analyses
    WHERE id = NEW.analysis_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'analysis does not belong to journal owner';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS journal_analysis_owner_check ON public.journal_entries;
CREATE TRIGGER journal_analysis_owner_check
  BEFORE INSERT OR UPDATE OF analysis_id, user_id ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_owned_journal_analysis();
