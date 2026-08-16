-- Security hardening (audit follow-up): stop an authenticated user from
-- writing directly to billing-controlled profile fields, and stop them from
-- deleting/editing their own AI usage log to dodge the monthly limit.
-- These must only ever be touched by trusted server-side code running as
-- service_role (e.g. logGeneration() today, a future Kirvano webhook
-- tomorrow) -- never by the end user's own session/JWT.

-- ---- profiles: plan/subscription columns become service_role-only ----
-- RLS still gates which ROW a user may touch (auth.uid() = id); this adds a
-- column-level privilege check on top, so an authenticated user can no
-- longer include plan/subscription_status/subscription_id/
-- subscription_expires_at in an UPDATE, no matter how the request is sent.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, default_tone, language, notifications_enabled, onboarding_completed)
  ON public.profiles TO authenticated;

-- ---- ai_generations: usage log becomes append-only for its owner ----
-- Selecting and inserting your own rows is unaffected (needed by
-- assertWithinLimit/getUsage and by logGeneration). Updating or deleting
-- them is revoked at the grant level and has no RLS policy left to permit
-- it, so both the SQL privilege check and the row-security check independently
-- block it.
REVOKE UPDATE, DELETE ON public.ai_generations FROM authenticated;
DROP POLICY IF EXISTS "own ai_generations" ON public.ai_generations;
CREATE POLICY "own ai_generations select" ON public.ai_generations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai_generations insert" ON public.ai_generations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
