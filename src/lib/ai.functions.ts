import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, extractJson } from "@/lib/ai/gateway.server";
import {
  BASE_RULES,
  assertWithinLimit,
  buildBusinessContext,
  logGeneration,
} from "@/lib/ai/context.server";
import type { ConversationAnalysis, OfferResult, UsageSummary } from "@/lib/ai/types";

const analyzeSchema = z.object({
  conversation: z.string().min(10),
  leadId: z.string().uuid().nullish(),
});
const replySchema = z.object({
  goal: z.string(),
  customerMessage: z.string().min(2),
  extraContext: z.string().optional().default(""),
  variant: z.string().optional().default(""),
});
const followUpSchema = z.object({
  customerName: z.string().min(1),
  context: z.string().optional().default(""),
  lastContactDate: z.string().optional().default(""),
  reason: z.string().optional().default(""),
  goal: z.string().optional().default(""),
  style: z.string().default("amigavel"),
});
const offerSchema = z.object({
  productName: z.string().min(1),
  currentPrice: z.string().optional().default(""),
  discount: z.string().optional().default(""),
  audience: z.string().optional().default(""),
  campaignGoal: z.string().optional().default(""),
  deadline: z.string().optional().default(""),
});

// Valida a estrutura da resposta JSON da IA antes de persistir/retornar ao frontend.
// extractJson() só garante que o texto é JSON parseável, não que tem o formato certo --
// isso evita que um campo ausente/undefined siga silenciosamente até o Supabase ou a UI.
const conversationAnalysisSchema = z.object({
  temperature: z.string(),
  buying_intent: z.coerce.number(),
  funnel_stage: z.string(),
  objections: z.array(z.string()),
  customer_need: z.string(),
  next_action: z.string(),
  suggested_reply: z.string(),
  summary: z.string(),
});

const offerResultSchema = z.object({
  offer_name: z.string(),
  headline: z.string(),
  description: z.string(),
  benefits: z.array(z.string()),
  cta: z.string(),
  whatsapp_message: z.string(),
  instagram_caption: z.string(),
  aggressive_variant: z.string(),
  premium_variant: z.string(),
});

export const analyzeConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => analyzeSchema.parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ analysis: ConversationAnalysis; conversationId: string }> => {
      const { supabase, userId } = context;
      await assertWithinLimit(supabase, userId, "analysis");
      const businessContext = await buildBusinessContext(supabase, userId);

      const raw = await callAI(
        [
          {
            role: "system",
            content: `${BASE_RULES}

${businessContext}

Analise a conversa enviada e responda APENAS com um JSON válido neste formato:
{
  "temperature": "quente" | "morno" | "frio",
  "buying_intent": número inteiro de 0 a 100,
  "funnel_stage": "Descoberta" | "Interesse" | "Consideração" | "Negociação" | "Compra",
  "objections": ["objeção curta"],
  "customer_need": "resumo curto da necessidade real do cliente",
  "next_action": "próxima ação recomendada para o vendedor, objetiva",
  "suggested_reply": "mensagem pronta para enviar ao cliente no WhatsApp",
  "summary": "resumo de uma linha da conversa"
}`,
          },
          { role: "user", content: `CONVERSA COM O CLIENTE:\n${data.conversation}` },
        ],
        "gemini",
      );

      const parsed = extractJson<ConversationAnalysis>(raw);
      const parseResult = conversationAnalysisSchema.safeParse(parsed);
      if (!parseResult.success) {
        throw new Error("A IA respondeu em um formato inesperado. Tente novamente.");
      }
      const analysis = parseResult.data as ConversationAnalysis;
      analysis.buying_intent = Math.max(
        0,
        Math.min(100, Math.round(Number(analysis.buying_intent) || 0)),
      );
      if (!["quente", "morno", "frio"].includes(analysis.temperature))
        analysis.temperature = "morno";
      analysis.objections = Array.isArray(analysis.objections)
        ? analysis.objections.slice(0, 6)
        : [];

      const { data: inserted, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          lead_id: data.leadId ?? null,
          title: analysis.summary?.slice(0, 120) ?? "Conversa analisada",
          raw_text: data.conversation,
          analysis: analysis as never,
        })
        .select("id")
        .single();
      if (error) throw new Error("Não foi possível salvar a análise.");

      await logGeneration(
        supabase,
        userId,
        "analysis",
        { length: data.conversation.length },
        analysis,
      );

      if (data.leadId) {
        await supabase
          .from("leads")
          .update({
            temperature: analysis.temperature,
            buying_intent: analysis.buying_intent,
            last_contact_at: new Date().toISOString(),
          })
          .eq("id", data.leadId)
          .eq("user_id", userId);
      }

      return { analysis, conversationId: inserted.id };
    },
  );

