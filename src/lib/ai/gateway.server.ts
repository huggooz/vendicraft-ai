type ChatMessage = { role: "system" | "user"; content: string };

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export async function callAI(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("A IA não está configurada no momento.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, stream: false }),
  });

  if (response.status === 429) {
    throw new Error("Muitas solicitações agora. Aguarde alguns segundos e tente novamente.");
  }
  if (response.status === 402) {
    throw new Error("Os créditos de IA do workspace acabaram. Recarregue para continuar usando.");
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("AI gateway error", response.status, detail);
    throw new Error("Não conseguimos falar com a IA agora. Tente novamente em instantes.");
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("A IA não retornou uma resposta. Tente novamente.");
  return content;
}

export function extractJson<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("A IA respondeu em um formato inesperado. Tente novamente.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}
