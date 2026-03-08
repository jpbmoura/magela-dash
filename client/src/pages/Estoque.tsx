import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Search, AlertTriangle, Package, TrendingDown, ChevronLeft, ChevronRight, BarChart3, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const ITEMS_PER_PAGE = 50;

// Limiares devem corresponder aos definidos em db.ts
const LIMIAR_CRITICO = 50;
const LIMIAR_BAIXO = 200;

function getStockColor(qty: number): string {
  if (qty <= 0) return "text-destructive";
  if (qty <= LIMIAR_CRITICO) return "text-red-500";
  if (qty <= LIMIAR_BAIXO) return "text-amber-500";
  return "text-emerald-500";
}

function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">Sem Estoque</span>;
  if (qty <= LIMIAR_CRITICO) return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400">Crítico</span>;
  if (qty <= LIMIAR_BAIXO) return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">Baixo</span>;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Normal</span>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1 truncate max-w-[200px]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toLocaleString("pt-BR")}</p>
      ))}
    </div>
  );
};

export default function Estoque() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    clearTimeout((window as any)._searchTimeout);
    (window as any)._searchTimeout = setTimeout(() => setDebouncedSearch(value), 400);
  };

  // Usa os novos endpoints que calculam estoque a partir das vendas
  const { data: resumo } = trpc.estoque.getResumo.useQuery();
  const { data: estoqueBaixo } = trpc.estoque.getBaixo.useQuery();
  const { data: estoquePaginado, isLoading } = trpc.estoque.getPaginado.useQuery({
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
  });

  const totalPages = Math.ceil((estoquePaginado?.total || 0) / ITEMS_PER_PAGE);

  // Chart data - top 10 produtos com menor estoque (excluindo zerados)
  const chartCritico = (estoqueBaixo || [])
    .filter((p: any) => Number(p.estoque) > 0)
    .slice(0, 10)
    .map((p: any) => ({
      produto: (p.produto || p.nome || String(p.codProduto) || "—").slice(0, 20),
      Estoque: Number(p.estoque ?? 0),
    }));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Warehouse}
        title="Monitor de Estoque"
        description="Estoque calculado com base nas vendas (quantidade vendida − devolvida por produto)"
        accent="amber"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total em Estoque",
            value: (resumo?.total ?? 0).toLocaleString("pt-BR") + " un.",
            Icon: Package,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            bar: "bg-indigo-500",
            valueClass: "",
          },
          {
            label: "Sem Estoque",
            value: resumo?.semEstoque ?? 0,
            Icon: AlertTriangle,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            bar: "bg-rose-500",
            valueClass: "text-rose-500",
          },
          {
            label: "Estoque Crítico",
            value: resumo?.critico ?? 0,
            Icon: TrendingDown,
            color: "text-red-500",
            bg: "bg-red-500/10",
            bar: "bg-red-500",
            valueClass: "text-red-500",
          },
          {
            label: "Estoque Baixo",
            value: resumo?.baixo ?? 0,
            Icon: AlertTriangle,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            bar: "bg-amber-500",
            valueClass: "text-amber-500",
          },
        ].map(kpi => (
          <div key={kpi.label} className="relative rounded-xl border bg-card px-4 py-3.5 shadow-sm overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${kpi.bar}`} />
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className={`text-xl font-bold mt-1 ${kpi.valueClass}`}>{kpi.value}</p>
              </div>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                <kpi.Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="alertas">
        <TabsList className="mb-4">
          <TabsTrigger value="alertas">Alertas Críticos</TabsTrigger>
          <TabsTrigger value="todos">Todos os Produtos</TabsTrigger>
          <TabsTrigger value="grafico">Visualização</TabsTrigger>
        </TabsList>

        {/* Aba: Alertas Críticos */}
        <TabsContent value="alertas">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Produtos com Estoque Crítico ou Zerado
                <span className="ml-2 text-xs font-normal text-muted-foreground">(≤ {LIMIAR_BAIXO} unidades)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!estoqueBaixo?.length ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum produto com estoque crítico</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Produto</th>
                        <th>Marca</th>
                        <th>Categoria</th>
                        <th className="text-right">Estoque</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estoqueBaixo.map((p: any, i: number) => (
                        <tr key={i}>
                          <td className="font-mono text-xs text-muted-foreground">{p.codProduto}</td>
                          <td className="font-medium max-w-[250px] truncate">{p.produto || p.nome || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.marca || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.categoria || "—"}</td>
                          <td className={`text-right font-bold ${getStockColor(Number(p.estoque ?? 0))}`}>
                            {Number(p.estoque ?? 0).toLocaleString("pt-BR")}
                          </td>
                          <td className="text-center">
                            <StockBadge qty={Number(p.estoque ?? 0)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Todos os Produtos */}
        <TabsContent value="todos">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Todos os Produtos com Estoque</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 w-52 h-8 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Marca</th>
                      <th>Categoria</th>
                      <th className="text-right">Estoque</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    ) : !estoquePaginado?.data?.length ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum produto encontrado</p>
                        </td>
                      </tr>
                    ) : (
                      estoquePaginado.data.map((p: any, i: number) => (
                        <tr key={i}>
                          <td className="font-mono text-xs text-muted-foreground">{p.codProduto}</td>
                          <td className="font-medium max-w-[220px] truncate">{p.nome || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.marca || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.categoria || "—"}</td>
                          <td className={`text-right font-bold ${getStockColor(Number(p.estoque ?? 0))}`}>
                            {Number(p.estoque ?? 0).toLocaleString("pt-BR")}
                          </td>
                          <td className="text-center">
                            <StockBadge qty={Number(p.estoque ?? 0)} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    Página {page + 1} de {totalPages} &mdash; {estoquePaginado?.total?.toLocaleString("pt-BR")} produtos
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm" className="h-7 w-7 p-0"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline" size="sm" className="h-7 w-7 p-0"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Visualização */}
        <TabsContent value="grafico">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Top 10 Produtos com Menor Estoque
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(excluindo zerados)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!chartCritico.length ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartCritico} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="produto" tick={{ fontSize: 10 }} width={140} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Estoque" radius={[0, 4, 4, 0]}>
                        {chartCritico.map((entry: any, i: number) => (
                          <Cell
                            key={i}
                            fill={
                              entry.Estoque <= 0 ? "#f43f5e"
                              : entry.Estoque <= LIMIAR_CRITICO ? "#ef4444"
                              : entry.Estoque <= LIMIAR_BAIXO ? "#f59e0b"
                              : "#6366f1"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Resumo por status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribuição por Nível de Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Sem Estoque (= 0)", value: resumo?.semEstoque ?? 0, color: "bg-rose-500" },
                    { label: `Crítico (1–${LIMIAR_CRITICO})`, value: resumo?.critico ?? 0, color: "bg-red-500" },
                    { label: `Baixo (${LIMIAR_CRITICO + 1}–${LIMIAR_BAIXO})`, value: resumo?.baixo ?? 0, color: "bg-amber-500" },
                    {
                      label: `Normal (> ${LIMIAR_BAIXO})`,
                      value: (estoquePaginado?.total ?? 0) - (resumo?.semEstoque ?? 0) - (resumo?.critico ?? 0) - (resumo?.baixo ?? 0),
                      color: "bg-emerald-500",
                    },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg border bg-card p-3">
                      <div className={`h-1 w-8 rounded-full ${item.color} mb-2`} />
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold mt-0.5">{Number(item.value).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
