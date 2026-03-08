import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet";
  children?: React.ReactNode;
  className?: string;
}

const accentMap = {
  indigo: "bg-indigo-500/10 text-indigo-500",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
  sky: "bg-sky-500/10 text-sky-600",
  violet: "bg-violet-500/10 text-violet-600",
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  accent = "indigo",
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", accentMap[accent])}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
