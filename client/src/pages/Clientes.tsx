import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import {
  Users,
  TrendingUp,
  ShoppingCart,
  UserX,
  UserPlus,
  Award,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowUpDown,
  MapPin,
  BarChart2,
  List,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtShort = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `R$ ${(v / 1_000).toFixed(0)}K`
      : `R$ ${v.toFixed(2)}`;

const fmtFull = (v: number) =>
  `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
};

// ─── Period config ────────────────────────────────────────────────────────────
const PERIODS = [
  {
    label: "Dez/2025",
    value: "2025-12",
    start: "2025-12-01",
    end: "2025-12-31",
  },
  { label: "Todo período", value: "all", start: undefined, end: undefined },
];

type SortField = "valor" | "pedidos" | "ticket";
type Tab = "ranking" | "top-valor" | "top-pedidos" | "novos" | "inativos";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
  accentClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  iconColor: string;
  accentClass: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentClass}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg bg-muted/50 shrink-0">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Rank Badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white text-xs font-bold shrink-0">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white text-xs font-bold shrink-0">
        3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">
      {rank}
    </span>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" && p.value > 100
            ? fmtFull(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Clientes() {
  const [period, setPeriod] = useState(PERIODS[0]);
  const [tab, setTab] = useState<Tab>("ranking");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("valor");
  const [page, setPage] = useState(0);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const PAGE_SIZE = 20;

  const periodInput = useMemo(
    () => ({
      dataInicio: period.start,
      dataFim: period.end,
    }),
    [period]
  );

  const { data: kpis, isLoading: kpisLoading } =
    trpc.clientes.getKPIs.useQuery(periodInput);
  const { data: ranking, isLoading: rankingLoading } =
    trpc.clientes.getRanking.useQuery({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: search || undefined,
      orderBy: sortBy,
      ...periodInput,
    });
  const { data: topValor } = trpc.clientes.getTopPorValor.useQuery({
    limit: 10,
    ...periodInput,
  });
  const { data: topPedidos } = trpc.clientes.getTopPorPedidos.useQuery({
    limit: 10,
    ...periodInput,
  });
  const { data: inativos } = trpc.clientes.getInativos.useQuery({
    limit: 50,
    ...periodInput,
  });
  const { data: novos } = trpc.clientes.getNovos.useQuery({
    limit: 50,
    ...periodInput,
  });
  const { data: evolucao } = trpc.clientes.getEvolucaoMensal.useQuery({
    topN: 5,
  });
  const { data: stats } = trpc.clientes.getStats.useQuery(
    { codCliente: String(selectedCliente?.codCliente) },
    { enabled: !!selectedCliente }
  );

  const totalPages = Math.ceil((ranking?.total || 0) / PAGE_SIZE);

  const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"];

  // Bar chart data
  const barData = useMemo(
    () =>
      ((topValor as any[]) || []).map((c: any) => ({
        nome:
          (c.nome || "").length > 16
            ? (c.nome || "").slice(0, 16) + "…"
            : c.nome || "",
        valor: Number(c.totalComprado),
      })),
    [topValor]
  );

  // Line chart data
  const lineData = useMemo(() => {
    if (!(evolucao as any[])?.length) return [];
    const allMeses = Array.from(
      new Set(
        (evolucao as any[]).flatMap((c: any) => c.meses.map((m: any) => m.mes))
      )
    ).sort();
    return allMeses.map(mes => {
      const row: any = { mes };
      (evolucao as any[]).forEach((c: any) => {
        const k = (c.nome || `C${c.codCliente}`).slice(0, 14);
        const found = c.meses.find((m: any) => m.mes === mes);
        row[k] = found ? found.total : 0;
      });
      return row;
    });
  }, [evolucao]);

  const lineKeys = useMemo(
    () =>
      ((evolucao as any[]) || []).map((c: any) =>
        (c.nome || `C${c.codCliente}`).slice(0, 14)
      ),
    [evolucao]
  );

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "ranking", label: "Ranking Geral", icon: List },
    { id: "top-valor", label: "Top por Valor", icon: TrendingUp },
    { id: "top-pedidos", label: "Top por Pedidos", icon: ShoppingCart },
    { id: "novos", label: "Clientes Novos", icon: UserPlus },
    { id: "inativos", label: "Inativos", icon: UserX },
  ];

  return (
    <div className="space-y-5">
      {/* Header + Period */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          icon={Users}
          title="Monitor de Clientes"
          description="Rankings, análise de comportamento e segmentação de clientes"
          accent="blue"
        />
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => {
                setPeriod(p);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period.value === p.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={Users}
          label="Clientes Ativos"
          value={
            kpisLoading ? "…" : (kpis?.totalAtivos || 0).toLocaleString("pt-BR")
          }
          sub="cadastrados"
          iconColor="text-blue-500"
          accentClass="bg-blue-500"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Com Compras"
          value={
            kpisLoading
              ? "…"
              : (kpis?.totalComVendas || 0).toLocaleString("pt-BR")
          }
          sub={period.label}
          iconColor="text-indigo-500"
          accentClass="bg-indigo-500"
        />
        <KpiCard
          icon={TrendingUp}
          label="Faturamento"
          value={kpisLoading ? "…" : fmtShort(kpis?.totalFaturamento || 0)}
          sub={period.label}
          iconColor="text-green-500"
          accentClass="bg-green-500"
        />
        <KpiCard
          icon={Award}
          label="Ticket Médio"
          value={kpisLoading ? "…" : fmtFull(kpis?.ticketMedioGeral || 0)}
          sub="por pedido"
          iconColor="text-purple-500"
          accentClass="bg-purple-500"
        />
        <KpiCard
          icon={UserPlus}
          label="Clientes Novos"
          value={kpisLoading ? "…" : (kpis?.novos || 0).toLocaleString("pt-BR")}
          sub="primeira compra"
          iconColor="text-amber-500"
          accentClass="bg-amber-500"
        />
        <KpiCard
          icon={UserX}
          label="Inativos"
          value={
            kpisLoading ? "…" : (kpis?.inativos || 0).toLocaleString("pt-BR")
          }
          sub="sem compra no período"
          iconColor="text-red-500"
          accentClass="bg-red-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold">Top 10 por Valor Comprado</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={barData}
              margin={{ top: 0, right: 8, left: 0, bottom: 64 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tickFormatter={v => fmtShort(v).replace("R$ ", "")}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="valor"
                name="Valor"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold">
              Evolução Mensal — Top 5 Clientes
            </h3>
          </div>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={lineData}
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickFormatter={v => fmtShort(v).replace("R$ ", "")}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {lineKeys.map((k, i) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
              Dados insuficientes para evolução mensal
            </div>
          )}
        </div>
      </div>

      {/* Tabs Panel */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 p-2 border-b border-border/50 bg-muted/20 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Ranking Tab */}
        {tab === "ranking" && (
          <>
            <div className="flex items-center gap-3 p-4 border-b border-border/50 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente…"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-9 h-9 text-sm w-56"
                />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground mr-1">Ordenar:</span>
                {(["valor", "pedidos", "ticket"] as SortField[]).map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      setSortBy(f);
                      setPage(0);
                    }}
                    className={`flex items-center px-2.5 py-1 rounded-md border text-xs transition-all ${
                      sortBy === f
                        ? "border-primary/50 bg-primary/10 text-primary font-medium"
                        : "border-border/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "valor"
                      ? "Valor"
                      : f === "pedidos"
                        ? "Pedidos"
                        : "Ticket"}
                    {sortBy === f ? (
                      <ArrowUp className="w-3 h-3 ml-1" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />
                    )}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-auto">
                {ranking?.total || 0} clientes
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Localização
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Comprado
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ticket Médio
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Última Compra
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankingLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="py-3 px-4">
                            <div className="h-4 bg-muted/50 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : ((ranking?.data as any[]) || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-muted-foreground"
                      >
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>Nenhum cliente encontrado</p>
                      </td>
                    </tr>
                  ) : (
                    ((ranking?.data as any[]) || []).map(
                      (c: any, i: number) => (
                        <tr
                          key={c.codCliente}
                          className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => setSelectedCliente(c)}
                        >
                          <td className="py-3 px-4">
                            <RankBadge rank={page * PAGE_SIZE + i + 1} />
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-foreground truncate max-w-[200px]">
                              {c.nome || "—"}
                            </p>
                            {c.razaoSocial && c.razaoSocial !== c.nome && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {c.razaoSocial}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {c.cidade || "—"}
                              {c.estado ? `, ${c.estado}` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-primary">
                            {fmtFull(Number(c.totalComprado))}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {Number(c.totalPedidos).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {fmtFull(Number(c.ticketMedio))}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {fmtDate(c.ultimaCompra)}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage(p => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Top por Valor */}
        {tab === "top-valor" && (
          <TopList
            data={(topValor as any[]) || []}
            title="Top 10 Clientes por Valor Comprado"
            primaryKey="totalComprado"
            primaryLabel="Total"
            secondaryKey="totalPedidos"
            secondaryLabel="pedidos"
            primaryIsCurrency
            onSelect={setSelectedCliente}
          />
        )}

        {/* Top por Pedidos */}
        {tab === "top-pedidos" && (
          <TopList
            data={(topPedidos as any[]) || []}
            title="Top 10 Clientes por Número de Pedidos"
            primaryKey="totalPedidos"
            primaryLabel="Pedidos"
            secondaryKey="totalComprado"
            secondaryLabel="em compras"
            primaryIsCurrency={false}
            onSelect={setSelectedCliente}
          />
        )}

        {/* Clientes Novos */}
        {tab === "novos" && (
          <>
            <div className="p-4 border-b border-border/50 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold">
                Clientes Novos — {period.label}
              </h3>
              <Badge variant="secondary" className="ml-auto">
                {novos?.total || 0} clientes
              </Badge>
            </div>
            <SimpleTable
              data={(novos?.data as any[]) || []}
              columns={[
                { key: "nome", label: "Cliente", primary: true },
                { key: "cidade", label: "Cidade" },
                {
                  key: "primeiraCompra",
                  label: "Primeira Compra",
                  render: fmtDate,
                },
                { key: "totalPedidos", label: "Pedidos", align: "right" },
                {
                  key: "totalComprado",
                  label: "Total Comprado",
                  align: "right",
                  render: (v: any) => fmtFull(Number(v)),
                },
              ]}
              onSelect={setSelectedCliente}
              emptyIcon={UserPlus}
              emptyText="Nenhum cliente novo no período"
            />
          </>
        )}

        {/* Inativos */}
        {tab === "inativos" && (
          <>
            <div className="p-4 border-b border-border/50 flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold">
                Clientes Inativos — sem compra em {period.label}
              </h3>
              <Badge variant="destructive" className="ml-auto">
                {inativos?.total || 0} clientes
              </Badge>
            </div>
            <SimpleTable
              data={(inativos?.data as any[]) || []}
              columns={[
                { key: "nome", label: "Cliente", primary: true },
                { key: "cidade", label: "Cidade" },
                {
                  key: "ultimaCompra",
                  label: "Última Compra",
                  render: fmtDate,
                },
                {
                  key: "totalPedidos",
                  label: "Pedidos Histórico",
                  align: "right",
                },
                {
                  key: "totalComprado",
                  label: "Total Histórico",
                  align: "right",
                  render: (v: any) => fmtFull(Number(v)),
                },
              ]}
              onSelect={setSelectedCliente}
              emptyIcon={UserX}
              emptyText="Nenhum cliente inativo no período"
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCliente && (
        <ClienteModal
          cliente={selectedCliente}
          stats={stats}
          onClose={() => setSelectedCliente(null)}
        />
      )}
    </div>
  );
}

// ─── TopList ──────────────────────────────────────────────────────────────────
function TopList({
  data,
  title,
  primaryKey,
  primaryLabel,
  secondaryKey,
  secondaryLabel,
  primaryIsCurrency,
  onSelect,
}: {
  data: any[];
  title: string;
  primaryKey: string;
  primaryLabel: string;
  secondaryKey: string;
  secondaryLabel: string;
  primaryIsCurrency: boolean;
  onSelect: (c: any) => void;
}) {
  return (
    <>
      <div className="p-4 border-b border-border/50">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-border/30">
        {data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Nenhum dado disponível</p>
          </div>
        ) : (
          data.map((c: any, i: number) => (
            <div
              key={c.codCliente}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => onSelect(c)}
            >
              <RankBadge rank={i + 1} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.nome || "—"}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>
                    {c.cidade || "—"}
                    {c.estado ? `, ${c.estado}` : ""}
                  </span>
                  <span>·</span>
                  <span>
                    {primaryIsCurrency
                      ? `${Number(c[secondaryKey]).toLocaleString("pt-BR")} ${secondaryLabel}`
                      : `${fmtFull(Number(c[secondaryKey]))} ${secondaryLabel}`}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">
                  {primaryIsCurrency
                    ? fmtFull(Number(c[primaryKey]))
                    : Number(c[primaryKey]).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">{primaryLabel}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ─── SimpleTable ──────────────────────────────────────────────────────────────
function SimpleTable({
  data,
  columns,
  onSelect,
  emptyIcon: EmptyIcon,
  emptyText,
}: {
  data: any[];
  columns: {
    key: string;
    label: string;
    align?: "left" | "right";
    primary?: boolean;
    render?: (v: any) => React.ReactNode;
  }[];
  onSelect: (c: any) => void;
  emptyIcon: React.ElementType;
  emptyText: string;
}) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <EmptyIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/20">
            {columns.map(col => (
              <th
                key={col.key}
                className={`py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${col.align === "right" ? "text-right" : "text-left"}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, i: number) => (
            <tr
              key={i}
              className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => onSelect(row)}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`py-3 px-4 ${col.align === "right" ? "text-right" : "text-left"} ${col.primary ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {col.render
                    ? col.render(row[col.key])
                    : (row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cliente Modal ────────────────────────────────────────────────────────────
function ClienteModal({
  cliente,
  stats,
  onClose,
}: {
  cliente: any;
  stats: any;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border/50">
          <div>
            <h2 className="font-bold text-foreground text-base leading-tight">
              {cliente.nome || cliente.razaoSocial || "—"}
            </h2>
            {cliente.razaoSocial && cliente.razaoSocial !== cliente.nome && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {cliente.razaoSocial}
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
              <MapPin className="w-3 h-3" />
              {cliente.cidade || "—"}
              {cliente.estado ? `, ${cliente.estado}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none ml-4"
          >
            &times;
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {[
            {
              label: "Total Comprado",
              value: fmtFull(
                Number(stats?.totalCompras || cliente.totalComprado || 0)
              ),
              highlight: true,
            },
            {
              label: "Nº de Pedidos",
              value: Number(
                stats?.quantidadeCompras || cliente.totalPedidos || 0
              ).toLocaleString("pt-BR"),
            },
            {
              label: "Ticket Médio",
              value: fmtFull(
                Number(stats?.ticketMedio || cliente.ticketMedio || 0)
              ),
            },
            {
              label: "Última Compra",
              value: fmtDate(stats?.ultimaCompra || cliente.ultimaCompra),
            },
          ].map(s => (
            <div key={s.label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </p>
              <p
                className={`text-base font-bold ${s.highlight ? "text-primary" : "text-foreground"}`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
