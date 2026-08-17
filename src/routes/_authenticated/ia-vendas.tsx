import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Brain, Copy, Flame, Save, Snowflake, Sparkles, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { AiLoading } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzeConversation } from "@/lib/ai.functions";
import type { ConversationAnalysis } from "@/lib/ai/types";
import { useCreateRow, useRows } from "@/hooks/useTable";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ia-vendas")({
  head: () => ({
    meta: [
      { title: "IA de Vendas — VendAI" },
      {
        name: "description",
        content: "Cole a conversa do WhatsApp e receba análise, objeções e a próxima ação.",
      },
      { property: "og:title", content: "IA de Vendas — VendAI" },
      {
        property: "og:description",
        content: "Cole a conversa do WhatsApp e receba análise, objeções e a próxima ação.",
      },
    ],
  }),
  component: IaVendas,
});

const TEMP_META = {
  quente: { label: "Lead quente", icon: Flame, className: "text-hot" },
  morno: { label: "Lead morno", icon: Thermometer, className: "text-warm" },
  frio: { label: "Lead frio", icon: Snowflake, className: "text-cold" },
} as const;

function IaVendas() {
  const analyze = useServerFn(analyzeConversation);
  const { data: leads = [] } = useRows("leads");
  const saveMessage = useCreateRow("saved_messages");
  const [conversation, setConversation] = useState("");
  const [leadId, setLeadId] = useState<string>("none");
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      analyze({ data: { conversation, leadId: leadId === "none" ? null : leadId } }),
    onSuccess: (result) => {
      setAnalysis(result.analysis);
      toast.success("Análise concluída.");
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível analisar agora."),
  });

  const meta = analysis ? (TEMP_META[analysis.temperature] ?? TEMP_META.morno) : null;

  return (
    <AppShell title="IA de Vendas" subtitle="Cole a conversa e descubra como avançar essa venda.">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface-panel rounded-2xl p-6">
          <Label>Conversa com o cliente</Label>
          <Textarea
            className="mt-2 min-h-64 font-mono text-[13px]"
            value={conversation}
            onChange={(e) => setConversation(e.target.value)}
            placeholder={"Cliente: Oi, quanto custa?\nVocê: Olá! Temos pacotes a partir de..."}
          />
          <div className="mt-4 space-y-2">
            <Label>Vincular a um lead (opcional)</Label>
            <Select value={leadId} onValueChange={setLeadId}>
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
          <Button
            variant="hero"
            size="lg"
            className="mt-5 w-full"
            disabled={conversation.trim().length < 10 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Brain className="size-4" /> Analisar conversa
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            A IA usa apenas os dados do seu negócio. Nada de preços ou promessas inventadas.
          </p>
        </div>

        <div>
          {mutation.isPending ? (
            <AiLoading />
          ) : !analysis ? (
            <div className="surface-panel flex h-full min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center">
              <Sparkles className="size-7 text-primary" />
              <h3 className="mt-4 font-semibold">O resultado aparece aqui</h3>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                Temperatura do lead, intenção de compra, objeções e a mensagem pronta para enviar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="surface-panel rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={cn(
                      "flex items-center gap-2 font-display text-lg font-bold",
                      meta?.className,
                    )}
                  >
                    {meta && <meta.icon className="size-5" />} {meta?.label}
                  </span>
                  <Badge variant="secondary">{analysis.funnel_stage}</Badge>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Intenção de compra</span>
                    <span className="font-semibold">{analysis.buying_intent}%</span>
                  </div>
                  <Progress value={analysis.buying_intent} className="mt-2 h-2" />
                </div>
                <p className="mt-5 text-sm text-muted-foreground">{analysis.summary}</p>
              </div>

              <div className="surface-panel rounded-2xl p-6">
                <h3 className="font-semibold">Necessidade real do cliente</h3>
                <p className="mt-2 text-sm text-muted-foreground">{analysis.customer_need}</p>
                {analysis.objections.length > 0 && (
                  <>
                    <h3 className="mt-5 font-semibold">Objeções detectadas</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {analysis.objections.map((objection) => (
                        <Badge key={objection} variant="outline">
                          {objection}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
                <h3 className="mt-5 font-semibold">Próxima ação recomendada</h3>
                <p className="mt-2 text-sm text-muted-foreground">{analysis.next_action}</p>
              </div>

              <div className="surface-panel rounded-2xl p-6">
                <h3 className="font-semibold">Mensagem sugerida</h3>
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-elevated p-4 text-sm">
                  {analysis.suggested_reply}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(analysis.suggested_reply);
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
                        {
                          title: analysis.summary?.slice(0, 80) || "Mensagem sugerida",
                          content: analysis.suggested_reply,
                          category: "primeiro_contato",
                        },
                        { onSuccess: () => toast.success("Salvo na biblioteca.") },
                      )
                    }
                  >
                    <Save className="size-4" /> Salvar na biblioteca
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