export const generateReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => replySchema.parse(data))
  .handler(async ({ data, context }): Promise<{ reply: string }> => {
    const { supabase, userId } = context;
    await assertWithinLimit(supabase, userId, "generation");
    const businessContext = await buildBusinessContext(supabase, userId);

    const variantInstruction = data.variant
      ? `Ajuste o estilo desta resposta para ser: ${data.variant}.`
      : "";

    const reply = (
      await callAI(
        [
          {
            role: "system",
            content: `${BASE_RULES}

${businessContext}

Escreva UMA mensagem pronta para o vendedor enviar ao cliente. Responda somente com o texto da mensagem, sem aspas, sem título, sem explicações. ${variantInstruction}`,
          },
          {
            role: "user",
            content: `Objetivo da mensagem: ${data.goal}
Mensagem do cliente: ${data.customerMessage}
Informações adicionais do vendedor: ${data.extraContext || "nenhuma"}`,
          },
        ],
        "gemini",
      )
    ).trim();

    if (!reply) throw new Error("A IA não retornou uma resposta. Tente novamente.");

    await logGeneration(supabase, userId, "reply", data, { reply });
    return { reply };
  });

export const generateFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => followUpSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ message: string }> => {
    const { supabase, userId } = context;
    await assertWithinLimit(supabase, userId, "generation");
    const businessContext = await buildBusinessContext(supabase, userId);

    const message = (
      await callAI(
        [
          {
            role: "system",
            content: `${BASE_RULES}

${businessContext}

Escreva um follow-up pronto para enviar no WhatsApp. Estilo pedido: ${data.style}. Responda somente com o texto da mensagem.`,
          },
          {
            role: "user",
            content: `Cliente: ${data.customerName}
Contexto: ${data.context || "não informado"}
Data do último contato: ${data.lastContactDate || "não informada"}
Motivo do contato: ${data.reason || "não informado"}
Objetivo: ${data.goal || "reengajar e avançar a venda"}`,
          },
        ],
        "gemini",
      )
    ).trim();

    if (!message) throw new Error("A IA não retornou uma resposta. Tente novamente.");

    await logGeneration(supabase, userId, "follow_up", data, { message });
    return { message };
  });

export const generateOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => offerSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ offer: OfferResult }> => {
    const { supabase, userId } = context;
    await assertWithinLimit(supabase, userId, "generation");
    const businessContext = await buildBusinessContext(supabase, userId);

    const raw = await callAI(
      [
        {
          role: "system",
          content: `${BASE_RULES}

${businessContext}

Crie uma oferta comercial usando SOMENTE os dados informados. Responda APENAS com JSON válido:
{
  "offer_name": "",
  "headline": "",
  "description": "",
  "benefits": ["", ""],
  "cta": "",
  "whatsapp_message": "",
  "instagram_caption": "",
  "aggressive_variant": "",
  "premium_variant": ""
}`,
        },
        {
          role: "user",
          content: `Produto: ${data.productName}
Preço atual: ${data.currentPrice || "não informado"}
Desconto: ${data.discount || "não informado"}
Público-alvo: ${data.audience || "não informado"}
Objetivo da campanha: ${data.campaignGoal || "não informado"}
Prazo da oferta: ${data.deadline || "não informado"}`,
        },
      ],
      "gemini",
    );

    const parsedOffer = extractJson<OfferResult>(raw);
    const offerParseResult = offerResultSchema.safeParse(parsedOffer);
    if (!offerParseResult.success) {
      throw new Error("A IA respondeu em um formato inesperado. Tente novamente.");
    }
    const offer = offerParseResult.data as OfferResult;
    offer.benefits = Array.isArray(offer.benefits) ? offer.benefits : [];

    const { error: offerInsertError } = await supabase.from("offers").insert({
      user_id: userId,
      product_name: data.productName,
      current_price: data.currentPrice ? Number(data.currentPrice.replace(",", ".")) || null : null,
      discount: data.discount || null,
      target_audience: data.audience || null,
      campaign_goal: data.campaignGoal || null,
      deadline: data.deadline || null,
      result: offer as never,
    });
    if (offerInsertError) throw new Error("Não foi possível salvar a oferta.");

    await logGeneration(supabase, userId, "offer", data, offer);

    return { offer };
  });

export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageSummary> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    const plan = profile?.plan ?? "free";
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [{ count: analyses }, { count: generations }] = await Promise.all([
      supabase
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("kind", "analysis")
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("kind", "analysis")
        .gte("created_at", monthStart.toISOString()),
    ]);

    const limits =
      plan === "free" ? { analyses: 10, generations: 20 } : { analyses: 500, generations: 1000 };
    return {
      plan,
      analyses: analyses ?? 0,
      generations: generations ?? 0,
      limitAnalyses: limits.analyses,
      limitGenerations: limits.generations,
    };
  });
