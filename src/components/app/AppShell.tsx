import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Brain,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  Repeat2,
  Settings,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { initials } from "@/lib/format";
import { PLANS, type PlanId } from "@/lib/constants";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ia-vendas", label: "IA de Vendas", icon: Brain },
  { to: "/gerar-resposta", label: "Gerar Resposta", icon: MessageSquareText },
  { to: "/follow-ups", label: "Follow-ups", icon: Repeat2 },
  { to: "/crm", label: "CRM", icon: Users },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/ofertas", label: "Ofertas", icon: Target },
  { to: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SidebarContent onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
              {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const plan = PLANS[(profile?.plan as PlanId) ?? "free"] ?? PLANS.free;

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta.");
    navigate({ to: "/" });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className={cn("size-4.5", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-4">
        <div className="rounded-2xl bg-elevated p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Plano atual</p>
          <p className="mt-1 font-display font-bold">{plan.name.toUpperCase()}</p>
          {profile?.plan !== "pro" && profile?.plan !== "anual" && (
            <Button variant="hero" size="sm" className="mt-3 w-full" asChild onClick={onNavigate}>
              <Link to="/configuracoes" hash="planos">
                <Sparkles className="size-3.5" /> Fazer upgrade
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-xl px-1 py-1">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/15 text-xs text-primary">
              {initials(profile?.full_name || profile?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.full_name || "Minha conta"}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
