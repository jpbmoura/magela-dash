import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Trophy, TrendingUp, Target, ChevronLeft, ChevronRight, Eye, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { useCompany } from "@/contexts/CompanyContext";

const ITEMS_PER_PAGE = 20;

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

function VendedorDetailModal({ vendedor, onClose }: { vendedor: any; onClose: () => void }) {
  const { selectedCompany } = useCompany();
  const codVendedor = parseInt(vendedor?.codVendedor) || 0;
  const { data: stats, isLoading: statsLoading } = trpc.equipe.getVendedorStats.useQuery(
    { codVendedor, empresa: selectedCompany ?? undefined },
    { enabled: codVendedor > 0 }
  );
  const { data: vendasPorMes, isLoading: mesLoading } = trpc.equipe.getVendedorVendasPorMes.useQuery(
    { codVendedor, empresa: selectedCompany ?? undefined },
    { enabled: codVendedor > 0 }
  );

  const meta = parseFloat(vendedor?.meta || 0);
  const totalVendas = parseFloat((stats as any)?.totalFaturamento || 0);
  const metaPct = meta > 0 ? Math.min(100, (totalVendas / meta) * 100) : 0;

  const chartMes = (vendasPorMes || []).map((d: any) => ({
    mes: d.mes || d.periodo || "—",
    "Valor (R$)": parseFloat(d.total || d.valor || 0),
  }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{vendedor.nome}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{vendedor.funcao || "Vendedor"}</span>
            {vendedor.departamento && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400">{vendedor.departamento}</span>}
          </div>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          {statsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
          ) : (
            <>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Vendas</p>
                <p className="text-sm font-bold text-primary">{formatCurrency((stats as any)?.totalFaturamento)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Qtd. Pedidos</p>
                <p className="text-sm font-bold">{(stats?.quantidadeVendas ?? 0).toLocaleString("pt-BR")}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-sm font-bold">{formatCurrency(stats?.ticketMedio)}</p>
              </div>
            </>
          )}
        </div>

        {/* Meta Progress */}
        {meta > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium">Meta: {formatCurrency(meta)}</p>
              <p className="text-sm font-bold" style={{ color: metaPct >= 100 ? "#22c55e" : metaPct >= 80 ? "#f59e0b" : "#ef4444" }}>
                {metaPct.toFixed(1)}%
              </p>
            </div>
            <Progress value={metaPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalVendas)} de {formatCurrency(meta)}
            </p>
          </div>
        )}

        {/* Evolução mensal */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Evolução Mensal</h4>
          {mesLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !chartMes.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartMes}>
                <defs>
                  <linearGradient id="colorVendedor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 10 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Valor (R$)" stroke="#6366f1" fill="url(#colorVendedor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Equipe() {
  const { selectedCompany } = useCompany();
  const [page, setPage] = useState(0);
  const [selectedVendedor, setSelectedVendedor] = useState<any>(null);

  const { data: equipePaginada, isLoading } = trpc.equipe.getPaginada.useQuery({
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
    empresa: selectedCompany ?? undefined,
  });

  const { data: ranking } = trpc.equipe.getRanking.useQuery({ limit: 15, empresa: selectedCompany ?? undefined });

  const totalPages = Math.ceil((equipePaginada?.total || 0) / ITEMS_PER_PAGE);

  const chartRanking = (ranking || []).slice(0, 10).map((v: any) => ({
    vendedor: (v.nome || "—").split(" ")[0],
    "Valor (R$)": parseFloat(v.totalFaturamento || 0),
    "Qtd": parseInt(v.quantidadeVendas || 0),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Monitor de Equipe"
        description={equipePaginada?.total ? `${equipePaginada.total} membros na equipe` : "Performance e metas da equipe de vendas"}
        accent="emerald"
      />

      <Tabs defaultValue="ranking">
        <TabsList className="mb-4">
          <TabsTrigger value="ranking">Ranking de Vendas</TabsTrigger>
          <TabsTrigger value="equipe">Equipe Completa</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking">
          <div className="grid grid-cols-5 gap-4">
            {/* Ranking list */}
            <div className="col-span-2 space-y-2">
              {!ranking?.length ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Nenhum dado disponível</p>
                  </CardContent>
                </Card>
              ) : (
                ranking.slice(0, 10).map((v: any, i: number) => {
                  const maxVal = parseFloat((ranking[0] as any)?.totalFaturamento || 1);
                  const val = parseFloat((v as any).totalFaturamento || 0);
                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  return (
                    <Card
                      key={i}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => {
                        const member = equipePaginada?.data?.find((m: any) =>
                          m.nome === v.nome || m.codVendedor?.toString() === v.codVendedor?.toString()
                        );
                        if (member) setSelectedVendedor(member);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? "bg-yellow-400/20 text-yellow-600" :
                            i === 1 ? "bg-gray-300/20 text-gray-600" :
                            i === 2 ? "bg-amber-600/20 text-amber-700" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{v.nome || "—"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-primary font-medium whitespace-nowrap">
                                {formatCurrencyShort(val)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Chart */}
            <div className="col-span-3">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Faturamento por Vendedor</CardTitle>
                </CardHeader>
                <CardContent>
                  {!chartRanking.length ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                      <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={chartRanking}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="vendedor" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} width={65} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Valor (R$)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome</th>
                      <th>Função</th>
                      <th>Departamento</th>
                      <th className="text-right">Meta</th>
                      <th className="text-center">Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    ) : !equipePaginada?.data?.length ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum membro da equipe encontrado</p>
                          <p className="text-xs mt-1">Importe um arquivo Excel para começar</p>
                        </td>
                      </tr>
                    ) : (
                      equipePaginada.data.map((m: any) => (
                        <tr key={m.id}>
                          <td className="font-mono text-xs text-muted-foreground">{m.codVendedor}</td>
                          <td className="font-medium">{m.nome}</td>
                          <td>
                            {m.funcao
                              ? <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{m.funcao}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="text-muted-foreground text-xs">{m.departamento || "—"}</td>
                          <td className="text-right font-semibold">{formatCurrency(m.meta)}</td>
                          <td className="text-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary" onClick={() => setSelectedVendedor(m)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
                  <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metas">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Progresso de Metas por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : !equipePaginada?.data?.length ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum dado de metas disponível</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {equipePaginada.data
                    .filter((m: any) => parseFloat(m.meta || 0) > 0)
                    .map((m: any) => {
                      const rankingItem = ranking?.find((r: any) =>
                        r.codVendedor?.toString() === m.codVendedor?.toString() ||
                        r.nome === m.nome
                      );
                      const totalVendas = parseFloat((rankingItem as any)?.totalFaturamento || 0);
                      const meta = parseFloat(m.meta || 0);
                      const pct = meta > 0 ? Math.min(100, (totalVendas / meta) * 100) : 0;
                      return (
                        <div key={m.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{m.nome}</p>
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">{m.funcao || "Vendedor"}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold" style={{
                                color: pct >= 100 ? "#22c55e" : pct >= 80 ? "#f59e0b" : "#ef4444"
                              }}>
                                {pct.toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatCurrencyShort(totalVendas)} / {formatCurrencyShort(meta)}
                              </span>
                            </div>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                  {equipePaginada.data.filter((m: any) => parseFloat(m.meta || 0) > 0).length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma meta cadastrada</p>
                      <p className="text-xs mt-1">As metas são importadas da planilha Excel (coluna META)</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedVendedor && (
        <VendedorDetailModal vendedor={selectedVendedor} onClose={() => setSelectedVendedor(null)} />
      )}
    </div>
  );
}
