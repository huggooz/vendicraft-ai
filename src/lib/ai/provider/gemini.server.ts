import type { AIProvider, ChatMessage } from "./types";

// Endpoint e formato confirmados na documentação oficial (ai.google.dev/api/generate-content)
// em 2026-08-16 -- não copiados do gateway.server.ts da Lovable, que usa um corpo diferente
// (OpenAI-compatible) do da API oficial do Google (contents/systemInstruction).
const GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

// Mesmo identificador de modelo já usado hoje via Lovable ("google/gemini-3.6-flash", onde
// "google/" era só o prefixo de roteamento do gateway deles). Confirmado que "gemini-3.6-flash"
// é um ID de modelo real e atual na API oficial (existe também "gemini-3.7-flash", mais novo) --
// mantive o mesmo modelo de hoje de propósito, para não introduzir variação de tom/qualidade
// nos prompts já calibrados só por trocar de transporte.
const DEFAULT_MAX_OUTPUT_TOKENS = 1400;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 500;
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

function resolvePositiveInt(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class TransientAIError extends Error {}

// A API oficial não tem "role: system" dentro de contents (só "user"/"model") -- system vira
// o campo separado systemInstruction. Isso é uma diferença real de formato em relação ao
// corpo OpenAI-compatible da Lovable, não uma cópia automática.
function toGeminiBody(messages: ChatMessage[], maxOutputTokens: number) {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const contents = messages
    .filter((message) => message.role === "user")
    .map((message) => ({ role: "user" as const, parts: [{ text: message.content }] }));

  return {
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    contents,
    generationConfig: { maxOutputTokens },
  };
}

async function attempt(
  messages: ChatMessage[],
  timeoutMs: number,
  maxOutputTokens: number,
): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("A IA não está configurada no momento.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGeminiBody(messages, maxOutputTokens)),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("AI gateway timeout", { provider: "gemini", timeoutMs });
      throw new TransientAIError("timeout");
    }
    console.error("AI gateway network error", {
      provider: "gemini",
      message: error instanceof Error ? error.message : String(error),
    });
    throw new TransientAIError("network");
  } finally {
    clearTimeout(timer);
  }

  // A API do Google não tem um código equivalente ao 402 "créditos do workspace" da Lovable --
  // esgotamento de cota/billing aparece como 429 (RESOURCE_EXHAUSTED), então mapeamos só isso,
  // sem inventar um caso especial que a API real não tem.
  if (response.status === 429) {
    throw new Error("Muitas solicitações agora. Aguarde alguns segundos e tente novamente.");
  }
  if (RETRYABLE_STATUS.has(response.status)) {
    console.error("AI gateway transient error", { provider: "gemini", status: response.status });
    throw new TransientAIError(`status ${response.status}`);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("AI gateway error", response.status, detail);
    throw new Error("Não conseguimos falar com a IA agora. Tente novamente em instantes.");
  }

  let json: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  try {
    json = await response.json();
  } catch (error) {
    console.error("AI gateway invalid response body", {
      provider: "gemini",
      message: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Não conseguimos falar com a IA agora. Tente novamente em instantes.");
  }
  const content = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!content) throw new Error("A IA não retornou uma resposta. Tente novamente.");
  return content;
}

export const geminiProvider: AIProvider = {
  async chat(messages: ChatMessage[]): Promise<string> {
    const timeoutMs = resolvePositiveInt("AI_REQUEST_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
    const maxOutputTokens = resolvePositiveInt("AI_MAX_OUTPUT_TOKENS", DEFAULT_MAX_OUTPUT_TOKENS);

    let lastError: unknown;
    for (let attemptNumber = 1; attemptNumber <= MAX_ATTEMPTS; attemptNumber++) {
      try {
        return await attempt(messages, timeoutMs, maxOutputTokens);
      } catch (error) {
        lastError = error;
        if (!(error instanceof TransientAIError) || attemptNumber === MAX_ATTEMPTS) break;
        console.error("AI gateway retrying after transient failure", {
          provider: "gemini",
          attempt: attemptNumber,
          reason: error.message,
        });
        await sleep(RETRY_BACKOFF_MS);
      }
    }

    if (lastError instanceof TransientAIError) {
      throw new Error("Não conseguimos falar com a IA agora. Tente novamente em instantes.");
    }
    throw lastError;
  },
};
