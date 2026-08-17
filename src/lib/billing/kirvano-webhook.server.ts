import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  KIRVANO_EVENT_TYPES,
  computeIdempotencyKey,
  isKnownKirvanoEvent,
  kirvanoWebhookShapeSchema,
  parseDateOrNull,
  resolvePlanFromProducts,
} from "./kirvano.schema";

export type AdminClient = SupabaseClient<Database>;

const MAX_BODY_BYTES = 256 * 1024;

// Events that Fase 3.4 confirms should be recorded for audit but must NOT
// mutate commercial state (subscriptions/profiles). SALE_CHARGEBACK is
// included here because no automatic-revocation policy has been explicitly
// approved in the project context available to this phase -- see the
// Fase 3.4 report, section "SALE_CHARGEBACK".
const RECORD_ONLY_EVENTS = new Set([
  "SALE_REFUSED",
  "SALE_CHARGEBACK",
  "PIX_GENERATED",
  "PIX_EXPIRED",
  "BANK_SLIP_GENERATED",
  "BANK_SLIP_EXPIRED",
]);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Kirvano's Help Center confirms only that an optional token exists "used to
 * authenticate messages" -- it does NOT confirm whether it is sent as a
 * header, in the body, or something else (Fase 3.2.1). Rather than invent a
 * specific header name, this checks the two least-invented possibilities:
 * a `token` field in the JSON body (the literal label Kirvano's own webhook
 * config screen uses) and a standard `Authorization: Bearer` header (the
 * convention already used elsewhere in this codebase, see client.server.ts).
 *
 * If KIRVANO_WEBHOOK_TOKEN is not configured (true today -- no such secret
 * exists anywhere in this project), authentication is skipped entirely and
 * a warning is logged. This is a known, documented gap, not a silent one.
 */
function isAuthorized(request: Request, rawBody: unknown): boolean {
  const expected = process.env["KIRVANO_WEBHOOK_TOKEN"];
  if (!expected) {
    console.warn(
      "[kirvano-webhook] KIRVANO_WEBHOOK_TOKEN is not configured -- accepting request without authentication. " +
        "Kirvano's exact auth mechanism is unconfirmed (Fase 3.2.1); this must be resolved before relying on this endpoint in production.",
    );
    return true;
  }
  const header = request.headers.get("authorization");
  const headerToken = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : undefined;
  const bodyToken =
    rawBody != null && typeof rawBody === "object" && "token" in rawBody
      ? (rawBody as { token?: unknown }).token
      : undefined;
  return headerToken === expected || bodyToken === expected;
}

