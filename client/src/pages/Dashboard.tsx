import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, Users, Package, ShoppingCart, AlertTriangle,
  DollarSign, Warehouse, Trophy, ArrowRight, CalendarDays,
} from "lucide-react";
import { useLocation } from "wouter";
import { useCompany } from "@/contexts/CompanyContext";

function fmt(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function fmtShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return fmt(value);
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function periodLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_LABELS[m] ?? m}/${y}`;
}

function periodToDates(ym: string | undefined) {
  if (!ym) return {};
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { startDate: start, endDate: end };
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { selectedCompany } = useCompany();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  const { data: availablePeriods } = trpc.dashboard.getAvailablePeriods.useQuery({ empresa: selectedCompany ?? undefined });

  const dateFilter = useMemo(
    () => selectedPeriod === "all" ? undefined : periodToDates(selectedPeriod),
    [selectedPeriod]
  );

  const { data: metrics, isLoading } = trpc.dashboard.getMetrics.useQuery({ ...dateFilter, empresa: selectedCompany ?? undefined });
  const { data: topClientes } = trpc.dashboard.getTopClientes.useQuery({ limit: 5, empresa: selectedCompany ?? undefined });
  const { data: topProdutos } = trpc.dashboard.getTopProdutos.useQuery({ limit: 5, empresa: selectedCompany ?? undefined });
  const { data: vendedores } = trpc.dashboard.getVendedores.useQuery({ limit: 5, empresa: selectedCompany ?? undefined });
  const { data: alertas } = trpc.dashboard.getAlertas.useQuery();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do negócio em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              {(availablePeriods ?? []).map(p => (
                <SelectItem key={p} value={p}>
                  {periodLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <KPICard
              title="Faturamento Total"
              value={fmt(metrics?.totalVendas || 0)}
              icon={DollarSign}
              accent="indigo"
            />
            <KPICard
              title="Total de Vendas"
              value={(metrics?.quantidadeVendas || 0).toLocaleString("pt-BR")}
              icon={ShoppingCart}
              accent="emerald"
            />
            <KPICard
              title="Ticket Médio"
              value={fmt(metrics?.ticketMedio || 0)}
              icon={TrendingUp}
              accent="sky"
            />
            <KPICard
              title="Clientes Ativos"
              value={(metrics?.clientesCount || 0).toLocaleString("pt-BR")}
              icon={Users}
              accent="amber"
            />
          </>
        )}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          <>
            <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produtos Cadastrados</p>
                  <p className="text-xl font-bold mt-1">{(metrics?.produtosCount || 0).toLocaleString("pt-BR")}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </div>
            <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total em Estoque</p>
                  <p className="text-xl font-bold mt-1">{(metrics?.totalEstoque || 0).toLocaleString("pt-BR")} <span className="text-sm font-normal text-muted-foreground">un.</span></p>
                </div>
                <Warehouse className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </div>
            <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alertas de Estoque</p>
                  <p className={`text-xl font-bold mt-1 ${(metrics?.estoqueAlerts || 0) > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                    {metrics?.estoqueAlerts || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(metrics?.estoqueAlerts || 0) > 0 ? "Produtos com estoque baixo" : "Sem alertas"}
                  </p>
                </div>
                <AlertTriangle className={`h-8 w-8 ${(metrics?.estoqueAlerts || 0) > 0 ? "text-amber-400/40" : "text-muted-foreground/20"}`} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tables section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Clientes */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Top 5 Clientes</CardTitle>
            <button
              onClick={() => navigate("/clientes")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {!topClientes?.length ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum dado disponível</div>
            ) : (
              <div className="divide-y divide-border/50">
                {topClientes.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.fantasia || item.razaoSocial || "—"}</p>
                        <p className="text-xs text-muted-foreground">{(item.quantidadeVendas || 0).toLocaleString("pt-BR")} pedidos</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary shrink-0 ml-3">{fmtShort(Number(item.totalVendas) || 0)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Produtos */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Top 5 Produtos</CardTitle>
            <button
              onClick={() => navigate("/produtos")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {!topProdutos?.length ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum dado disponível</div>
            ) : (
              <div className="divide-y divide-border/50">
                {topProdutos.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.produto || item.nome || "—"}</p>
                        <p className="text-xs text-muted-foreground">{(item.quantidadeVendida || 0).toLocaleString("pt-BR")} unidades</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary shrink-0 ml-3">{fmtShort(item.faturamento || 0)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendedores + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Vendedores */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">Ranking de Vendedores</CardTitle>
            </div>
            <button
              onClick={() => navigate("/equipe")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Ver equipe <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {!vendedores?.length ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum dado disponível</div>
            ) : (
              <div className="divide-y divide-border/50">
                {vendedores.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        idx === 0 ? "bg-yellow-400/20 text-yellow-600" :
                        idx === 1 ? "bg-slate-300/30 text-slate-500" :
                        idx === 2 ? "bg-amber-600/20 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.nome || "—"}</p>
                        <p className="text-xs text-muted-foreground">{(item.quantidadeVendas || 0).toLocaleString("pt-BR")} vendas</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-primary">{fmtShort(item.totalFaturamento || 0)}</p>
                      <p className="text-xs text-muted-foreground">TM: {fmt(item.ticketMedio || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">Alertas Recentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!alertas?.length ? (
              <div className="px-5 py-8 text-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500/10 mb-2">
                  <AlertTriangle className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum alerta ativo</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {alertas.slice(0, 5).map((alerta: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                      alerta.severidade === "critico" ? "bg-rose-500" :
                      alerta.severidade === "aviso" ? "bg-amber-500" : "bg-sky-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alerta.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{alerta.descricao}</p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                      alerta.severidade === "critico" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                      alerta.severidade === "aviso" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                      "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                    }`}>
                      {alerta.severidade}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
