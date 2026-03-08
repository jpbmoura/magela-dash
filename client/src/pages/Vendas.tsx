import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Search, ShoppingCart, TrendingUp, DollarSign, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const ITEMS_PER_PAGE = 50;
const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e"];

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return formatCurrency(value);
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return "—"; }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.name?.toLowerCase().includes("valor")
            ? formatCurrency(p.value)
            : p.value?.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
};

export default function Vendas() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    clearTimeout((window as any)._searchTimeout);
    (window as any)._searchTimeout = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const { data: metrics } = trpc.vendas.getMetrics.useQuery({});
  const { data: vendasPorMes, isLoading: loadingMes } = trpc.vendas.getPorMes.useQuery({ meses: 12 });
  const { data: vendasPorCategoria } = trpc.vendas.getPorCategoria.useQuery();
  const { data: vendasPorCanal } = trpc.vendas.getPorCanal.useQuery();
  const { data: topProdutos } = trpc.dashboard.getTopProdutos.useQuery({ limit: 10 });
  const { data: vendasPaginadas, isLoading: loadingVendas } = trpc.vendas.getPaginadas.useQuery({
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
  });

  const totalPages = Math.ceil((vendasPaginadas?.total || 0) / ITEMS_PER_PAGE);

  const chartMes = (vendasPorMes || []).map((d: any) => ({
    mes: d.mes || d.periodo || "—",
    "Valor (R$)": parseFloat(d.total || d.valor || 0),
    "Qtd. Vendas": parseInt(d.quantidade || d.qtd || 0),
  }));

  const chartCategoria = (vendasPorCategoria || []).slice(0, 6).map((d: any) => ({
    name: d.categoria || d.descCategoria || "Outros",
    value: parseFloat(d.total || d.valor || 0),
  }));

  const chartCanal = (vendasPorCanal || []).map((d: any) => ({
    canal: d.canal || "—",
    "Valor (R$)": parseFloat(d.total || d.valor || 0),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShoppingCart}
        title="Monitor de Vendas"
        description="Análise de performance comercial e evolução de vendas"
        accent="indigo"
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Faturamento Total", value: formatCurrencyShort(parseFloat(String(metrics?.total ?? 0))), Icon: DollarSign, color: "text-indigo-500", bg: "bg-indigo-500/10", bar: "bg-indigo-500" },
          { label: "Qtd. de Vendas", value: (metrics?.quantidade ?? 0).toLocaleString("pt-BR"), Icon: ShoppingCart, color: "text-violet-500", bg: "bg-violet-500/10", bar: "bg-violet-500" },
          { label: "Ticket Médio", value: formatCurrency(metrics?.ticketMedio), Icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", bar: "bg-emerald-500" },
        ].map(kpi => (
          <div key={kpi.label} className="relative rounded-xl border bg-card px-5 py-4 shadow-sm overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${kpi.bar}`} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className="text-xl font-bold mt-1">{kpi.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                <kpi.Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="evolucao">
        <TabsList className="mb-4">
          <TabsTrigger value="evolucao">Evolução Mensal</TabsTrigger>
          <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
          <TabsTrigger value="canal">Por Canal</TabsTrigger>
          <TabsTrigger value="produtos">Top Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucao">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Faturamento Mensal (últimos 12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMes ? (
                <Skeleton className="h-64 w-full" />
              ) : !chartMes.length ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartMes}>
                    <defs>
                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Valor (R$)" stroke="#6366f1" fill="url(#colorValor)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categoria">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Vendas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {!chartCategoria.length ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                </div>
              ) : (
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={260}>
                    <PieChart>
                      <Pie data={chartCategoria} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {chartCategoria.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {chartCategoria.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground truncate max-w-[140px]">{d.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="canal">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Vendas por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              {!chartCanal.length ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartCanal} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="canal" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Valor (R$)" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top 10 Produtos por Faturamento</CardTitle>
            </CardHeader>
            <CardContent>
              {!topProdutos?.length ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                </div>
              ) : (
                <div className="space-y-2">
                  {topProdutos.map((p: any, i: number) => {
                    const maxVal = parseFloat((topProdutos[0] as any)?.faturamento || 1);
                    const val = parseFloat((p as any).faturamento || 0);
                    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium truncate max-w-[300px]">{p.produto || p.codProduto}</span>
                            <span className="text-sm font-semibold text-primary ml-2">{formatCurrency((p as any).faturamento)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Registros de Vendas</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9 w-52 h-8 text-sm" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
              <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Produto</th>
                  <th>Vendedor</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">Valor</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingVendas ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : !vendasPaginadas?.data?.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma venda encontrada</p>
                      {!debouncedSearch && <p className="text-xs mt-1">Importe um arquivo Excel para começar</p>}
                    </td>
                  </tr>
                ) : (
                  vendasPaginadas.data.map((v: any) => (
                    <tr key={v.id}>
                      <td className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(v.emissaoData)}</td>
                      <td className="max-w-[160px] truncate font-medium">{v.razaoSocial || v.cliente || "—"}</td>
                      <td className="max-w-[160px] truncate text-muted-foreground">{v.produto || "—"}</td>
                      <td className="text-muted-foreground text-xs">{v.vendedor || "—"}</td>
                      <td className="text-right">{v.qtdUndVda ?? "—"}</td>
                      <td className="text-right font-semibold">{formatCurrency(v.vlrVda)}</td>
                      <td className="text-center">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">{v.status || "—"}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} &mdash; {vendasPaginadas?.total?.toLocaleString("pt-BR")} registros</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
