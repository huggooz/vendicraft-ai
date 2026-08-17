import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleKirvanoWebhook, type AdminClient } from "../kirvano-webhook.server";
import { KIRVANO_PRODUCT_PLAN_MAP } from "../kirvano.schema";
import { createFakeSupabase } from "./fake-supabase";

// No Kirvano sandbox/test account was available for this phase (Fase 3.2.1
// confirmed none exists), so these are local unit/integration tests against
// a fake in-memory Supabase client and payloads constructed strictly from
// the fields Fase 3.2.1/3.4 confirmed Kirvano actually sends. They do not
// make any real network call to Kirvano.

const PROFILE = { id: "user-1", email: "cliente@example.com" };
const TEST_PRODUCT_ID = "test-product-id";

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://vendai.example/api/webhooks/kirvano", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function baseSaleApprovedPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: "SALE_APPROVED",
    type: "ONE_TIME",
    status: "APPROVED",
    checkout_id: "checkout-123",
    sale_id: "sale-123",
    customer: { email: PROFILE.email },
    products: [{ id: TEST_PRODUCT_ID }],
    plan: {
      name: "Plano Pro",
      charge_frequency: "MONTHLY",
      next_charge_date: "2026-09-16 10:00:00",
    },
    total_price: 39.9,
    created_at: "2026-08-16 10:00:00",
    ...overrides,
  };
}

