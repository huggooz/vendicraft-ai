import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
        <span className="font-display text-sm font-extrabold text-primary-foreground">V</span>
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight">
          Vend<span className="text-gradient">AI</span>
        </span>
      )}
    </span>
  );
}
