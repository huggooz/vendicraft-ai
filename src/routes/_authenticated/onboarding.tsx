import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import { SEGMENTS, TONES } from "@/lib/constants";
import { useUpdateProfile, useUpsertBusiness } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configurar seu negócio — VendAI" },
      {
        name: "description",
        content: "Conte sobre seu negócio para a IA do VendAI vender com o seu contexto.",
      },
      { property: "og:title", content: "Configurar seu negócio — VendAI" },
      {
        property: "og:description",
        content: "Conte sobre seu negócio para a IA do VendAI vender com o seu contexto.",
      },
    ],
  }),
  component: Onboarding,
});

interface DraftProduct {
  name: string;
  description: string;
  price: string;
  benefits: string;
}

const STEPS = ["Seu negócio", "Seus clientes", "O que você vende", "Tom de voz"];

function Onboarding() {
  const navigate = useNavigate();
  const upsertBusiness = useUpsertBusiness();
  const updateProfile = useUpdateProfile();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [needs, setNeeds] = useState("");
  const [tone, setTone] = useState("profissional");
  const [products, setProducts] = useState<DraftProduct[]>([
    { name: "", description: "", price: "", benefits: "" },
  ]);

  function updateProduct(index: number, patch: Partial<DraftProduct>) {
    setProducts((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function finish(skip = false) {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");

      if (!skip) {
        await upsertBusiness.mutateAsync({
          name: name.trim() || "Meu negócio",
          segment,
          description,
          target_audience: audience,
          price_range: priceRange,
          customer_needs: needs,
          tone,
        });

        const validProducts = products.filter((product) => product.name.trim());
        if (validProducts.length > 0) {
          const { error } = await supabase.from("products").insert(
            validProducts.map((product) => ({
              user_id: auth.user.id,
              name: product.name.trim(),
              description: product.description || null,
              price: product.price ? Number(product.price.replace(",", ".")) || null : null,
              benefits: product.benefits || null,
            })),
          );
          if (error) throw error;
        }
      }

      await updateProfile.mutateAsync({ onboarding_completed: true, default_tone: tone });
      toast.success(
        skip
          ? "Você pode configurar depois em Configurações."
          : "Tudo pronto! Bem-vindo ao VendAI.",
      );
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const canAdvance =
    step === 0 ? name.trim().length > 1 : step === 1 ? audience.trim().length > 2 : true;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-hero px-5 py-10">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-25" />
      <div className="relative w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => finish(true)} disabled={saving}>
            Pular por agora
          </Button>
        </div>

        <div className="surface-panel rounded-3xl p-7 shadow-elevated sm:p-9">
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {STEPS.map((label, index) => (
              <span
                key={label}
                className={cn(
                  "flex items-center gap-1.5",
                  index === step
                    ? "text-primary"
                    : index < step
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {index < step ? <Check className="size-3" /> : <span>{index + 1}.</span>} {label}
              </span>
            ))}
          </div>

          <div className="mt-8 space-y-5">
            {step === 0 && (
              <>
                <Header
                  title="Vamos conhecer seu negócio."
                  subtitle="A IA usa essas informações em toda resposta."
                />
                <Field label="Nome do negócio">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Studio Bella"
                  />
                </Field>
                <Field label="Segmento">
                  <Select value={segment} onValueChange={setSegment}>
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
                </Field>
                <Field label="Descrição do negócio">
                  <Textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="O que você faz, como entrega e o que te diferencia."
                  />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Header
                  title="Quem são seus clientes?"
                  subtitle="Quanto mais específico, melhor a IA vende."
                />
                <Field label="Público-alvo">
                  <Input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Ex.: mulheres de 25 a 45 anos da zona sul"
                  />
                </Field>
                <Field label="Faixa de preço">
                  <Input
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    placeholder="Ex.: R$ 90 a R$ 450 por atendimento"
                  />
                </Field>
                <Field label="Principais necessidades dos clientes">
                  <Textarea
                    rows={4}
                    value={needs}
                    onChange={(e) => setNeeds(e.target.value)}
                    placeholder="O que eles querem resolver, o que mais perguntam, o que costuma travar a compra."
                  />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Header
                  title="O que você vende?"
                  subtitle="Cadastre pelo menos um produto ou serviço."
                />
                <div className="space-y-4">
                  {products.map((product, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-border bg-elevated/60 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Item {index + 1}
                        </span>
                        {products.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setProducts((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          value={product.name}
                          onChange={(e) => updateProduct(index, { name: e.target.value })}
                          placeholder="Nome do produto/serviço"
                        />
                        <Input
                          value={product.price}
                          onChange={(e) => updateProduct(index, { price: e.target.value })}
                          placeholder="Preço (ex.: 149,90)"
                          inputMode="decimal"
                        />
                      </div>
                      <Textarea
                        className="mt-3"
                        rows={2}
                        value={product.description}
                        onChange={(e) => updateProduct(index, { description: e.target.value })}
                        placeholder="Descrição"
                      />
                      <Textarea
                        className="mt-3"
                        rows={2}
                        value={product.benefits}
                        onChange={(e) => updateProduct(index, { benefits: e.target.value })}
                        placeholder="Benefícios principais"
                      />
                    </div>
                  ))}
                  <Button
                    variant="subtle"
                    onClick={() =>
                      setProducts((prev) => [
                        ...prev,
                        { name: "", description: "", price: "", benefits: "" },
                      ])
                    }
                  >
                    <Plus className="size-4" /> Adicionar outro
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <Header
                  title="Como você quer conversar?"
                  subtitle="Esse será o tom padrão das mensagens geradas."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {TONES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTone(item.value)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        tone === item.value
                          ? "border-primary/60 bg-primary/10 shadow-glow"
                          : "border-border bg-elevated/60 hover:border-primary/30",
                      )}
                    >
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-9 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                variant="hero"
                size="lg"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance}
              >
                Continuar <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button variant="hero" size="lg" onClick={() => finish(false)} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />} Concluir
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
