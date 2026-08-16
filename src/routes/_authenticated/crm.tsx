import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Pencil, Plus, Snowflake, Thermometer, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_STAGES, TEMPERATURES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCreateRow, useDeleteRow, useRows, useUpdateRow, type Row } from "@/hooks/useTable";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "CRM de Leads — VendAI" },
      { name: "description", content: "Organize seus leads por etapa e acompanhe cada oportunidade de venda." },
      { property: "og:title", content: "CRM de Leads — VendAI" },
      { property: "og:description", content: "Organize seus leads por etapa e acompanhe cada oportunidade de venda." },
    ],
  }),
  component: Crm,
});

type Lead = Row<"leads">;

const emptyLead = {
  name: "",
  phone: "",
  email: "",
  product_interest: "",
  potential_value: "",
  status: "novo",
  temperature: "morno",
  notes: "",
};

function Crm() {
  const { data: leads = [], isLoading } = useRows("leads");
  const createLead = useCreateRow("leads");
  const updateLead = useUpdateRow("leads");
  const deleteLead = useDeleteRow("leads");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState({ ...emptyLead });
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => leads.filter((lead) => lead.name.toLowerCase().includes(search.toLowerCase())),
    [leads, search],
  );

  function openNew() {
    setEditing(null);
    setForm({ ...emptyLead });
    setOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      name: lead.name,
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      product_interest: lead.product_interest ?? "",
      potential_value: lead.potential_value ? String(lead.potential_value) : "",
      status: lead.status,
      temperature: lead.temperature,
      notes: lead.notes ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    const values = {
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      product_interest: form.product_interest || null,
      potential_value: form.potential_value ? Number(form.potential_value.replace(",", ".")) || null : null,
      status: form.status,
      temperature: form.temperature,
      notes: form.notes || null,
    };
    if (!values.name) return toast.error("Informe o nome do lead.");
    try {
      if (editing) await updateLead.mutateAsync({ id: editing.id, values });
      else await createLead.mutateAsync(values);
      toast.success(editing ? "Lead atualizado." : "Lead criado.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    }
  }

  return (
    <AppShell
      title="CRM de Leads"
      subtitle="Cada card é uma oportunidade de venda."
      actions={
        <Button variant="hero" size="sm" onClick={openNew}>
          <Plus className="size-4" /> Novo lead
        </Button>
      }
    >
      <div className="mb-5 max-w-sm">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead pelo nome..." />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Seu CRM está vazio"
          description="Cadastre o primeiro lead para acompanhar o funil de vendas."
          action={
            <Button variant="hero" onClick={openNew}>
              <Plus className="size-4" /> Novo lead
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {LEAD_STAGES.map((stage) => {
            const stageLeads = filtered.filter((lead) => lead.status === stage.id);
            return (
              <div key={stage.id} className="surface-panel rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{stage.label}</h2>
                  <Badge variant="secondary">{stageLeads.length}</Badge>
                </div>
                <div className="mt-3 space-y-3">
                  {stageLeads.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      Nenhum lead aqui
                    </p>
                  )}
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onEdit={() => openEdit(lead)}
                      onDelete={() =>
                        deleteLead.mutate(lead.id, { onSuccess: () => toast.success("Lead removido.") })
                      }
                      onMove={(status) => updateLead.mutate({ id: lead.id, values: { status } })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lead" : "Novo lead"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Interesse</Label>
                <Input
                  value={form.product_interest}
                  onChange={(e) => setForm({ ...form, product_interest: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor potencial</Label>
                <Input
                  inputMode="decimal"
                  value={form.potential_value}
                  onChange={(e) => setForm({ ...form, potential_value: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Etapa</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperatura</Label>
                <Select value={form.temperature} onValueChange={(value) => setForm({ ...form, temperature: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPERATURES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.emoji} {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Anotações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

function LeadCard({
  lead,
  onEdit,
  onDelete,
  onMove,
}: {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: string) => void;
}) {
  const Icon = lead.temperature === "quente" ? Flame : lead.temperature === "frio" ? Snowflake : Thermometer;
  const color =
    lead.temperature === "quente" ? "text-hot" : lead.temperature === "frio" ? "text-cold" : "text-warm";

  return (
    <div className="rounded-xl border border-border bg-elevated/70 p-3 transition-colors hover:border-primary/35">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{lead.name}</p>
          <p className="truncate text-xs text-muted-foreground">{lead.product_interest || "Sem interesse definido"}</p>
        </div>
        <Icon className={cn("size-4 shrink-0", color)} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium">{formatCurrency(lead.potential_value)}</span>
        <span className="text-muted-foreground">{formatDate(lead.created_at)}</span>
      </div>
      <div className="mt-3 flex items-center gap-1">
        <Select value={lead.status} onValueChange={onMove}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STAGES.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
