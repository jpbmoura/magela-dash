import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatMiniProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconClass?: string;
  className?: string;
}

export function StatMini({ label, value, icon: Icon, iconClass, className }: StatMiniProps) {
  return (
    <div className={cn("rounded-xl border bg-card px-4 py-3.5 shadow-sm flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-bold mt-0.5 truncate">{value}</p>
      </div>
      {Icon && (
        <Icon className={cn("h-7 w-7 shrink-0 opacity-25", iconClass)} />
      )}
    </div>
  );
}
