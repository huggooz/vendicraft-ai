# VendAI

SaaS full-stack de inteligência artificial para vendedores que atendem clientes por WhatsApp e Instagram: o vendedor cola o texto da conversa na aplicação e recebe análise comercial, resposta pronta e organização do lead em um CRM. Não há integração automática com WhatsApp/Instagram — a entrada é manual (colar a conversa).

## Sobre o projeto

Vendedores autônomos, MEIs e pequenos negócios vendem majoritariamente por conversa direta (WhatsApp, Instagram) e perdem oportunidades por não saber responder rápido, não fazer follow-up e não ter os leads organizados em nenhum lugar.

O VendAI resolve isso permitindo que o vendedor cole uma conversa e receba, em segundos: classificação do lead (quente/morno/frio), intenção de compra, objeções identificadas, próxima ação recomendada e uma resposta pronta para enviar — tudo calibrado com os dados reais do negócio (produtos, preços, público-alvo, tom de voz) cadastrados no onboarding, nunca inventados pela IA.

## Principais funcionalidades

- **IA de Vendas** — cola-se uma conversa e a IA devolve temperatura do lead, intenção de compra (0–100), estágio do funil, objeções, necessidade do cliente e uma resposta sugerida.
- **Gerador de respostas** — mensagens prontas para 8 objetivos distintos (primeiro contato, orçamento, objeção, follow-up, pós-venda, indicação, etc.), com variações (mais curta, mais persuasiva, mais profissional).
- **Follow-ups** — geração de mensagens de retomada de contato em 4 estilos diferentes.
- **Gerador de ofertas** — headline, descrição, benefícios, CTA e variações de copy (WhatsApp/Instagram) a partir de produto, preço, desconto e público.
- **CRM Kanban** — pipeline de leads (novo → conversando → proposta → negociação → ganho/perdido), com valor potencial e temperatura.
- **Dashboard** — métricas de leads, oportunidades, vendas e conversão, com gráficos de evolução e distribuição por temperatura.
- **Cadastro de produtos, biblioteca de mensagens e configurações de negócio/tom de voz**, usados como contexto real para todas as gerações de IA.
- **Planos e limites de uso** (Free/Pro/Anual) aplicados no servidor, não apenas na interface.

## Tecnologias

