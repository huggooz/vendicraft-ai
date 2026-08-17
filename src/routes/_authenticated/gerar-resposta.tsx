import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Copy, MessageSquareText, RefreshCw, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { AiLoading } from "@/components/app/states";
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
import { generateReply } from "@/lib/ai.functions";
import { REPLY_GOALS, REPLY_VARIANTS } from "@/lib/constants";
import { useCreateRow } from "@/hooks/useTable";

export const Route = createFileRoute("/_authenticated/gerar-resposta")({
  head: () => ({
    meta: [
      { title: "Gerar Resposta — VendAI" },
      {
        name: "description",
        content: "Gere mensagens de venda prontas para o WhatsApp em segundos.",
      },
      { property: "og:title", content: "Gerar Resposta — VendAI" },
      {
        property: "og:description",
        content: "Gere mensagens de venda prontas para o WhatsApp em segundos.",
      },
    ],
  }),
  component: GerarResposta,
});

function GerarResposta() {
  const run = useServerFn(generateReply);
  const saveMessage = useCreateRow("saved_messages");
  const [goal, setGoal] = useState<string>(REPLY_GOALS[0].value);
  const [customerMessage, setCustomerMessage] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [reply, setReply] = useState("");

  const mutation = useMutation({
    mutationFn: async (variant: string) =>
      run({ data: { goal, customerMessage, extraContext, variant } }),
    onSuccess: (result) => setReply(result.reply),
    onError: (error: Error) => toast.error(error.message || "Não foi possível gerar agora."),
  });

  return (
    <AppShell title="Gerar Resposta" subtitle="Diga o objetivo e receba a mensagem pronta.">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface-panel space-y-4 rounded-2xl p-6">
          <div className="space-y-2">
            <Label>Objetivo da mensagem</Label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPLY_GOALS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mensagem do cliente</Label>
            <Textarea
              rows={5}
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              placeholder="Ex.: Achei caro, vou pensar."
            />
          </div>
          <div className="space-y-2">
            <Label>Informações adicionais (opcional)</Label>
            <Input
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="Ex.: cliente já comprou 2 vezes"
            />
          </div>
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            disabled={customerMessage.trim().length < 2 || mutation.isPending}
            onClick={() => mutation.mutate("")}
          >
            <MessageSquareText className="size-4" /> Gerar resposta
          </Button>
        </div>

        <div>
          {mutation.isPending ? (
            <AiLoading label="Escrevendo sua mensagem..." />
          ) : !reply ? (
            <div className="surface-panel flex h-full min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center">
              <Send className="size-7 text-primary" />
              <h3 className="mt-4 font-semibold">Sua mensagem aparece aqui</h3>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                Depois você pode pedir versões mais curtas, persuasivas ou profissionais.
              </p>
            </div>
          ) : (
            <div className="surface-panel rounded-2xl p-6">
              <p className="whitespace-pre-wrap rounded-xl bg-elevated p-4 text-sm">{reply}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(reply);
                    toast.success("Mensagem copiada.");
                  }}
                >
                  <Copy className="size-4" /> Copiar
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() =>
                    saveMessage.mutate(
                      { title: `Resposta — ${goal}`, content: reply, category: goal },
                      { onSuccess: () => toast.success("Salvo na biblioteca.") },
                    )
                  }
                >
                  <Save className="size-4" /> Salvar
                </Button>
              </div>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Gerar variação
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REPLY_VARIANTS.map((variant) => (
                    <Button
                      key={variant.value}
                      variant="outline"
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate(variant.label)}
                    >
                      <RefreshCw className="size-3.5" /> {variant.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
