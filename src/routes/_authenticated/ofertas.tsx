import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Copy,
  Instagram,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { AiLoading, CardsSkeleton, EmptyState } from "@/components/app/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateOffer } from "@/lib/ai.functions";
import type { OfferResult } from "@/lib/ai/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { useDeleteRow, useRows, useUpdateRow, type Row } from "@/hooks/useTable";

export const Route = createFileRoute("/_authenticated/ofertas")({
  head: () => ({
    meta: [
      { title: "Gerador de Ofertas — VendAI" },
      {
        name: "description",
        content: "Crie ofertas persuasivas com headline, benefícios, CTA e mensagens prontas.",
      },
      { property: "og:title", content: "Gerador de Ofertas — VendAI" },
      {
        property: "og:description",
        content: "Crie ofertas persuasivas com headline, benefícios, CTA e mensagens prontas.",
      },
    ],
  }),
  component: Ofertas,
});

type Offer = Row<"offers">;

const emptyGenerateForm = {
  productName: "",
  currentPrice: "",
  discount: "",
  audience: "",
  campaignGoal: "",
  deadline: "",
};

const emptyEditForm = {
  product_name: "",
  current_price: "",
  discount: "",
  target_audience: "",
  campaign_goal: "",
  deadline: "",
};

function parseOfferResult(result: Offer["result"]): OfferResult | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  return result as unknown as OfferResult;
}

function Ofertas() {
  const { data: offers = [], isLoading, isError, error, refetch } = useRows("offers");
  const updateOffer = useUpdateRow("offers");
  const deleteOffer = useDeleteRow("offers");
  const generate = useServerFn(generateOffer);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ ...emptyGenerateForm });
  const [result, setResult] = useState<OfferResult | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyEditForm });

  const mutation = useMutation({
    mutationFn: async () => generate({ data: form }),
    onSuccess: (data) => {
      setResult(data.offer);
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Oferta gerada.");
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível gerar agora."),
  });

  function openEdit(offer: Offer) {
    setEditing(offer);
    setEditForm({
      product_name: offer.product_name ?? "",
      current_price: offer.current_price ? String(offer.current_price) : "",
      discount: offer.discount ?? "",
      target_audience: offer.target_audience ?? "",
      campaign_goal: offer.campaign_goal ?? "",
      deadline: offer.deadline ?? "",
    });
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editing) return;
    const values = {
      product_name: editForm.product_name || null,
      current_price: editForm.current_price
        ? Number(editForm.current_price.replace(",", ".")) || null
        : null,
      discount: editForm.discount || null,
      target_audience: editForm.target_audience || null,
      campaign_goal: editForm.campaign_goal || null,
      deadline: editForm.deadline || null,
    };
    try {
      await updateOffer.mutateAsync({ id: editing.id, values });
      toast.success("Oferta atualizada.");
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <AppShell
      title="Gerador de Ofertas"
      subtitle="Crie campanhas persuasivas prontas para WhatsApp e Instagram."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface-panel space-y-4 rounded-2xl p-6">
          <div className="space-y-2">
            <Label>Produto ou serviço</Label>
            <Input
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              placeholder="Ex.: Consultoria de marketing"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Preço atual</Label>
              <Input
                inputMode="decimal"
                value={form.currentPrice}
                onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Desconto</Label>
              <Input
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                placeholder="Ex.: 20% ou R$ 50 off"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Público-alvo</Label>
            <Input
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Objetivo da campanha</Label>
              <Input
                value={form.campaignGoal}
                onChange={(e) => setForm({ ...form, campaignGoal: e.target.value })}
                placeholder="Ex.: esvaziar estoque"
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo da oferta</Label>
              <Input
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                placeholder="Ex.: até sexta-feira"
              />
            </div>
          </div>
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            disabled={form.productName.trim().length < 1 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Sparkles className="size-4" /> Gerar oferta
          </Button>
          <p className="text-xs text-muted-foreground">
            A oferta gerada é salva automaticamente na sua lista abaixo.
          </p>
        </div>

        <div>
          {mutation.isPending ? (
            <AiLoading label="Criando sua oferta..." />
          ) : !result ? (
            <div className="surface-panel flex h-full min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center">
              <Target className="size-7 text-primary" />
              <h3 className="mt-4 font-semibold">Sua oferta aparece aqui</h3>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                Headline, benefícios, CTA e mensagens prontas para WhatsApp e Instagram.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="surface-panel rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold">{result.offer_name}</h3>
                <p className="mt-2 text-sm font-semibold text-primary">{result.headline}</p>
                <p className="mt-3 text-sm text-muted-foreground">{result.description}</p>
                {result.benefits.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {result.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 rounded-xl bg-elevated p-3 text-center text-sm font-semibold">
                  {result.cta}
                </p>
              </div>

              <CopyBlock
                icon={MessageSquareText}
                label="Mensagem para WhatsApp"
                text={result.whatsapp_message}
              />
              <CopyBlock
                icon={Instagram}
                label="Legenda para Instagram"
                text={result.instagram_caption}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold">Ofertas criadas</h2>

        <div className="mt-4">
          {isLoading ? (
            <CardsSkeleton />
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Não foi possível carregar as ofertas</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {error instanceof Error ? error.message : "Tente novamente em instantes."}
                </span>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="size-3.5" /> Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : offers.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma oferta criada"
              description="Preencha o formulário acima e gere sua primeira oferta com IA."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onEdit={() => openEdit(offer)}
                  onDelete={() =>
                    deleteOffer.mutate(offer.id, {
                      onSuccess: () => toast.success("Oferta removida."),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar oferta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto ou serviço</Label>
              <Input
                value={editForm.product_name}
                onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Preço atual</Label>
                <Input
                  inputMode="decimal"
                  value={editForm.current_price}
                  onChange={(e) => setEditForm({ ...editForm, current_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto</Label>
                <Input
                  value={editForm.discount}
                  onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Público-alvo</Label>
              <Input
                value={editForm.target_audience}
                onChange={(e) => setEditForm({ ...editForm, target_audience: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Objetivo da campanha</Label>
                <Input
                  value={editForm.campaign_goal}
                  onChange={(e) => setEditForm({ ...editForm, campaign_goal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo da oferta</Label>
                <Input
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={submitEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function CopyBlock({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof MessageSquareText;
  label: string;
  text: string;
}) {
  return (
    <div className="surface-panel rounded-2xl p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon className="size-4" /> {label}
      </h3>
      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-elevated p-4 text-sm">{text}</p>
      <Button
        variant="hero"
        size="sm"
        className="mt-4"
        onClick={() => {
          navigator.clipboard.writeText(text);
          toast.success("Copiado.");
        }}
      >
        <Copy className="size-4" /> Copiar
      </Button>
    </div>
  );
}

function OfferCard({
  offer,
  onEdit,
  onDelete,
}: {
  offer: Offer;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const result = parseOfferResult(offer.result);

  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{offer.product_name || "Oferta sem nome"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {offer.target_audience || "Público não definido"}
          </p>
        </div>
        <Badge variant={result ? "default" : "outline"}>
          {result ? "Gerada com IA" : "Sem conteúdo"}
        </Badge>
      </div>

      {result?.headline && (
        <p className="mt-2 line-clamp-2 text-sm font-medium text-primary">{result.headline}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{formatCurrency(offer.current_price)}</span>
        {offer.discount && <span>Desconto: {offer.discount}</span>}
        {offer.deadline && <span>Prazo: {offer.deadline}</span>}
        <span>{formatDate(offer.created_at)}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="subtle" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" /> Editar
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
