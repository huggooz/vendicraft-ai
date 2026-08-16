import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { CardsSkeleton, EmptyState } from "@/components/app/states";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateFollowUp } from "@/lib/ai.functions";
import { FOLLOW_UP_STYLES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useCreateRow, useDeleteRow, useRows, useUpdateRow, type Row } from "@/hooks/useTable";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — VendAI" },
      {
        name: "description",
        content: "Organize os follow-ups pendentes e gere mensagens de reengajamento com IA.",
      },
      { property: "og:title", content: "Follow-ups — VendAI" },
      {
        property: "og:description",
        content: "Organize os follow-ups pendentes e gere mensagens de reengajamento com IA.",
      },
    ],
  }),
  component: FollowUps,
});

type FollowUp = Row<"follow_ups">;

const STATUS_META = {
  pendente: { label: "Pendente", badge: "secondary" as const },
  enviado: { label: "Enviado", badge: "default" as const },
  concluido: { label: "Concluído", badge: "outline" as const },
};

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const emptyForm = {
  customer_name: "",
  context: "",
  last_contact_date: "",
  reason: "",
  goal: "",
  style: FOLLOW_UP_STYLES[0].value as string,
  lead_id: "none",
};

function FollowUps() {
  const { data: followUps = [], isLoading, isError, error, refetch } = useRows("follow_ups");
  const { data: leads = [] } = useRows("leads");
  const createFollowUp = useCreateRow("follow_ups");
  const updateFollowUp = useUpdateRow("follow_ups");
  const deleteFollowUp = useDeleteRow("follow_ups");
  const generate = useServerFn(generateFollowUp);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (followUp: FollowUp) =>
      generate({
        data: {
          customerName: followUp.customer_name,
          context: followUp.context ?? "",
          lastContactDate: followUp.last_contact_date ?? "",
          reason: followUp.reason ?? "",
          goal: followUp.goal ?? "",
          style: followUp.style,
        },
      }),
  });

  const filtered = useMemo(
    () =>
      statusFilter === "todos"
        ? followUps
        : followUps.filter((item) => item.status === statusFilter),
    [followUps, statusFilter],
  );

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(followUp: FollowUp) {
    setEditing(followUp);
    setForm({
      customer_name: followUp.customer_name,
      context: followUp.context ?? "",
      last_contact_date: followUp.last_contact_date ?? "",
      reason: followUp.reason ?? "",
      goal: followUp.goal ?? "",
      style: followUp.style,
      lead_id: followUp.lead_id ?? "none",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.customer_name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const values = {
      customer_name: form.customer_name.trim(),
      context: form.context || null,
      last_contact_date: form.last_contact_date || null,
      reason: form.reason || null,
      goal: form.goal || null,
      style: form.style,
      lead_id: form.lead_id === "none" ? null : form.lead_id,
    };
    try {
      if (editing) await updateFollowUp.mutateAsync({ id: editing.id, values });
      else await createFollowUp.mutateAsync(values);
      toast.success(editing ? "Follow-up atualizado." : "Follow-up criado.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function generateMessage(followUp: FollowUp) {
    setGeneratingId(followUp.id);
    try {
      const result = await generateMutation.mutateAsync(followUp);
      await updateFollowUp.mutateAsync({ id: followUp.id, values: { message: result.message } });
      toast.success("Mensagem gerada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar agora.");
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <AppShell
      title="Follow-ups"
      subtitle="Reengaje clientes que ainda não fecharam a compra."
      actions={
        <Button variant="hero" size="sm" onClick={openNew}>
          <Plus className="size-4" /> Novo follow-up
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "todos" ? "subtle" : "ghost"}
          size="sm"
          onClick={() => setStatusFilter("todos")}
        >
          Todos
        </Button>
        {STATUS_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={statusFilter === option.value ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <CardsSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Não foi possível carregar os follow-ups</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error instanceof Error ? error.message : "Tente novamente em instantes."}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Repeat2}
          title={
            followUps.length === 0 ? "Nenhum follow-up cadastrado" : "Nenhum follow-up nesse status"
          }
          description="Cadastre um follow-up e deixe a IA escrever a mensagem de reengajamento."
          action={
            <Button variant="hero" onClick={openNew}>
              <Plus className="size-4" /> Novo follow-up
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((followUp) => (
            <FollowUpCard
              key={followUp.id}
              followUp={followUp}
              generating={generatingId === followUp.id}
              onGenerate={() => generateMessage(followUp)}
              onEdit={() => openEdit(followUp)}
              onDelete={() =>
                deleteFollowUp.mutate(followUp.id, {
                  onSuccess: () => toast.success("Follow-up removido."),
                })
              }
              onStatusChange={(status) =>
                updateFollowUp.mutate({ id: followUp.id, values: { status } })
              }
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar follow-up" : "Novo follow-up"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do cliente</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data do último contato</Label>
                <Input
                  type="date"
                  value={form.last_contact_date}
                  onChange={(e) => setForm({ ...form, last_contact_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vincular a um lead (opcional)</Label>
              <Select
                value={form.lead_id}
                onValueChange={(value) => setForm({ ...form, lead_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum lead</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contexto</Label>
              <Textarea
                rows={2}
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
                placeholder="Ex.: cliente pediu orçamento e sumiu"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Motivo do contato</Label>
                <Input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Input
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  placeholder="Ex.: fechar a venda"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estilo da mensagem</Label>
              <Select
                value={form.style}
                onValueChange={(value) => setForm({ ...form, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_STYLES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={submit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function FollowUpCard({
  followUp,
  generating,
  onGenerate,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  followUp: FollowUp;
  generating: boolean;
  onGenerate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}) {
  const status = STATUS_META[followUp.status as keyof typeof STATUS_META] ?? STATUS_META.pendente;
  const styleLabel =
    FOLLOW_UP_STYLES.find((item) => item.value === followUp.style)?.label ?? followUp.style;

  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{followUp.customer_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {followUp.reason || "Motivo não informado"}
          </p>
        </div>
        <Badge variant={status.badge}>{status.label}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Último contato: {formatDate(followUp.last_contact_date)}</span>
        <span>{styleLabel}</span>
      </div>

      {followUp.message ? (
        <p className="mt-3 line-clamp-4 whitespace-pre-wrap rounded-xl bg-elevated p-3 text-sm">
          {followUp.message}
        </p>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Mensagem ainda não gerada
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="hero" size="sm" disabled={generating} onClick={onGenerate}>
          {generating ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {followUp.message ? "Regenerar" : "Gerar com IA"}
        </Button>
        {followUp.message && (
          <Button
            variant="subtle"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(followUp.message ?? "");
              toast.success("Mensagem copiada.");
            }}
          >
            <Copy className="size-3.5" /> Copiar
          </Button>
        )}
        {followUp.message && followUp.status !== "enviado" && (
          <Button variant="outline" size="sm" onClick={() => onStatusChange("enviado")}>
            <Send className="size-3.5" /> Marcar como enviado
          </Button>
        )}
        <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={onDelete}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
