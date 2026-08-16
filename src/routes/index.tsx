import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  Clock3,
  Flame,
  MessageSquareText,
  Repeat2,
  Search,
  Sparkles,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VendAI — Transforme conversas em vendas com IA" },
      {
        name: "description",
        content:
          "Analise conversas de WhatsApp com IA, descubra a intenção de compra, receba respostas prontas e organize seus leads em um CRM feito para vender.",
      },
      { property: "og:title", content: "VendAI — Transforme conversas em vendas com IA" },
      {
        property: "og:description",
        content: "Analise clientes, responda melhor, faça follow-ups e organize suas oportunidades em um único lugar.",
      },
    ],
  }),
  component: LandingPage,
});

const problems = [
  { icon: Clock3, title: "Cliente esperando resposta", text: "Cada minuto sem resposta reduz drasticamente a chance de fechar." },
  { icon: XCircle, title: "Oportunidades perdidas", text: "Conversas que morreram porque ninguém retomou o contato." },
  { icon: Search, title: "Não saber o que responder", text: "Objeção de preço, dúvida técnica, silêncio: cada caso pede outra abordagem." },
  { icon: Repeat2, title: "Falta de acompanhamento", text: "Sem follow-up estruturado, o cliente compra de quem lembrou dele." },
  { icon: Users, title: "Leads espalhados", text: "Nomes soltos em conversas, prints e cadernos. Nada organizado." },
];

const steps = [
  { n: "01", title: "Cole a conversa", text: "Copie o histórico do WhatsApp ou Instagram e cole no VendAI." },
  { n: "02", title: "A IA analisa o cliente", text: "Temperatura, intenção de compra, objeções e momento do funil." },
  { n: "03", title: "Receba a resposta pronta", text: "Uma mensagem construída com os dados reais do seu negócio." },
];

const features = [
  { icon: Brain, title: "IA de vendas", text: "Leitura completa da conversa com diagnóstico comercial." },
  { icon: Flame, title: "Análise de leads", text: "Classificação quente, morno e frio com intenção de 0 a 100." },
  { icon: MessageSquareText, title: "Respostas inteligentes", text: "8 objetivos diferentes, do primeiro contato ao pós-venda." },
  { icon: Repeat2, title: "Follow-up", text: "Mensagens de retomada que não parecem cobrança." },
  { icon: Users, title: "CRM", text: "Pipeline kanban com todas as suas oportunidades." },
  { icon: Target, title: "Gerador de ofertas", text: "Headline, benefícios, CTA, WhatsApp e Instagram." },
  { icon: BarChart3, title: "Dashboard", text: "Oportunidades, vendas e conversão em tempo real." },
  { icon: BookOpen, title: "Biblioteca", text: "Salve e reutilize as mensagens que mais vendem." },
];

