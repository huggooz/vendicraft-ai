import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand";

type Mode = "login" | "signup" | "reset";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } => {
    const mode = search["mode"];
    return mode === "signup" || mode === "reset" || mode === "login" ? { mode } : {};
  },
  head: () => ({
    meta: [
      { title: "Entrar no VendAI" },
      {
        name: "description",
        content: "Acesse sua conta VendAI e transforme suas conversas em vendas.",
      },
      { property: "og:title", content: "Entrar no VendAI" },
      {
        property: "og:description",
        content: "Acesse sua conta VendAI e transforme suas conversas em vendas.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode ?? "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (name.trim().length < 2) throw new Error("Informe seu nome completo.");
        if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Vamos configurar seu negócio.");
        navigate({ to: "/onboarding" });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para o seu e-mail.");
        setMode("login");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Algo deu errado.";
      toast.error(
        message.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : message.includes("already registered")
            ? "Este e-mail já possui uma conta. Faça login."
            : message,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  const titles: Record<Mode, { title: string; subtitle: string }> = {
    login: {
      title: "Entrar na sua conta",
      subtitle: "Continue transformando conversas em vendas.",
    },
    signup: { title: "Criar conta grátis", subtitle: "Leva menos de 2 minutos e não pede cartão." },
    reset: {
      title: "Recuperar senha",
      subtitle: "Enviaremos um link para você criar uma nova senha.",
    },
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-hero px-5 py-12">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-30" />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar ao site
        </Link>

        <div className="surface-panel rounded-3xl p-8 shadow-elevated">
          <Logo />
          <h1 className="mt-7 text-2xl font-bold">{titles[mode].title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{titles[mode].subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                required
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signup"
                ? "Criar conta grátis"
                : mode === "login"
                  ? "Entrar"
                  : "Enviar link"}
            </Button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ou{" "}
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="subtle"
                size="lg"
                className="w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                Continuar com Google
              </Button>
            </>
          )}

          <p className="mt-7 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>
                Já tem conta?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("login")}>
                  Entrar
                </button>
              </>
            ) : (
              <>
                Ainda não tem conta?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                  Criar grátis
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
