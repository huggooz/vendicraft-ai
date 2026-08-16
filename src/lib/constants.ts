export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    limits: { analyses: 10, generations: 20, products: 5 },
    features: [
      "10 análises de conversa/mês",
      "20 gerações de resposta/mês",
      "CRM básico",
      "Até 5 produtos",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "R$ 39,90",
    period: "por mês",
    limits: { analyses: 500, generations: 1000, products: Infinity },
    features: [
      "Análises ampliadas",
      "Gerações ampliadas",
      "CRM completo",
      "Produtos ilimitados",
      "Follow-ups com IA",
      "Gerador de ofertas",
      "Biblioteca completa",
      "Dashboard completo",
    ],
  },
  anual: {
    id: "anual",
    name: "Anual",
    price: "R$ 197",
    period: "por ano",
    limits: { analyses: 500, generations: 1000, products: Infinity },
    features: [
      "Tudo do plano Pro",
      "Economia de 59% no ano",
      "Suporte prioritário",
      "Novos recursos em primeira mão",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const TONES = [
  { value: "profissional", label: "Profissional" },
  { value: "amigavel", label: "Amigável" },
  { value: "persuasivo", label: "Persuasivo" },
  { value: "casual", label: "Casual" },
  { value: "premium", label: "Premium" },
] as const;

export const LEAD_STAGES = [
  { id: "novo", label: "Novo lead" },
  { id: "conversando", label: "Conversando" },
  { id: "proposta", label: "Proposta enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "ganho", label: "Venda realizada" },
  { id: "perdido", label: "Perdido" },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]["id"];

export const TEMPERATURES = [
  { value: "quente", label: "Quente", emoji: "🔥" },
  { value: "morno", label: "Morno", emoji: "🟡" },
  { value: "frio", label: "Frio", emoji: "🔵" },
] as const;

export const REPLY_GOALS = [
  { value: "primeiro_contato", label: "Primeiro contato" },
  { value: "orcamento", label: "Responder orçamento" },
  { value: "duvida", label: "Responder dúvida" },
  { value: "objecao", label: "Contornar objeção" },
  { value: "follow_up", label: "Follow-up" },
  { value: "recuperar", label: "Recuperar cliente" },
  { value: "pos_venda", label: "Pós-venda" },
  { value: "indicacao", label: "Pedido de indicação" },
] as const;

export const MESSAGE_CATEGORIES = [
  { value: "primeiro_contato", label: "Primeiro contato" },
  { value: "orcamento", label: "Orçamento" },
  { value: "follow_up", label: "Follow-up" },
  { value: "objecoes", label: "Objeções" },
  { value: "fechamento", label: "Fechamento" },
  { value: "pos_venda", label: "Pós-venda" },
  { value: "indicacao", label: "Indicação" },
  { value: "recuperacao", label: "Recuperação de cliente" },
] as const;

export const FOLLOW_UP_STYLES = [
  { value: "curto", label: "Follow-up curto" },
  { value: "amigavel", label: "Follow-up amigável" },
  { value: "persuasivo", label: "Follow-up persuasivo" },
  { value: "ultima_tentativa", label: "Última tentativa" },
] as const;

export const SEGMENTS = [
  "Serviços",
  "Estética e beleza",
  "Saúde e bem-estar",
  "Moda e vestuário",
  "Alimentação",
  "Educação e cursos",
  "Tecnologia e software",
  "Consultoria",
  "Construção e reformas",
  "Automotivo",
  "Imobiliário",
  "Outro",
];

export const REPLY_VARIANTS = [
  { value: "curta", label: "Mais curta" },
  { value: "persuasiva", label: "Mais persuasiva" },
  { value: "profissional", label: "Mais profissional" },
  { value: "amigavel", label: "Mais amigável" },
] as const;
