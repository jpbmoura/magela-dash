import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "sky";
  className?: string;
}

const accentMap = {
  indigo: {
    icon: "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-400",
    bar:  "bg-indigo-500",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    bar:  "bg-emerald-500",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    bar:  "bg-amber-500",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    bar:  "bg-rose-500",
  },
  sky: {
    icon: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    bar:  "bg-sky-500",
  },
};

export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = "indigo",
  className,
}: KPICardProps) {
  const colors = accentMap[accent];
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div className={cn("relative rounded-xl border bg-card p-5 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-200", className)}>
      {/* Accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", colors.bar)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-2 tracking-tight text-foreground">{value}</p>
          {trend !== undefined && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {isPositive
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(trend)}% {trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", colors.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