const faqs = [
  { q: "Preciso instalar alguma coisa?", a: "Não. O VendAI roda no navegador, no computador ou no celular. Você cola a conversa e recebe a análise." },
  { q: "O VendAI funciona para qualquer negócio?", a: "Sim. Ele usa os dados que você cadastra — negócio, produtos, preços, público e tom de voz — para adaptar as respostas ao seu contexto." },
  { q: "Preciso entender de IA?", a: "Não. A interface foi feita para vendedores, não para técnicos. Você preenche campos simples e recebe o resultado pronto." },
  { q: "Posso cancelar?", a: "Sim, a qualquer momento e sem burocracia. O plano Free continua disponível para sempre." },
  { q: "Meus dados ficam seguros?", a: "Sim. Cada conta acessa exclusivamente os próprios dados, com isolamento garantido no banco de dados e chaves de IA protegidas no servidor." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#funcionalidades" className="transition-colors hover:text-foreground">Funcionalidades</a>
            <a href="#planos" className="transition-colors hover:text-foreground">Planos</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.35]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 md:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 bg-primary/10 py-1.5 text-primary">
                <Sparkles className="size-3.5" /> Inteligência artificial de vendas
              </Badge>
              <h1 className="text-4xl font-extrabold leading-[1.08] md:text-6xl">
                Transforme conversas em <span className="text-gradient">vendas com IA</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Analise seus clientes, responda melhor, faça follow-ups e organize suas oportunidades em um único
                lugar.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Começar grátis <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="subtle" size="xl" asChild>
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Sem cartão de crédito · Plano gratuito para sempre
              </p>
            </div>
            <DemoCard />
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle
            eyebrow="O problema"
            title="Você não perde venda por falta de cliente."
            subtitle="Perde por não saber o que responder, quando responder e para quem voltar."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {problems.map((item) => (
              <div key={item.title} className="surface-panel rounded-2xl p-6 transition-all hover:border-destructive/40">
                <item.icon className="size-5 text-destructive" />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle eyebrow="Como funciona" title="Três passos entre a dúvida e a venda." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="surface-panel relative overflow-hidden rounded-2xl p-7">
                <span className="font-display text-5xl font-extrabold text-primary/15">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle
            eyebrow="Funcionalidades"
            title="Tudo o que um vendedor precisa, em um só painel."
            subtitle="Construído para quem vende no WhatsApp e no Instagram todos os dias."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="surface-panel group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-primary/40"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle eyebrow="Planos" title="Comece grátis. Evolua quando vender mais." />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {(["free", "pro", "anual"] as const).map((key) => {
              const plan = PLANS[key];
              const highlighted = key === "pro";
              return (
                <div
                  key={key}
                  className={cn(
                    "surface-panel relative flex flex-col rounded-3xl p-8",
                    highlighted && "border-primary/50 shadow-glow",
                  )}
                >
                  {highlighted && (
                    <Badge className="absolute -top-3 left-8 bg-primary text-primary-foreground">Mais popular</Badge>
                  )}
                  <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="font-display text-4xl font-extrabold">{plan.price}</span>
                    <span className="pb-1.5 text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="mt-7 flex-1 space-y-3 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5 text-muted-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={highlighted ? "hero" : "subtle"} size="lg" className="mt-8 w-full" asChild>
                    <Link to="/auth" search={{ mode: "signup" }}>
                      {key === "free" ? "Começar grátis" : "Assinar " + plan.name}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-3xl px-5">
          <SectionTitle eyebrow="FAQ" title="Perguntas frequentes" />
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q} className="border-border">
                <AccordionTrigger className="text-left font-medium hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-4xl px-5">
          <div className="surface-panel relative overflow-hidden rounded-3xl px-8 py-16 text-center">
            <div className="pointer-events-none absolute inset-0 bg-hero" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold md:text-4xl">
                Pare de perder vendas por não saber o que responder.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                Em menos de 2 minutos o VendAI conhece o seu negócio e começa a responder com você.
              </p>
              <Button variant="hero" size="xl" className="mt-9" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Começar agora <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>Transforme conversas em vendas.</p>
          <p>© {new Date().getFullYear()} VendAI</p>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</span>
      <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function DemoCard() {
  return (
    <div className="surface-panel rounded-3xl p-5 shadow-elevated md:p-6">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-primary/60" />
        <span className="ml-2 text-xs text-muted-foreground">Análise de conversa</span>
      </div>

      <div className="space-y-3 py-5">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-elevated px-4 py-3 text-sm">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
          Oi, quanto custa esse serviço?
        </div>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-3 text-sm ring-1 ring-primary/25">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">VendAI</p>
          Olá! 😊 O valor é R$ 149,90. Posso te explicar rapidamente como funciona e verificar a disponibilidade para
          você.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-5">
        <div className="rounded-xl bg-elevated p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Classificação</p>
          <p className="mt-1 font-semibold text-hot">🔥 Lead quente</p>
        </div>
        <div className="rounded-xl bg-elevated p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Intenção de compra</p>
          <p className="mt-1 font-semibold text-primary">Alta · 87%</p>
        </div>
      </div>
    </div>
  );
}