describe("handleKirvanoWebhook", () => {
  // SALE_APPROVED plan-mapping tests need a resolvable product -> plan
  // mapping. KIRVANO_PRODUCT_PLAN_MAP is deliberately empty in production
  // (no real Kirvano product exists yet -- Fase 3.2). We inject a mapping
  // only for the duration of these tests to simulate that config existing,
  // then remove it, since it's the one thing the module exports mutable.
  beforeEach(() => {
    KIRVANO_PRODUCT_PLAN_MAP[TEST_PRODUCT_ID] = "pro";
  });
  afterEach(() => {
    delete KIRVANO_PRODUCT_PLAN_MAP[TEST_PRODUCT_ID];
  });

  it("1. SALE_APPROVED válido: cria subscription e atualiza profile", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const res = await handleKirvanoWebhook(postRequest(baseSaleApprovedPayload()), {
      supabase: fake as unknown as AdminClient,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ processed: true, reason: "subscription_synced" });
    expect(fake.state.subscriptions).toHaveLength(1);
    expect(fake.state.subscriptions[0]).toMatchObject({
      user_id: "user-1",
      plan: "pro",
      status: "active",
      provider: "kirvano",
      provider_subscription_id: null,
      billing_type: "ONE_TIME",
      sale_id: "sale-123",
      checkout_id: "checkout-123",
    });
    expect(fake.state.profiles[0]).toMatchObject({ plan: "pro", subscription_status: "active" });
    expect(fake.state.billing_events).toHaveLength(1);
    expect(fake.state.billing_events[0]).toMatchObject({
      event_type: "SALE_APPROVED",
      processing_status: "processed",
    });
  });

  it("2. SALE_REFUSED: registra evento, não concede acesso", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const payload = baseSaleApprovedPayload({ event: "SALE_REFUSED", status: "REFUSED" });
    const res = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reason).toBe("recorded_no_commercial_action");
    expect(fake.state.subscriptions).toHaveLength(0);
    expect(fake.state.profiles[0]).not.toHaveProperty("plan");
    expect(fake.state.billing_events[0]).toMatchObject({
      event_type: "SALE_REFUSED",
      processing_status: "processed",
    });
  });

  it("3. SALE_CHARGEBACK: registra evento, sem revogação automática (política não aprovada)", async () => {
    const fake = createFakeSupabase({
      profiles: [PROFILE],
      subscriptions: [
        { id: "sub-1", user_id: "user-1", provider: "kirvano", status: "active", plan: "pro" },
      ],
    });
    const payload = baseSaleApprovedPayload({ event: "SALE_CHARGEBACK", status: "CHARGEBACK" });
    const res = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reason).toBe("recorded_no_commercial_action");
    // Existing subscription must be untouched -- no revocation policy implemented.
    expect(fake.state.subscriptions[0]).toMatchObject({ status: "active" });
    expect(fake.state.billing_events[0]).toMatchObject({
      event_type: "SALE_CHARGEBACK",
      processing_status: "processed",
    });
  });

  it("4. PIX_GENERATED: apenas registrado, sem acesso concedido", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const payload = baseSaleApprovedPayload({ event: "PIX_GENERATED", status: "PENDING" });
    const res = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });

    expect(res.status).toBe(200);
    expect(fake.state.subscriptions).toHaveLength(0);
    expect(fake.state.billing_events[0]).toMatchObject({
      event_type: "PIX_GENERATED",
      processing_status: "processed",
    });
  });

  it("5. PIX_EXPIRED: apenas registrado, não interpretado como expiração de assinatura", async () => {
    const fake = createFakeSupabase({
      profiles: [PROFILE],
      subscriptions: [
        { id: "sub-1", user_id: "user-1", provider: "kirvano", status: "active", plan: "pro" },
      ],
    });
    const payload = baseSaleApprovedPayload({ event: "PIX_EXPIRED", status: "EXPIRED" });
    const res = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });

    expect(res.status).toBe(200);
    expect(fake.state.subscriptions[0]).toMatchObject({ status: "active" });
  });

  it("6. BANK_SLIP_GENERATED: apenas registrado", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const payload = baseSaleApprovedPayload({ event: "BANK_SLIP_GENERATED", status: "PENDING" });
    const res = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });

    expect(res.status).toBe(200);
    expect(fake.state.billing_events[0]).toMatchObject({ event_type: "BANK_SLIP_GENERATED" });
  });

  it("7. BANK_SLIP_EXPIRED: apenas registrado, não interpretado como expiração de assinatura", async () => {
    const fake = createFakeSupabase({
      profiles: [PROFILE],
      subscriptions: [
        { id: "sub-1", user_id: "user-1", provider: "kirvano", status: "active", plan: "pro" },
      ],
    });
    const payload = baseSaleApprovedPayload({ event: "BANK_SLIP_EXPIRED", status: "EXPIRED" });
    const res = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });

    expect(res.status).toBe(200);
    expect(fake.state.subscriptions[0]).toMatchObject({ status: "active" });
  });

  it("8. email inexistente: evento registrado como ignored, nenhuma conta criada/adivinhada", async () => {
    const fake = createFakeSupabase({ profiles: [] });
    const res = await handleKirvanoWebhook(postRequest(baseSaleApprovedPayload()), {
      supabase: fake as unknown as AdminClient,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reason).toBe("no_matching_account");
    expect(fake.state.profiles).toHaveLength(0);
    expect(fake.state.subscriptions).toHaveLength(0);
    expect(fake.state.billing_events[0]).toMatchObject({
      processing_status: "ignored",
      error_message: "no_matching_profile_email",
    });
  });

  it("9. payload inválido: rejeitado com 400, nada é persistido", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const res = await handleKirvanoWebhook(
      postRequest({ event: "SALE_APPROVED" /* missing customer.email */ }),
      {
        supabase: fake as unknown as AdminClient,
      },
    );

    expect(res.status).toBe(400);
    expect(fake.state.billing_events).toHaveLength(0);
  });

  it("10. evento duplicado: segunda entrega idêntica não reprocessa", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const payload = baseSaleApprovedPayload();
    const first = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });
    const second = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.reason).toBe("duplicate_event");
    expect(fake.state.billing_events).toHaveLength(1);
    expect(fake.state.subscriptions).toHaveLength(1);
  });

  it("11. autenticação inválida: rejeitada quando KIRVANO_WEBHOOK_TOKEN está configurado", async () => {
    process.env["KIRVANO_WEBHOOK_TOKEN"] = "secret-token";
    try {
      const fake = createFakeSupabase({ profiles: [PROFILE] });
      const res = await handleKirvanoWebhook(
        postRequest(baseSaleApprovedPayload(), { authorization: "Bearer wrong" }),
        {
          supabase: fake as unknown as AdminClient,
        },
      );
      expect(res.status).toBe(401);
      expect(fake.state.billing_events).toHaveLength(0);

      const ok = await handleKirvanoWebhook(
        postRequest(baseSaleApprovedPayload(), { authorization: "Bearer secret-token" }),
        {
          supabase: fake as unknown as AdminClient,
        },
      );
      expect(ok.status).toBe(200);
    } finally {
      delete process.env["KIRVANO_WEBHOOK_TOKEN"];
    }
  });

  it("12. evento não suportado (ex.: SALE_RENEWED): reconhecido mas não processado nem persistido", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const payload = baseSaleApprovedPayload({ event: "SALE_RENEWED" });
    const res = await handleKirvanoWebhook(postRequest(payload), {
      supabase: fake as unknown as AdminClient,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reason).toBe("unsupported_event_type");
    expect(fake.state.billing_events).toHaveLength(0);
    expect(fake.state.subscriptions).toHaveLength(0);
  });

  it("13. SALE_APPROVED RECURRING: billing_type = RECURRING, sem tratar como renovação", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const payload = baseSaleApprovedPayload({ type: "RECURRING" });
    await handleKirvanoWebhook(postRequest(payload), { supabase: fake as unknown as AdminClient });

    expect(fake.state.subscriptions[0]).toMatchObject({ billing_type: "RECURRING" });
  });

  it("14. SALE_APPROVED ONE_TIME: billing_type = ONE_TIME", async () => {
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const payload = baseSaleApprovedPayload({ type: "ONE_TIME" });
    await handleKirvanoWebhook(postRequest(payload), { supabase: fake as unknown as AdminClient });

    expect(fake.state.subscriptions[0]).toMatchObject({ billing_type: "ONE_TIME" });
  });

  it("SALE_APPROVED sem mapeamento de produto configurado: registrado mas não sincronizado (não inventa plano)", async () => {
    delete KIRVANO_PRODUCT_PLAN_MAP[TEST_PRODUCT_ID]; // simulate today's real (empty) mapping
    const fake = createFakeSupabase({ profiles: [PROFILE] });
    const res = await handleKirvanoWebhook(postRequest(baseSaleApprovedPayload()), {
      supabase: fake as unknown as AdminClient,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reason).toBe("unmapped_product");
    expect(fake.state.subscriptions).toHaveLength(0);
    expect(fake.state.billing_events[0]).toMatchObject({
      processing_status: "failed",
      error_message: "no_product_plan_mapping_configured",
    });
  });

  it("rejeita método HTTP diferente de POST", async () => {
    const fake = createFakeSupabase();
    const res = await handleKirvanoWebhook(
      new Request("https://vendai.example/api/webhooks/kirvano", { method: "GET" }),
      { supabase: fake as unknown as AdminClient },
    );
    expect(res.status).toBe(405);
  });

  it("rejeita content-type diferente de application/json", async () => {
    const fake = createFakeSupabase();
    const res = await handleKirvanoWebhook(
      new Request("https://vendai.example/api/webhooks/kirvano", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "not json",
      }),
      { supabase: fake as unknown as AdminClient },
    );
    expect(res.status).toBe(400);
  });
});
