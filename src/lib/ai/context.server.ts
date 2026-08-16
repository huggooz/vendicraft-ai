import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export const BASE_RULES = `Você é o VendAI, um especialista brasileiro em vendas consultivas por WhatsApp e Instagram.

REGRAS INEGOCIÁVEIS:
- Nunca invente preços, descontos, produtos, prazos, condições comerciais ou políticas da empresa.
- Use apenas as informações cadastradas no contexto do negócio abaixo.
- Se uma informação necessária não estiver cadastrada, diga explicitamente que ela não está disponível e oriente o vendedor a confirmar, em vez de inventar.
- Escreva em português do Brasil, em linguagem natural de WhatsApp, sem jargão corporativo.
- Mensagens curtas, escaneáveis, no máximo 2 parágrafos curtos, com no máximo 2 emojis quando fizer sentido.`;

export async function buildBusinessContext(supabase: Client, userId: string): Promise<string> {
  const [{ data: business }, { data: products }, { data: profile }] = await Promise.all([
    supabase.from("businesses").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("products").select("*").eq("user_id", userId).limit(30),
    supabase.from("profiles").select("full_name, default_tone").eq("id", userId).maybeSingle(),
  ]);

  const lines: string[] = ["CONTEXTO DO NEGÓCIO:"];
  if (business) {
    lines.push(`- Negócio: ${business.name || "não cadastrado"}`);
    lines.push(`- Segmento: ${business.segment || "não cadastrado"}`);
    lines.push(`- Descrição: ${business.description || "não cadastrada"}`);
    lines.push(`- Público-alvo: ${business.target_audience || "não cadastrado"}`);
    lines.push(`- Faixa de preço: ${business.price_range || "não cadastrada"}`);
    lines.push(`- Necessidades dos clientes: ${business.customer_needs || "não cadastradas"}`);
    lines.push(`- Tom de voz preferido: ${business.tone || profile?.default_tone || "profissional"}`);
  } else {
    lines.push("- O usuário ainda não cadastrou o negócio. Não invente dados sobre ele.");
  }

  lines.push("", "PRODUTOS E SERVIÇOS CADASTRADOS:");
  if (products && products.length > 0) {
    for (const product of products) {
      lines.push(
        `- ${product.name} | preço: ${
          product.price != null ? `R$ ${Number(product.price).toFixed(2).replace(".", ",")}` : "não cadastrado"
        } | descrição: ${product.description || "não cadastrada"} | benefícios: ${
          product.benefits || "não cadastrados"
        } | observações: ${product.commercial_notes || "—"}`,
      );
    }
  } else {
    lines.push("- Nenhum produto cadastrado. NÃO cite preços nem produtos específicos.");
  }

  return lines.join("\n");
}

export async function logGeneration(
  supabase: Client,
  userId: string,
  kind: string,
  input: unknown,
  output: unknown,
) {
  await supabase.from("ai_generations").insert({
    user_id: userId,
    kind,
    input: input as never,
    output: output as never,
  });
}

const PLAN_LIMITS: Record<string, { analyses: number; generations: number }> = {
  free: { analyses: 10, generations: 20 },
  pro: { analyses: 500, generations: 1000 },
  anual: { analyses: 500, generations: 1000 },
};

export async function assertWithinLimit(supabase: Client, userId: string, kind: "analysis" | "generation") {
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const plan = profile?.plan ?? "free";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS["free"]!;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const query = supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString());

  const { count } =
    kind === "analysis" ? await query.eq("kind", "analysis") : await query.neq("kind", "analysis");

  const used = count ?? 0;
  const max = kind === "analysis" ? limits.analyses : limits.generations;
  if (used >= max) {
    throw new Error(
      `Você atingiu o limite do plano ${plan.toUpperCase()} deste mês (${max}). Faça upgrade para continuar usando a IA.`,
    );
  }
}
