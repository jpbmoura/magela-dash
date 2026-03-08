import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
}

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </Card>
  );
}
