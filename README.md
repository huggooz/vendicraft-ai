# Spark Sales AI

VENDai — SaaS de Inteligência Artificial para Vendas no WhatsApp

Quero que você construa um SaaS web completo chamado VendAI.

1. OBJETIVO DO PRODUTO

O VendAI é uma plataforma de inteligência artificial voltada para MEIs, autônomos, pequenos negócios, prestadores de serviços e vendedores que utilizam WhatsApp e Instagram para vender.

A proposta principal é:

Transformar conversas com clientes em oportunidades de venda.

O usuário poderá cadastrar seu negócio, seus produtos/serviços e utilizar IA para:

analisar conversas com clientes;

identificar intenção de compra;

classificar leads;

gerar respostas comerciais;

criar follow-ups;

criar ofertas;

melhorar mensagens;

organizar leads em um CRM;

acompanhar oportunidades e vendas.

O produto precisa parecer um SaaS comercial real, moderno e profissional, e não apenas uma demonstração de IA.

2. STACK

Utilize preferencialmente:

React

TypeScript

Tailwind CSS

shadcn/ui

Supabase

PostgreSQL

autenticação do Supabase

Row Level Security (RLS)

integração com modelo de IA através de uma arquitetura segura de backend/edge functions

Nunca exponha API keys ou secrets no frontend.

A arquitetura deve ser preparada para posteriormente integrar:

WhatsApp Business API

Instagram

Kirvano

Stripe ou outros gateways

serviços de e-mail

analytics

Não implemente essas integrações agora se elas não forem necessárias para o MVP. Apenas deixe a arquitetura preparada.

3. IDENTIDADE VISUAL

Nome:

VendAI

Slogan:

"Transforme conversas em vendas."

Estilo visual:

moderno;

premium;

tecnológico;

profissional;

minimalista;

SaaS B2B;

excelente experiência em desktop e mobile.

Evite aparência genérica de template.

Utilize:

bastante espaço em branco;

cards modernos;

bordas discretas;

sombras suaves;

tipografia moderna;

ícones consistentes;

microinterações;

estados de loading;

estados vazios;

feedback visual após ações.

Crie uma identidade visual coerente para todo o produto.

4. LANDING PAGE

Antes do login, crie uma landing page comercial.

Hero:

"Transforme conversas em vendas com IA."

Subheadline:

"Analise seus clientes, responda melhor, faça follow-ups e organize suas oportunidades em um único lugar."

CTA principal:

Começar grátis

CTA secundário:

Ver como funciona

Criar as seguintes seções:

Problema

Mostrar problemas comuns:

clientes esperando resposta;

oportunidades perdidas;

dificuldade para saber o que responder;

falta de acompanhamento;

leads espalhados em conversas.

Como funciona

3 passos:

Cole a conversa.

A IA analisa o cliente.

Receba uma resposta pronta para vender.

Funcionalidades

Mostrar:

IA de vendas;

análise de leads;

respostas inteligentes;

follow-up;

CRM;

geração de ofertas;

dashboard.

Demonstração

Criar uma simulação visual:

Cliente:

"Oi, quanto custa esse serviço?"

VendAI:

"Olá! 😊 O valor é R$ 149,90. Posso te explicar rapidamente como funciona e verificar a disponibilidade para você."

Mostrar classificação:

🔥 Lead quente

Intenção de compra: Alta

Pricing

Criar três planos:

FREE
R$ 0

PRO
R$ 39,90/mês

ANUAL
R$ 197/ano

O pricing deve ser visualmente profissional.

FAQ

Adicionar perguntas como:

Preciso instalar alguma coisa?

O VendAI funciona para qualquer negócio?

Preciso entender de IA?

Posso cancelar?

Meus dados ficam seguros?

CTA final

"Pare de perder vendas por não saber o que responder."

Botão:

Começar agora

5. AUTENTICAÇÃO

Criar:

Login

Cadastro

Recuperação de senha

Logout

Campos:

Cadastro:

Nome

E-mail

Senha

Após o primeiro cadastro, direcionar para um onboarding.

6. ONBOARDING

No primeiro acesso, criar um wizard simples.

Etapa 1

"Vamos conhecer seu negócio."

Campos:

Nome do negócio

Segmento

Descrição do negócio

Etapa 2

"Quem são seus clientes?"

Campos:

Público-alvo

Faixa de preço

Principais necessidades dos clientes

Etapa 3

"O que você vende?"

Permitir cadastrar:

Nome do produto/serviço

Descrição

Preço

Benefícios

Permitir adicionar vários produtos.

Etapa 4

"Como você quer conversar?"

Selecionar:

Profissional

Amigável

Persuasivo

Casual

Premium

Salvar todas essas informações no banco.

