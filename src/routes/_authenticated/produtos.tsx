import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { CardsSkeleton, EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { useCreateRow, useDeleteRow, useRows, useUpdateRow, type Row } from "@/hooks/useTable";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e Serviços — VendAI" },
      { name: "description", content: "Cadastre seus produtos para a IA vender com informações reais." },
      { property: "og:title", content: "Produtos e Serviços — VendAI" },
      { property: "og:description", content: "Cadastre seus produtos para a IA vender com informações reais." },
    ],
  }),
  component: Produtos,
});

type Product = Row<"products">;

const empty = { name: "", description: "", price: "", benefits: "", target_audience: "", commercial_notes: "" };

function Produtos() {
  const { data: products = [], isLoading } = useRows("products");
  const create = useCreateRow("products");
  const update = useUpdateRow("products");
  const remove = useDeleteRow("products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...empty });

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: product.price ? String(product.price) : "",
      benefits: product.benefits ?? "",
      target_audience: product.target_audience ?? "",
      commercial_notes: product.commercial_notes ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) return toast.error("Informe o nome do produto.");
    const values = {
      name: form.name.trim(),
      description: form.description || null,
      price: form.price ? Number(form.price.replace(",", ".")) || null : null,
      benefits: form.benefits || null,
      target_audience: form.target_audience || null,
      commercial_notes: form.commercial_notes || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, values });
      else await create.mutateAsync(values);
      toast.success("Produto salvo.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    }
  }

  return (
    <AppShell
      title="Produtos e Serviços"
      subtitle="A IA só usa preços e informações que você cadastrar aqui."
      actions={
        <Button variant="hero" size="sm" onClick={openNew}>
          <Plus className="size-4" /> Novo produto
        </Button>
      }
    >
      {isLoading ? (
        <CardsSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Cadastre o que você vende para a IA gerar respostas com preços corretos."
          action={
            <Button variant="hero" onClick={openNew}>
              <Plus className="size-4" /> Novo produto
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="surface-panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{product.name}</h2>
                <span className="shrink-0 font-display font-bold text-primary">{formatCurrency(product.price)}</span>
              </div>
              {product.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{product.description}</p>
              )}
              {product.benefits && (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Benefícios: </span>
                  {product.benefits}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="subtle" size="sm" onClick={() => openEdit(product)}>
                  <Pencil className="size-3.5" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate(product.id, { onSuccess: () => toast.success("Produto removido.") })}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Preço</Label>
                <Input
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Benefícios</Label>
              <Textarea rows={2} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Público-alvo</Label>
              <Input value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações comerciais</Label>
              <Textarea
                rows={2}
                value={form.commercial_notes}
                onChange={(e) => setForm({ ...form, commercial_notes: e.target.value })}
              />
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
