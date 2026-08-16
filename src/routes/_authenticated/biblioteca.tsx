import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, BookOpen, Copy, Pencil, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGE_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCreateRow, useDeleteRow, useRows, useUpdateRow, type Row } from "@/hooks/useTable";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Mensagens — VendAI" },
      { name: "description", content: "Salve e reutilize as mensagens que mais vendem." },
      { property: "og:title", content: "Biblioteca de Mensagens — VendAI" },
      { property: "og:description", content: "Salve e reutilize as mensagens que mais vendem." },
    ],
  }),
  component: Biblioteca,
});

type SavedMessage = Row<"saved_messages">;

function categoryLabel(value: string): string {
  return MESSAGE_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

const emptyForm = {
  title: "",
  category: MESSAGE_CATEGORIES[0].value as string,
  content: "",
  is_favorite: false,
};

function Biblioteca() {
  const { data: messages = [], isLoading, isError, error, refetch } = useRows("saved_messages");
  const createMessage = useCreateRow("saved_messages");
  const updateMessage = useUpdateRow("saved_messages");
  const deleteMessage = useDeleteRow("saved_messages");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavedMessage | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return messages.filter((message) => {
      if (categoryFilter !== "todas" && message.category !== categoryFilter) return false;
      if (favoritesOnly && !message.is_favorite) return false;
      if (!term) return true;
      return (
        message.title.toLowerCase().includes(term) || message.content.toLowerCase().includes(term)
      );
    });
  }, [messages, search, categoryFilter, favoritesOnly]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(message: SavedMessage) {
    setEditing(message);
    setForm({
      title: message.title,
      category: message.category,
      content: message.content,
      is_favorite: message.is_favorite,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.title.trim()) {
      toast.error("Informe um título para a mensagem.");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Informe o conteúdo da mensagem.");
      return;
    }
    const values = {
      title: form.title.trim(),
      category: form.category,
      content: form.content.trim(),
      is_favorite: form.is_favorite,
    };
    try {
      if (editing) await updateMessage.mutateAsync({ id: editing.id, values });
      else await createMessage.mutateAsync(values);
      toast.success(editing ? "Mensagem atualizada." : "Mensagem salva.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
    toast.success("Mensagem copiada.");
  }

  return (
    <AppShell
      title="Biblioteca de Mensagens"
      subtitle="Encontre e reutilize as mensagens que mais convertem."
      actions={
        <Button variant="hero" size="sm" onClick={openNew}>
          <Plus className="size-4" /> Nova mensagem
        </Button>
      }
    >
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou conteúdo..."
            className="max-w-sm"
          />
          <Button
            variant={favoritesOnly ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setFavoritesOnly((value) => !value)}
          >
            <Star className={cn("size-3.5", favoritesOnly && "fill-primary text-primary")} />{" "}
            Favoritas
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === "todas" ? "subtle" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter("todas")}
          >
            Todas
          </Button>
          {MESSAGE_CATEGORIES.map((item) => (
            <Button
              key={item.value}
              variant={categoryFilter === item.value ? "subtle" : "ghost"}
              size="sm"
              onClick={() => setCategoryFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <CardsSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Não foi possível carregar a biblioteca</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error instanceof Error ? error.message : "Tente novamente em instantes."}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            messages.length === 0 ? "Sua biblioteca está vazia" : "Nenhuma mensagem encontrada"
          }
          description={
            messages.length === 0
              ? "Salve as melhores mensagens de Gerar Resposta e Follow-ups, ou crie uma agora."
              : "Ajuste a busca ou os filtros para encontrar a mensagem certa."
          }
          action={
            messages.length === 0 ? (
              <Button variant="hero" onClick={openNew}>
                <Plus className="size-4" /> Nova mensagem
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onCopy={() => copyMessage(message.content)}
              onEdit={() => openEdit(message)}
              onDelete={() =>
                deleteMessage.mutate(message.id, {
                  onSuccess: () => toast.success("Mensagem removida."),
                })
              }
              onToggleFavorite={() =>
                updateMessage.mutate({
                  id: message.id,
                  values: { is_favorite: !message.is_favorite },
                })
              }
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar mensagem" : "Nova mensagem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                rows={6}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Escreva a mensagem pronta para enviar ao cliente..."
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <Label className="cursor-pointer">Marcar como favorita</Label>
              <Switch
                checked={form.is_favorite}
                onCheckedChange={(checked) => setForm({ ...form, is_favorite: checked })}
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

function MessageCard({
  message,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  message: SavedMessage;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="surface-panel flex flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{message.title}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="secondary">{categoryLabel(message.category)}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(message.created_at)}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onToggleFavorite}>
          <Star className={cn("size-4", message.is_favorite && "fill-primary text-primary")} />
        </Button>
      </div>

      <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap rounded-xl bg-elevated p-3 text-sm">
        {message.content}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="hero" size="sm" onClick={onCopy}>
          <Copy className="size-3.5" /> Copiar
        </Button>
        <Button variant="subtle" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" /> Editar
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={onDelete}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