- **TypeScript** (modo `strict`)
- **React 19** + **TanStack Start** (SSR, roteamento file-based, server functions) + **TanStack Router** + **TanStack Query**
- **Vite** + **Nitro** (build multi-target — ver [Deploy](#deploy))
- **Tailwind CSS** + **shadcn/ui** (Radix primitives)
- **Supabase** (Auth + PostgreSQL + Row Level Security)
- **Zod** para validação de entrada em toda fronteira do sistema (server functions e webhook)
- **Google Gemini** como provedor de IA
- **Vitest** para testes automatizados

## Arquitetura

```
Browser (React + TanStack Router)
        │
        ▼
TanStack Start (SSR + Server Functions, middleware de auth/CSRF)
        │
        ├── AI Gateway (server-only) ──► Gemini API
        │      valida contexto do negócio, limites de plano
        │      e formato da resposta (Zod) antes de persistir
        │
        └── Webhook /api/webhooks/kirvano (server-only, fora do router)
        │
        ▼
Supabase
   ├── Auth (JWT)
   ├── PostgreSQL (RLS em todas as tabelas de usuário)
   ├── subscriptions / billing_events (billing)
   └── leads, products, conversations, ai_generations, offers, follow_ups...
```

O servidor sempre acessa o Supabase de duas formas distintas, nunca misturadas:
- **Client autenticado** (`auth-middleware.ts`): recebe o JWT do usuário, roda com RLS ativo — usado em toda leitura/escrita de dados do usuário.
- **Client admin** (`client.server.ts`, service role): usado apenas dentro de módulos `*.server.ts` para operações que precisam ignorar RLS (ex: o webhook de billing, que não tem sessão de usuário).

## Segurança

- **RLS em todas as tabelas de dados do usuário** — cada registro só é acessível por quem o criou; o isolamento não depende do frontend.
- **`SUPABASE_SERVICE_ROLE_KEY` e `GEMINI_API_KEY` nunca chegam ao bundle do cliente** — vivem apenas em módulos `*.server.ts`, carregados via `process.env` no servidor.
- **Autenticação por JWT verificado no servidor** (`supabase.auth.getClaims`) antes de qualquer server function rodar, via middleware compartilhado.
- **CSRF middleware** aplicado a toda chamada de server function (`createCsrfMiddleware`).
- **Validação de entrada com Zod** em toda fronteira: server functions da IA e payload do webhook Kirvano — nada do corpo da requisição é confiado sem schema.
- **Idempotência no webhook de billing**: eventos duplicados do Kirvano são detectados por uma chave composta e um índice único no banco (`billing_events`), evitando processar a mesma venda duas vezes.
- **Limite de uso por plano aplicado no servidor** (`assertWithinLimit`), não apenas escondido na UI.
- **A IA nunca inventa dado comercial**: preço, desconto e condições vêm exclusivamente do que o usuário cadastrou; quando falta contexto, a IA é instruída a dizer que a informação não está disponível.

## Banco de dados

PostgreSQL via Supabase, com RLS habilitado. Tabelas principais: `profiles`, `businesses`, `products`, `leads`, `conversations`, `ai_generations`, `follow_ups`, `offers`, `saved_messages`, `subscriptions`, `billing_events`. A migration de billing (`subscriptions`/`billing_events`) inclui constraints, índices, trigger de `updated_at` e um índice parcial único para idempotência de eventos de webhook.

## Testes

17 testes automatizados (Vitest), cobrindo o webhook de billing: validação de payload, autenticação do webhook, idempotência, eventos "record-only" vs. eventos comerciais, resolução de plano e atualização de assinatura/perfil — com um fake do client Supabase (`fake-supabase.ts`), sem depender de um banco real.

```
npm test
```

## Como executar

Pré-requisitos: Node.js e um projeto Supabase (URL + chaves).

```sh
git clone <url-deste-repositorio>
cd vendicraft-ai
npm install
```

Copie o arquivo de exemplo e preencha com valores reais (ver [Variáveis de ambiente](#variáveis-de-ambiente)):

```sh
cp .env.example .env
```

Depois rode:

```sh
npm run dev
```

Outros scripts disponíveis:

```sh
npm run build     # build de produção
npm run test      # roda a suíte de testes (Vitest)
npm run lint      # ESLint
npx tsc --noEmit  # checagem de tipos
```

## Variáveis de ambiente

Nenhum valor real abaixo — apenas os nomes que o código efetivamente lê.

```env
# Cliente (Vite injeta em build-time)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# Servidor
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# IA
AI_PROVIDER=gemini
GEMINI_API_KEY=
# Opcionais (têm default no código):
AI_REQUEST_TIMEOUT_MS=
AI_MAX_OUTPUT_TOKENS=

# Billing (webhook Kirvano)
KIRVANO_WEBHOOK_TOKEN=
```

`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` e `KIRVANO_WEBHOOK_TOKEN` são secrets de servidor — nunca devem receber o prefixo `VITE_` nem ser expostos ao cliente.

## Deploy

Framework: **TanStack Start** (Vite + Nitro). O comando de build é `npm run build`; o Nitro detecta automaticamente o ambiente de deploy através de variáveis de ambiente padrão da plataforma (ex.: a Vercel injeta `VERCEL=1` durante o build) e gera a saída no formato correto — verificado localmente reproduzindo esse ambiente, sem necessidade de `vercel.json`.

Variáveis de ambiente da seção anterior precisam ser configuradas no provedor de deploy antes do primeiro build (as de servidor marcadas como sensíveis/secret).

## Demo

*(a preencher após o deploy: URL pública da aplicação)*

Screenshots ainda não incluídos neste README — pendente adicionar capturas de tela das telas principais (landing page, dashboard, IA de vendas, CRM) sem dados pessoais reais.

## Roadmap futuro

- Integração comercial completa com a Kirvano (checkout real, renovação, cancelamento, reativação) — hoje a arquitetura do webhook está pronta e testada, mas roda sem produto/oferta real configurados de propósito, para não inventar comportamento não confirmado pela Kirvano.
- Domínio próprio.
- Expansão dos recursos de IA (ex.: análise de múltiplas conversas simultâneas, integração direta com WhatsApp Business API).

## Status

Projeto desenvolvido como aplicação SaaS full-stack e utilizado como projeto de portfólio. A infraestrutura de billing está implementada e testada, mas a integração comercial real com a Kirvano ainda não foi ativada — ver Roadmap.