Depois direcionar para o Dashboard.

7. DASHBOARD

Criar dashboard principal.

Header:

"Olá, [nome] 👋"

Subtexto:

"Aqui está um resumo das suas oportunidades."

Cards:

Leads

Leads quentes

Oportunidades

Vendas

Taxa de conversão

Exemplo:

LEADS
48

LEADS QUENTES
12

OPORTUNIDADES
R$ 4.280

VENDAS
R$ 1.890

Criar gráfico de:

Oportunidades ao longo do tempo

Criar gráfico de:

Distribuição dos leads

Quente

Morno

Frio

Criar seção:

Ações rápidas

Botões:

Analisar conversa

Novo lead

Gerar resposta

Criar oferta

8. PRINCIPAL FUNCIONALIDADE — IA DE VENDAS

Criar uma página chamada:

IA de Vendas

Essa deve ser a principal funcionalidade do sistema.

Criar um grande textarea:

"Cole aqui a conversa com seu cliente..."

Exemplo:

Cliente:
"Oi, vi seu anúncio. Quanto custa?"

Cliente:
"Tem desconto?"

Cliente:
"Consigo pagar no cartão?"

Botão:

Analisar conversa

Ao executar:

A IA deve analisar:

Classificação

🔥 Quente

🟡 Morno

🔵 Frio

Intenção de compra

Percentual de 0 a 100.

Momento do funil

Descoberta

Interesse

Consideração

Negociação

Compra

Objeções identificadas

Exemplo:

"Preço"

Necessidade do cliente

Resumo curto.

Próxima ação recomendada

Exemplo:

"Responder a objeção de preço e apresentar o principal benefício antes de oferecer desconto."

Resposta sugerida

Gerar uma resposta pronta para enviar ao cliente.

Adicionar botões:

Copiar

Gerar novamente

Mais curta

Mais persuasiva

Mais profissional

Mais amigável

9. GERADOR DE RESPOSTAS

Criar página:

Gerar resposta

Campos:

Objetivo:

Primeiro contato

Responder orçamento

Responder dúvida

Contornar objeção

Follow-up

Recuperar cliente

Pós-venda

Pedido de indicação

Campo:

"Mensagem do cliente"

Campo:

"Informações adicionais"

Botão:

Gerar resposta

A IA deve utilizar:

informações do negócio;

produtos cadastrados;

público-alvo;

tom de comunicação;

contexto fornecido pelo usuário.

Mostrar resultado em um card.

10. FOLLOW-UP

Criar página:

Follow-ups

Permitir criar um follow-up manualmente.

Campos:

Nome do cliente

Contexto

Data do último contato

Motivo do contato

Objetivo

A IA deve gerar:

Follow-up recomendado

Mensagem pronta.

Criar opções:

Follow-up curto

Follow-up amigável

Follow-up persuasivo

Última tentativa

Criar também uma lista de follow-ups cadastrados.

11. CRM

Criar página:

CRM

Criar pipeline Kanban.

Colunas:

Novo lead

Conversando

Proposta enviada

Negociação

Venda realizada

Perdido

Cada lead deve aparecer em um card contendo:

Nome

Telefone

Valor potencial

Temperatura

Último contato

Status

Permitir:

criar lead;

editar lead;

excluir lead;

mover lead entre etapas;

visualizar detalhes.

12. CADASTRO DE LEADS

Criar formulário:

Nome

Telefone

E-mail

Empresa

Produto de interesse

Valor potencial

Observações

Temperatura

Status

Temperatura:

Quente

Morno

Frio

Permitir que a IA classifique posteriormente o lead.

13. PRODUTOS E SERVIÇOS

Criar página:

Produtos

Permitir:

adicionar;

editar;

excluir;

visualizar.

Campos:

Nome

Descrição

Preço

Benefícios

Público-alvo

Observações comerciais

Esses dados devem ser utilizados pela IA para gerar respostas mais contextualizadas.

14. GERADOR DE OFERTAS

Criar página:

Criar oferta com IA

Campos:

Produto

Preço atual

Desconto

Público-alvo

Objetivo da campanha

Prazo da oferta

A IA deve gerar:

Nome da oferta

Headline

Descrição

Benefícios

CTA

Mensagem para WhatsApp

Legenda para Instagram

Variação mais agressiva

Variação mais premium

15. BIBLIOTECA DE MENSAGENS

Criar página:

Biblioteca

Categorias:

Primeiro contato

Orçamento

Follow-up

Objeções

Fechamento

Pós-venda

Indicação

Recuperação de cliente

Permitir salvar mensagens favoritas.

16. PERFIL E CONFIGURAÇÕES

Criar:

Meu perfil

Nome

E-mail

Foto

Meu negócio

Nome

Segmento

