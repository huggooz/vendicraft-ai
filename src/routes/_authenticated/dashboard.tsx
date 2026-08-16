import { useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, Flame, MessageSquareText, Plus, Target, TrendingUp, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/states";
import { useProfile } from "@/hooks/useProfile";
import { useRows } from "@/hooks/useTable";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — VendAI" },
      { name: "description", content: "Resumo das suas oportunidades, leads e vendas no VendAI." },
      { property: "og:title", content: "Dashboard — VendAI" },
      { property: "og:description", content: "Resumo das suas oportunidades, leads e vendas no VendAI." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { data: leads = [], isLoading } = useRows("leads");

  useEffect(() => {
    if (profile && !profile.onboarding_completed) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  const metrics = useMemo(() => {
    const hot = leads.filter((lead) => lead.temperature === "quente").length;
    const won = leads.filter((lead) => lead.status === "ganho");
    const open = leads.filter((lead) => !["ganho", "perdido"].includes(lead.status));
    const opportunities = open.reduce((sum, lead) => sum + Number(lead.potential_value ?? 0), 0);
    const sales = won.reduce((sum, lead) => sum + Number(lead.potential_value ?? 0), 0);
    const conversion = leads.length > 0 ? Math.round((won.length / leads.length) * 100) : 0;
    return { hot, opportunities, sales, conversion, total: leads.length };
  }, [leads]);

  const timeline = useMemo(() => {
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - i);
      const label = date.toLocaleDateString("pt-BR", { month: "short" });
      const value = leads
        .filter((lead) => {
          const created = new Date(lead.created_at);
          return created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear();
        })
        .reduce((sum, lead) => sum + Number(lead.potential_value ?? 0), 0);
      months.push({ label, value });
    }
    return months;
  }, [leads]);

  const distribution = useMemo(
    () => [
      { name: "Quente", value: leads.filter((l) => l.temperature === "quente").length, color: "var(--hot)" },
      { name: "Morno", value: leads.filter((l) => l.temperature === "morno").length, color: "var(--warm)" },
      { name: "Frio", value: leads.filter((l) => l.temperature === "frio").length, color: "var(--cold)" },
    ],
    [leads],
  );

  const firstName = (profile?.full_name || "").split(" ")[0] || "vendedor";

  return (
    <AppShell
      title={loadingProfile ? "Carregando..." : `Olá, ${firstName} 👋`}
      subtitle="Aqui está um resumo das suas oportunidades."
      actions={
        <Button variant="hero" size="sm" asChild>
          <Link to="/ia-vendas">
            <Brain className="size-4" /> Analisar conversa
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Leads" value={String(metrics.total)} icon={Users} loading={isLoading} />
        <Metric label="Leads quentes" value={String(metrics.hot)} icon={Flame} accent="hot" loading={isLoading} />
        <Metric label="Oportunidades" value={formatCurrency(metrics.opportunities)} icon={Target} loading={isLoading} />
        <Metric label="Vendas" value={formatCurrency(metrics.sales)} icon={Wallet} accent="primary" loading={isLoading} />
        <Metric label="Conversão" value={`${metrics.conversion}%`} icon={TrendingUp} loading={isLoading} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface-panel rounded-2xl p-6">
          <h2 className="font-semibold">Oportunidades ao longo do tempo</h2>
          <p className="text-sm text-muted-foreground">Valor potencial dos leads criados nos últimos 6 meses.</p>
          <div className="mt-6 h-64">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={70} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#areaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="surface-panel rounded-2xl p-6">
          <h2 className="font-semibold">Distribuição dos leads</h2>
          <p className="text-sm text-muted-foreground">Por temperatura.</p>
          {metrics.total === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={Users}
                title="Nenhum lead ainda"
                description="Cadastre seu primeiro lead ou analise uma conversa para começar."
                action={
                  <Button variant="hero" size="sm" asChild>
                    <Link to="/crm">
                      <Plus className="size-4" /> Novo lead
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                      {distribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="var(--background)" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2">
                {distribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="surface-panel mt-6 rounded-2xl p-6">
        <h2 className="font-semibold">Ações rápidas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/ia-vendas" icon={Brain} label="Analisar conversa" />
          <QuickAction to="/crm" icon={Users} label="Novo lead" />
          <QuickAction to="/gerar-resposta" icon={MessageSquareText} label="Gerar resposta" />
          <QuickAction to="/ofertas" icon={Target} label="Criar oferta" />
        </div>
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "hot" | "primary";
  loading?: boolean;
}) {
  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon
          className={
            accent === "hot" ? "size-4 text-hot" : accent === "primary" ? "size-4 text-primary" : "size-4 text-muted-foreground"
          }
        />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      )}
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-elevated/60 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
