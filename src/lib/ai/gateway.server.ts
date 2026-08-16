import type { AIProvider, ChatMessage } from "./provider/types";
import { geminiProvider } from "./provider/gemini.server";

type AIProviderName = "gemini";

function resolveProvider(override?: AIProviderName): AIProvider {
  const name = override ?? process.env["AI_PROVIDER"] ?? "gemini";
  switch (name) {
    case "gemini":
      return geminiProvider;
    default:
      throw new Error(`AI_PROVIDER "${name}" não é suportado.`);
  }
}

export async function callAI(messages: ChatMessage[], provider?: AIProviderName): Promise<string> {
  return resolveProvider(provider).chat(messages);
}

export function extractJson<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1)
    throw new Error("A IA respondeu em um formato inesperado. Tente novamente.");
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    throw new Error("A IA respondeu em um formato inesperado. Tente novamente.");
  }
}
