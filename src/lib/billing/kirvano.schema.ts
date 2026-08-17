import { z } from "zod";
import type { PlanId } from "@/lib/constants";

// Confirmed by Fase 3.2.1 (documentary investigation of Kirvano's public
// Help Center; no sandbox/test account was ever available) and reiterated
// in the Fase 3.4 authorization. Do NOT add event names here unless a new
// investigation confirms them -- this list must match the CHECK constraint
// on public.billing_events.event_type (Fase 3.3 migration).
export const KIRVANO_EVENT_TYPES = [
  "SALE_APPROVED",
  "SALE_REFUSED",
  "SALE_CHARGEBACK",
  "PIX_GENERATED",
  "PIX_EXPIRED",
  "BANK_SLIP_GENERATED",
  "BANK_SLIP_EXPIRED",
] as const;

export type KirvanoEventType = (typeof KIRVANO_EVENT_TYPES)[number];

export function isKnownKirvanoEvent(value: string): value is KirvanoEventType {
  return (KIRVANO_EVENT_TYPES as readonly string[]).includes(value);
}

// Structural shape confirmed for a SALE_APPROVED payload (Fase 3.2.1 /
// Fase 3.4 authorization). `.passthrough()` everywhere: we only assert what
// we actually rely on and never reject a real payload just because it has
// extra fields we don't understand yet.
const kirvanoProductSchema = z
  .object({
    id: z.string().optional(),
    offer_id: z.string().optional(),
  })
  .passthrough();

const kirvanoPlanSchema = z
  .object({
    name: z.string().optional(),
    charge_frequency: z.string().optional(),
    next_charge_date: z.string().optional(),
  })
  .passthrough();

const kirvanoCustomerSchema = z
  .object({
    email: z.string().trim().min(1).email(),
  })
  .passthrough();

export const kirvanoWebhookShapeSchema = z
  .object({
    event: z.string().min(1),
    type: z.string().optional(),
    status: z.string().optional(),
    checkout_id: z.string().optional(),
    sale_id: z.string().optional(),
    customer: kirvanoCustomerSchema,
    products: z.array(kirvanoProductSchema).optional(),
    plan: kirvanoPlanSchema.optional(),
    total_price: z.union([z.number(), z.string()]).optional(),
    created_at: z.string().optional(),
    // Location of Kirvano's optional webhook token is NOT confirmed (Fase
    // 3.2.1/3.4). This field is accepted defensively in case it is sent in
    // the body -- see kirvano-webhook.server.ts for the full caveat.
    token: z.string().optional(),
  })
  .passthrough();

export type KirvanoWebhookPayload = z.infer<typeof kirvanoWebhookShapeSchema>;

/**
 * VendAI-internal idempotency heuristic, NOT a guarantee from Kirvano.
 *
 * Kirvano has not confirmed the existence of event_id/webhook_id/
 * transaction_id, nor whether sale_id is stable across retries vs. unique
 * per renewal (Fase 3.2.1). This key can only be computed when sale_id is
 * present; when it is absent, duplicate detection is not possible and the
 * event is recorded without that protection (see kirvano-webhook.server.ts).
 *
 * Fields deliberately excluded: created_at/timestamps (could differ between
 * an original delivery and a retry), checkout_id (less specific than
 * sale_id for a single sale event).
 */
export function computeIdempotencyKey(
  payload: Pick<KirvanoWebhookPayload, "event" | "sale_id" | "status">,
): string | null {
  if (!payload.sale_id) return null;
  return `kirvano:${payload.event}:${payload.sale_id}:${payload.status ?? "unknown"}`;
}

/**
 * Kirvano product/offer id -> VendAI internal plan id.
 *
 * Deliberately EMPTY: Fase 3.2 confirmed VendAI has no real Kirvano
 * checkout/products configured yet, so there are no real product/offer IDs
 * to map. Do not invent placeholder IDs here -- fill this in once VendAI's
 * actual Kirvano offers exist. Until then, every SALE_APPROVED event is
 * recorded in billing_events but cannot be synced into subscriptions/
 * profiles (see kirvano-webhook.server.ts).
 */
export const KIRVANO_PRODUCT_PLAN_MAP: Partial<Record<string, PlanId>> = {};

export function resolvePlanFromProducts(
  products: KirvanoWebhookPayload["products"],
): PlanId | null {
  if (!products) return null;
  for (const product of products) {
    if (product.id && KIRVANO_PRODUCT_PLAN_MAP[product.id])
      return KIRVANO_PRODUCT_PLAN_MAP[product.id]!;
    if (product.offer_id && KIRVANO_PRODUCT_PLAN_MAP[product.offer_id])
      return KIRVANO_PRODUCT_PLAN_MAP[product.offer_id]!;
  }
  return null;
}

export function parseDateOrNull(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