export async function handleKirvanoWebhook(
  request: Request,
  deps: { supabase: AdminClient },
): Promise<Response> {
  const { supabase } = deps;

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return jsonResponse(400, { error: "invalid_content_type" });
  }

  const rawText = await request.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: "payload_too_large" });
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  if (!isAuthorized(request, rawBody)) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  const shapeResult = kirvanoWebhookShapeSchema.safeParse(rawBody);
  if (!shapeResult.success) {
    console.error(
      "[kirvano-webhook] payload failed structural validation",
      shapeResult.error.issues,
    );
    return jsonResponse(400, { error: "invalid_payload" });
  }
  const payload = shapeResult.data;
  const email = payload.customer.email.trim().toLowerCase();

  // Unsupported event: acknowledged with 200 (so Kirvano does not retry
  // indefinitely) but NOT written to billing_events -- the table's
  // event_type CHECK constraint (Fase 3.3) only allows the confirmed 7
  // events by design, and this phase is not authorized to widen it. This is
  // a known, documented audit gap (see Fase 3.4 report), not a silent drop:
  // it is logged server-side.
  if (!isKnownKirvanoEvent(payload.event)) {
    console.warn(`[kirvano-webhook] unsupported event_type received: ${payload.event}`, {
      known: KIRVANO_EVENT_TYPES,
    });
    return jsonResponse(200, {
      received: true,
      processed: false,
      reason: "unsupported_event_type",
    });
  }
  const eventType = payload.event;

  const idempotencyKey = computeIdempotencyKey(payload);
  if (!idempotencyKey) {
    console.warn(
      `[kirvano-webhook] event ${eventType} has no sale_id -- duplicate delivery cannot be detected for this event`,
    );
  }

  const insertResult = await supabase
    .from("billing_events")
    .insert({
      provider: "kirvano",
      event_type: eventType,
      sale_id: payload.sale_id ?? null,
      checkout_id: payload.checkout_id ?? null,
      customer_email: email,
      status: payload.status ?? null,
      raw_payload: rawBody as never,
      processing_status: "pending",
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (insertResult.error) {
    // Unique-violation on the partial index over idempotency_key: a prior
    // delivery already recorded this exact (event, sale_id, status) combo.
    // This is only as reliable as sale_id itself -- see kirvano.schema.ts.
    if (insertResult.error.code === "23505") {
      return jsonResponse(200, { received: true, processed: false, reason: "duplicate_event" });
    }
    console.error("[kirvano-webhook] failed to record billing_event", insertResult.error);
    return jsonResponse(500, { error: "internal_error" });
  }

  const billingEventId = insertResult.data.id;

  const finish = async (
    processingStatus: "processed" | "failed" | "ignored",
    errorMessage: string | null,
  ) => {
    const { error } = await supabase
      .from("billing_events")
      .update({
        processing_status: processingStatus,
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", billingEventId);
    if (error) console.error("[kirvano-webhook] failed to finalize billing_event", error);
  };

  if (RECORD_ONLY_EVENTS.has(eventType)) {
    await finish("processed", null);
    return jsonResponse(200, {
      received: true,
      processed: true,
      reason: "recorded_no_commercial_action",
    });
  }

  // From here on, eventType === "SALE_APPROVED".
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("[kirvano-webhook] failed to look up profile", profileError);
    await finish("failed", "profile_lookup_error");
    return jsonResponse(500, { error: "internal_error" });
  }

  if (!profile) {
    // Explicitly do NOT create an account and do NOT guess another one.
    await finish("ignored", "no_matching_profile_email");
    return jsonResponse(200, { received: true, processed: false, reason: "no_matching_account" });
  }

  const resolvedPlan = resolvePlanFromProducts(payload.products);
  if (!resolvedPlan) {
    // No product/offer -> plan mapping is configured yet (Fase 3.2 confirmed
    // no real Kirvano product exists). Recorded, but deliberately not
    // synced into subscriptions/profiles rather than guessing a plan.
    await finish("failed", "no_product_plan_mapping_configured");
    return jsonResponse(200, { received: true, processed: false, reason: "unmapped_product" });
  }

  const billingType = payload.type === "RECURRING" ? "RECURRING" : "ONE_TIME";
  const amount =
    typeof payload.total_price === "number"
      ? payload.total_price
      : typeof payload.total_price === "string" && payload.total_price.trim() !== ""
        ? (Number(payload.total_price) as number) || null
        : null;
  const nextChargeAt = parseDateOrNull(payload.plan?.next_charge_date);
  const startedAt = parseDateOrNull(payload.created_at) ?? new Date().toISOString();

  const { data: existingSubscription, error: subLookupError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", profile.id)
    .eq("provider", "kirvano")
    .eq("status", "active")
    .maybeSingle();

  if (subLookupError) {
    console.error("[kirvano-webhook] failed to look up subscription", subLookupError);
    await finish("failed", "subscription_lookup_error");
    return jsonResponse(500, { error: "internal_error" });
  }

  // NOTE (Fase 3.4 design choice, not a Kirvano-confirmed behavior): a
  // SALE_APPROVED for a user with an existing active Kirvano subscription
  // refreshes that row in place; otherwise a new row is created. This is
  // deliberately agnostic about whether the event is "the initial purchase"
  // or "a renewal" (Fase 3.2.1 confirmed neither), and keeps `subscriptions`
  // representing current state per the Fase 3.3 architecture. It is not
  // safe against two concurrent SALE_APPROVED deliveries for the same user
  // racing past this lookup -- there is no DB-level uniqueness forcing one
  // active subscription per user (a deliberate Fase 3.3 decision) and no
  // multi-statement transaction here (supabase-js/PostgREST does not offer
  // one) -- see the Fase 3.4 report's Idempotência section.
  const subscriptionRow = {
    plan: resolvedPlan,
    status: "active",
    provider: "kirvano",
    // Never populate with Kirvano data: Kirvano has not confirmed it issues
    // a subscription identifier (Fase 3.2.1).
    provider_subscription_id: null,
    billing_type: billingType,
    amount,
    currency: "BRL",
    checkout_id: payload.checkout_id ?? null,
    sale_id: payload.sale_id ?? null,
    next_charge_at: nextChargeAt,
    raw_payload: rawBody as never,
  };

  let subscriptionId: string;
  if (existingSubscription) {
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(subscriptionRow)
      .eq("id", existingSubscription.id);
    if (updateError) {
      console.error("[kirvano-webhook] failed to update subscription", updateError);
      await finish("failed", "subscription_update_error");
      return jsonResponse(500, { error: "internal_error" });
    }
    subscriptionId = existingSubscription.id;
  } else {
    const { data: inserted, error: insertSubError } = await supabase
      .from("subscriptions")
      .insert({ ...subscriptionRow, user_id: profile.id, started_at: startedAt })
      .select("id")
      .single();
    if (insertSubError || !inserted) {
      console.error("[kirvano-webhook] failed to create subscription", insertSubError);
      await finish("failed", "subscription_insert_error");
      return jsonResponse(500, { error: "internal_error" });
    }
    subscriptionId = inserted.id;
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      plan: resolvedPlan,
      subscription_status: "active",
      subscription_id: subscriptionId,
      subscription_expires_at: nextChargeAt,
    })
    .eq("id", profile.id);

  if (profileUpdateError) {
    console.error("[kirvano-webhook] failed to update profile cache", profileUpdateError);
    await finish("failed", "profile_update_error");
    return jsonResponse(500, { error: "internal_error" });
  }

  await finish("processed", null);
  return jsonResponse(200, { received: true, processed: true, reason: "subscription_synced" });
}
