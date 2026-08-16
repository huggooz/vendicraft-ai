import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bell,
  Bot,
  Building2,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getUsage } from "@/lib/ai.functions";
import { PLANS, SEGMENTS, TONES, type PlanId } from "@/lib/constants";
import { formatDate, initials } from "@/lib/format";
import { useBusiness, useProfile, useUpdateProfile, useUpsertBusiness } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — VendAI" },
      {
        name: "description",
        content: "Gerencie seu perfil, seu negócio, as preferências da IA e seu plano.",
      },
      { property: "og:title", content: "Configurações — VendAI" },
      {
        property: "og:description",
        content: "Gerencie seu perfil, seu negócio, as preferências da IA e seu plano.",
      },
    ],
  }),
  component: Configuracoes,
});

const emptyBusinessForm = {
  name: "",
  segment: "",
  description: "",
  target_audience: "",
  price_range: "",
  customer_needs: "",
  tone: "profissional",
};

function Configuracoes() {
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { data: business, isLoading: loadingBusiness } = useBusiness();
  const updateProfile = useUpdateProfile();
  const upsertBusiness = useUpsertBusiness();
  const runGetUsage = useServerFn(getUsage);
  const usageQuery = useQuery({ queryKey: ["usage"], queryFn: () => runGetUsage() });

  const [profileForm, setProfileForm] = useState({ full_name: "", notifications_enabled: true });
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [businessForm, setBusinessForm] = useState({ ...emptyBusinessForm });
  const [businessHydrated, setBusinessHydrated] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingTone, setSavingTone] = useState(false);

  useEffect(() => {
    if (!loadingProfile && profile && !profileHydrated) {
      setProfileForm({
        full_name: profile.full_name ?? "",
        notifications_enabled: profile.notifications_enabled,
      });
      setProfileHydrated(true);
    }
  }, [profile, loadingProfile, profileHydrated]);

  useEffect(() => {
    if (!loadingBusiness && !businessHydrated) {
      setBusinessForm(
        business
          ? {
              name: business.name ?? "",
              segment: business.segment ?? "",
              description: business.description ?? "",
              target_audience: business.target_audience ?? "",
              price_range: business.price_range ?? "",
              customer_needs: business.customer_needs ?? "",
              tone: business.tone ?? "profissional",
            }
          : { ...emptyBusinessForm },
      );
      setBusinessHydrated(true);
    }
  }, [business, loadingBusiness, businessHydrated]);

  async function saveProfile() {
    if (!profileForm.full_name.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile.mutateAsync({
        full_name: profileForm.full_name.trim(),
        notifications_enabled: profileForm.notifications_enabled,
      });
      toast.success("Perfil atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveBusiness() {
    if (!businessForm.name.trim()) {
      toast.error("Informe o nome do negócio.");
      return;
    }
    setSavingBusiness(true);
    try {
      await upsertBusiness.mutateAsync({ ...businessForm, name: businessForm.name.trim() });
      toast.success("Negócio atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o negócio.");
    } finally {
      setSavingBusiness(false);
    }
  }

  async function saveTone() {
    setSavingTone(true);
    try {
      await upsertBusiness.mutateAsync({ ...businessForm });
      toast.success("Preferência de tom salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a preferência.");
    } finally {
      setSavingTone(false);
    }
  }

  const currentPlanId = (profile?.plan as PlanId) ?? "free";
  const currentPlan = PLANS[currentPlanId] ?? PLANS.free;

  return (
    <AppShell title="Configurações" subtitle="Gerencie seu perfil, seu negócio e seu plano.">
      <div className="space-y-6">
        <section className="surface-panel rounded-2xl p-6">
          <SectionHeader icon={User} title="Perfil" subtitle="Seus dados de acesso ao VendAI." />
          {loadingProfile ? (
            <Skeleton className="mt-4 h-40 rounded-xl" />
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/15 text-base text-primary">
                    {initials(profileForm.full_name || profile?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {profileForm.full_name || "Sem nome definido"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{profile?.email ?? "—"}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={profile?.email ?? ""} disabled />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-muted-foreground" />
                  <Label className="cursor-pointer">Receber notificações do VendAI</Label>
                </div>
                <Switch
                  checked={profileForm.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setProfileForm({ ...profileForm, notifications_enabled: checked })
                  }
                />
              </div>
              <Button variant="hero" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="size-4 animate-spin" />} Salvar perfil
              </Button>
            </div>
          )}
        </section>

        <section className="surface-panel rounded-2xl p-6">
          <SectionHeader
            icon={Building2}
            title="Negócio"
            subtitle="Informações que a IA usa em toda resposta."
          />
          {loadingBusiness ? (
            <Skeleton className="mt-4 h-64 rounded-xl" />
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do negócio</Label>
                  <Input
                    value={businessForm.name}
                    onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Select
                    value={businessForm.segment}
                    onValueChange={(value) => setBusinessForm({ ...businessForm, segment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição do negócio</Label>
                <Textarea
                  rows={3}
                  value={businessForm.description}
                  onChange={(e) =>
                    setBusinessForm({ ...businessForm, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Público-alvo</Label>
                  <Input
                    value={businessForm.target_audience}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, target_audience: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Faixa de preço</Label>
                  <Input
                    value={businessForm.price_range}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, price_range: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Principais necessidades dos clientes</Label>
                <Textarea
                  rows={3}
                  value={businessForm.customer_needs}
                  onChange={(e) =>
                    setBusinessForm({ ...businessForm, customer_needs: e.target.value })
                  }
                />
              </div>
              <Button variant="hero" onClick={saveBusiness} disabled={savingBusiness}>
                {savingBusiness && <Loader2 className="size-4 animate-spin" />} Salvar negócio
              </Button>
            </div>
          )}
        </section>

        <section className="surface-panel rounded-2xl p-6">
          <SectionHeader
            icon={Bot}
            title="Preferências de IA"
            subtitle="O tom padrão das mensagens geradas."
          />
          {loadingBusiness ? (
            <Skeleton className="mt-4 h-20 rounded-xl" />
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {TONES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setBusinessForm({ ...businessForm, tone: item.value })}
                    className={
                      businessForm.tone === item.value
                        ? "rounded-2xl border border-primary/60 bg-primary/10 p-4 text-left text-sm font-semibold shadow-glow"
                        : "rounded-2xl border border-border bg-elevated/60 p-4 text-left text-sm font-semibold transition-all hover:border-primary/30"
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <Button variant="hero" onClick={saveTone} disabled={savingTone}>
                {savingTone && <Loader2 className="size-4 animate-spin" />} Salvar preferência
              </Button>
            </div>
          )}
        </section>

        <section id="planos" className="surface-panel scroll-mt-24 rounded-2xl p-6">
          <SectionHeader
            icon={Sparkles}
            title="Plano e assinatura"
            subtitle="Seu uso atual e os planos disponíveis."
          />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              Plano {currentPlan.name}
            </Badge>
            {profile?.subscription_status && (
              <Badge variant="outline" className="capitalize">
                {profile.subscription_status}
              </Badge>
            )}
            {profile?.subscription_expires_at && (
              <span className="text-xs text-muted-foreground">
                Renovação/expiração: {formatDate(profile.subscription_expires_at)}
              </span>
            )}
          </div>

          <div className="mt-5">
            {usageQuery.isLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : usageQuery.isError ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Não foi possível carregar seu uso</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>Tente novamente em instantes.</span>
                  <Button variant="outline" size="sm" onClick={() => usageQuery.refetch()}>
                    <RefreshCw className="size-3.5" /> Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            ) : usageQuery.data ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <UsageBar
                  label="Análises de conversa"
                  used={usageQuery.data.analyses}
                  limit={usageQuery.data.limitAnalyses}
                />
                <UsageBar
                  label="Gerações de mensagem"
                  used={usageQuery.data.generations}
                  limit={usageQuery.data.limitGenerations}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {Object.values(PLANS).map((plan) => (
              <div
                key={plan.id}
                className={
                  plan.id === currentPlanId
                    ? "rounded-2xl border border-primary/60 bg-primary/10 p-5 shadow-glow"
                    : "rounded-2xl border border-border bg-elevated/60 p-5"
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                  {plan.id === currentPlanId && <Badge variant="secondary">Plano atual</Badge>}
                </div>
                <p className="mt-1 text-2xl font-extrabold">
                  {plan.price}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                </p>
                <ul className="mt-4 space-y-1.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.id === currentPlanId ? "subtle" : "hero"}
                  size="sm"
                  className="mt-5 w-full"
                  disabled={plan.id === currentPlanId}
                  onClick={() =>
                    toast.info(
                      "Pagamentos chegam em breve. Fale com o suporte para fazer upgrade agora.",
                    )
                  }
                >
                  {plan.id === currentPlanId ? "Plano atual" : "Fazer upgrade"}
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            O checkout e a cobrança automática ainda não estão disponíveis nesta versão.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="rounded-xl border border-border bg-elevated/60 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {used} / {limit}
        </span>
      </div>
      <Progress value={percent} className="mt-3 h-2" />
    </div>
  );
}