Descrição

Público-alvo

Tom de voz

Preferências

Tom padrão da IA

Idioma

Notificações

17. PLANOS E LIMITES

Criar estrutura de planos:

FREE

10 análises de conversa/mês

20 gerações de resposta/mês

CRM básico

5 produtos

PRO

R$ 39,90/mês

análises ampliadas

gerações ampliadas

CRM completo

produtos ilimitados

follow-ups

gerador de ofertas

biblioteca completa

dashboard completo

ANUAL

R$ 197/ano

Mesmo conjunto de recursos do PRO.

IMPORTANTE:

Não implementar cobrança real agora.

Criar a arquitetura para futuramente integrar a Kirvano e permitir atualizar o plano do usuário via webhook.

Criar um campo no perfil do usuário:

plan

subscription_status

subscription_id

subscription_expires_at

18. BANCO DE DADOS

Utilizar Supabase/PostgreSQL.

Criar tabelas apropriadas, incluindo pelo menos:

profiles
businesses
products
leads
lead_interactions
conversations
ai_generations
follow_ups
offers
saved_messages
subscriptions

Cada registro deve estar associado corretamente ao usuário autenticado.

Implementar RLS para garantir:

um usuário nunca pode acessar os dados de outro usuário.

Não confiar apenas no frontend para segurança.

19. IA

A IA deve possuir um contexto estruturado.

Sempre que possível, fornecer para o modelo:

negócio;

segmento;

produtos;

preços;

público-alvo;

tom de voz;

contexto da conversa.

A IA nunca deve inventar:

preços;

descontos;

produtos;

condições comerciais;

políticas da empresa.

Se determinada informação não estiver cadastrada, ela deve informar que a informação não está disponível em vez de inventar.

20. EXPERIÊNCIA DO USUÁRIO

O aplicativo deve ser:

responsivo;

mobile-first;

rápido;

acessível;

intuitivo.

Criar:

skeleton loading;

empty states;

toast notifications;

confirmação antes de excluir;

tratamento de erros;

estados de carregamento da IA;

mensagens amigáveis.

Não deixar nenhuma tela com aparência inacabada.

21. SIDEBAR

Criar sidebar principal:

🏠 Dashboard

🤖 IA de Vendas

💬 Gerar Resposta

🔥 Follow-ups

👥 CRM

📦 Produtos

🎯 Ofertas

📚 Biblioteca

⚙️ Configurações

Na parte inferior:

Plano atual

FREE

Botão:

Fazer upgrade

22. RESPONSIVIDADE

Desktop:

Sidebar fixa.

Mobile:

Sidebar transformada em menu/hamburger.

O CRM deve funcionar bem em telas pequenas.

Cards e tabelas devem ser responsivos.

23. SEGURANÇA

Implementar:

autenticação Supabase;

RLS;

validação de inputs;

proteção contra acesso indevido aos dados;

secrets somente no backend;

nenhuma API key exposta no frontend.

Nunca colocar chaves secretas diretamente no código client-side.

24. DADOS DE DEMONSTRAÇÃO

Após o usuário criar a conta, se for apropriado, utilizar dados demonstrativos claramente identificados ou permitir que o usuário pule o onboarding.

Não misturar dados fictícios com dados reais do usuário sem deixar isso claro.

25. QUALIDADE DO CÓDIGO

Quero código organizado e escalável.

Utilizar componentes reutilizáveis.

Separar:

UI

lógica

serviços

integração com IA

acesso ao banco

tipos/interfaces.

Evitar código duplicado.

Utilizar TypeScript corretamente.

Não utilizar any sem necessidade.

26. IMPORTANTE — ORDEM DE IMPLEMENTAÇÃO

Não tente criar tudo de uma vez de maneira superficial.

Implemente seguindo esta ordem:

Estrutura do projeto

Design system

Landing page

Autenticação

Banco de dados

Onboarding

Dashboard

Produtos

Leads/CRM

IA de vendas

Gerador de respostas

Follow-ups

Ofertas

Biblioteca

Configurações

Estrutura de planos

Polimento e responsividade

Depois de cada etapa, garanta que a aplicação continue funcionando.

27. RESULTADO ESPERADO

Quero um produto que, ao ser aberto pela primeira vez, passe a sensação de:

"Isso é um SaaS profissional que eu poderia pagar para usar."

Não quero:

landing page genérica;

dashboard genérico;

chatbot genérico;

funcionalidades falsas;

botões que não fazem nada;

dados hardcoded onde deveria existir banco;

telas sem integração;

design de template.

Priorize funcionalidade real + UX + aparência premium.

Comece agora criando a arquitetura e o MVP funcional do VendAI.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d4c7e7ce-17a6-4ce4-9027-db7719e5996d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
