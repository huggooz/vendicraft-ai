export type Temperature = "quente" | "morno" | "frio";

export interface ConversationAnalysis {
  temperature: Temperature;
  buying_intent: number;
  funnel_stage: string;
  objections: string[];
  customer_need: string;
  next_action: string;
  suggested_reply: string;
  summary: string;
}

export interface OfferResult {
  offer_name: string;
  headline: string;
  description: string;
  benefits: string[];
  cta: string;
  whatsapp_message: string;
  instagram_caption: string;
  aggressive_variant: string;
  premium_variant: string;
}

export interface UsageSummary {
  analyses: number;
  generations: number;
  plan: string;
  limitAnalyses: number;
  limitGenerations: number;
}
