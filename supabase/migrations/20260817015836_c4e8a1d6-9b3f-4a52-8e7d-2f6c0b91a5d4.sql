-- ============================================================
-- Fase 3.3 — Billing schema (subscriptions extension + billing_events)
--
-- Scope: schema/migration ONLY. No webhook endpoint, no checkout,
-- no renewal/cancellation/reactivation logic is implemented here.
--
-- Provenance of every field below: Fase 3.2.1 (documentary
-- investigation of Kirvano's public Help Center — no sandbox/test
-- account was available, so nothing here was confirmed by a live
-- webhook call). Officially confirmed event names:
--   SALE_APPROVED, SALE_REFUSED, SALE_CHARGEBACK, PIX_GENERATED,
--   PIX_EXPIRED, BANK_SLIP_GENERATED, BANK_SLIP_EXPIRED
-- Officially confirmed identifiers on a SALE_APPROVED payload:
--   checkout_id, sale_id (both belong to the SALE, not to "a
--   subscription" as a standalone entity).
-- Explicitly NOT confirmed by Kirvano (must not be assumed to
-- exist): subscription_id, event_id, webhook_id, transaction_id,
-- a dedicated renewal/cancellation/reactivation/expiration event,
-- whether sale_id/checkout_id change across renewals.
-- ============================================================

-- ============ subscriptions: extend existing table ============
-- subscriptions.id already is a VendAI-internal UUID (gen_random_uuid()),
-- generated in migration 20260816055630. It is NOT and must never become
-- a Kirvano-supplied identifier -- Kirvano has not confirmed it issues
-- any such id. checkout_id/sale_id below are stored as separate,
-- explicitly-labelled columns for exactly this reason.

ALTER TABLE public.subscriptions
  ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'ONE_TIME'
    CHECK (billing_type IN ('ONE_TIME', 'RECURRING')),
  ADD COLUMN amount NUMERIC(12,2),
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'BRL',
  ADD COLUMN next_charge_at TIMESTAMPTZ,
  ADD COLUMN checkout_id TEXT,
  ADD COLUMN sale_id TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.subscriptions.provider_subscription_id IS
  'Reserved for a provider-issued subscription identifier. Kirvano has '
  'NOT confirmed it issues one (Fase 3.2.1) -- do not populate this with '
  'Kirvano''s checkout_id or sale_id. Leave NULL for Kirvano-sourced rows '
  'until/unless Kirvano documentation or a sandbox test confirms such a '
  'field exists.';

COMMENT ON COLUMN public.subscriptions.checkout_id IS
  'Kirvano checkout_id from the SALE_APPROVED payload. Confirmed field, '
  'but it is NOT confirmed whether it stays stable across renewals '
  '(Fase 3.2.1).';

COMMENT ON COLUMN public.subscriptions.sale_id IS
  'Kirvano sale_id from the SALE_APPROVED payload. Identifies a SALE, '
  'not the subscription. It is NOT confirmed whether a new sale_id is '
  'issued per renewal (Fase 3.2.1).';

COMMENT ON COLUMN public.subscriptions.billing_type IS
  'VendAI-internal classification derived from the Kirvano payload''s '
  '"type" field (RECURRING) vs. a one-off purchase (ONE_TIME).';

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX subscriptions_sale_id_idx ON public.subscriptions(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX subscriptions_checkout_id_idx ON public.subscriptions(checkout_id) WHERE checkout_id IS NOT NULL;

-- No grant changes needed: authenticated already has SELECT-only access
-- (own row) from migration 20260816055630; only service_role may write.

-- ============ billing_events: audit history of provider events ============
-- Raw, append-only record of every billing-provider event received.
-- This is the "histórico/auditoria" layer; `subscriptions` remains the
-- "current state" layer. Nothing here is derived/aggregated automatically
-- -- that will be Fase 3.4's job (webhook processing, not implemented here).

CREATE TABLE public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'SALE_APPROVED', 'SALE_REFUSED', 'SALE_CHARGEBACK',
      'PIX_GENERATED', 'PIX_EXPIRED',
      'BANK_SLIP_GENERATED', 'BANK_SLIP_EXPIRED'
    )),
  sale_id TEXT,
  checkout_id TEXT,
  customer_email TEXT,
  status TEXT,
  raw_payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  idempotency_key TEXT
);

COMMENT ON TABLE public.billing_events IS
  'Append-only audit log of raw billing-provider webhook events. '
  'Population/processing is out of scope for Fase 3.3 (schema only) -- '
  'no webhook endpoint exists yet.';

COMMENT ON COLUMN public.billing_events.event_type IS
  'Restricted to the 7 event names officially confirmed for Kirvano in '
  'Fase 3.2.1. If a second provider or a newly-confirmed Kirvano event is '
  'integrated later, this CHECK constraint must be widened in a new '
  'migration -- do not relax it speculatively.';

COMMENT ON COLUMN public.billing_events.idempotency_key IS
  'VendAI-internal construct, NOT a value supplied by Kirvano (no '
  'event_id/webhook_id is confirmed to exist -- Fase 3.2.1). Left NULL '
  'until Fase 3.4 defines how it is derived. Whatever formula is chosen, '
  'it is a best-effort heuristic: Kirvano has not confirmed whether '
  'sale_id is stable/unique per delivery, so this key cannot be treated '
  'as a perfect duplicate-delivery guarantee. The partial unique index '
  'below only enforces uniqueness once a value is actually set.';

COMMENT ON COLUMN public.billing_events.customer_email IS
  'Used to correlate with profiles.email. Not a foreign key: profiles.email '
  'has no uniqueness constraint and a future webhook handler must reject '
  '(not auto-create) events whose email does not match an existing profile '
  '-- that matching logic is Fase 3.4 scope, not implemented here.';

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
-- Intentionally no policy and no GRANT for `authenticated` or `anon`: this
-- is a server-side audit trail, not user-owned data. Only service_role
-- (the future webhook handler) may read or write it.
GRANT ALL ON public.billing_events TO service_role;

CREATE INDEX billing_events_sale_id_idx ON public.billing_events(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX billing_events_checkout_id_idx ON public.billing_events(checkout_id) WHERE checkout_id IS NOT NULL;
CREATE INDEX billing_events_customer_email_idx ON public.billing_events(customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX billing_events_event_type_idx ON public.billing_events(event_type);
CREATE INDEX billing_events_received_at_idx ON public.billing_events(received_at DESC);
CREATE UNIQUE INDEX billing_events_idempotency_key_uidx
  ON public.billing_events(idempotency_key) WHERE idempotency_key IS NOT NULL;
