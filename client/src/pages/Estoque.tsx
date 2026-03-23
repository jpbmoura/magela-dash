import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Search, AlertTriangle, Package, Eye, ChevronLeft, ChevronRight, Warehouse, X, Filter, BarChart3, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface Filters {
  search: string;
  codigo: string;
  marca: string;
  categoria: string;
  status: string;
}

const emptyFilters: Filters = { search: "", codigo: "", marca: "", categoria: "", status: "" };

const CHART_COLORS = {
  indigo: "#6366f1",
  amber: "#f59e0b",
  rose: "#f43f5e",
  emerald: "#10b981",
};

const PIE_COLORS = [CHART_COLORS.rose, CHART_COLORS.amber, CHART_COLORS.emerald];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1 truncate max-w-[220px]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
};

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  if (total === 0) return null;

  const maxVisiblePages = 5;
  let startPage = Math.max(0, page - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages);
  if (endPage - startPage < maxVisiblePages) startPage = Math.max(0, endPage - maxVisiblePages);
  const pages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/10">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Itens por página:</span>
        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(0); }}>
          <SelectTrigger className="w-[70px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(s => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-2">
          {total.toLocaleString("pt-BR")} {total === 1 ? "produto" : "produtos"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="sm" className="h-7 w-7 p-0"
          onClick={() => onPageChange(0)}
          disabled={page === 0}
        >
          <span className="text-xs">1</span>
        </Button>
        <Button
          variant="outline" size="sm" className="h-7 w-7 p-0"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {pages.map(p => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            className="h-7 w-7 p-0 text-xs"
            onClick={() => onPageChange(p)}
          >
            {p + 1}
          </Button>
        ))}
        <Button
          variant="outline" size="sm" className="h-7 w-7 p-0"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        {totalPages > 1 && (
          <Button
            variant="outline" size="sm" className="h-7 px-2 p-0 text-xs"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
          >
            {totalPages}
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterBar({
  applied,
  onApply,
  onClear,
  marcas,
  categorias,
  showStatus,
}: {
  applied: Filters;
  onApply: (f: Filters) => void;
  onClear: () => void;
  marcas: string[];
  categorias: string[];
  showStatus?: boolean;
}) {
  const [draft, setDraft] = useState<Filters>(applied);

  const update = (partial: Partial<Filters>) => setDraft(prev => ({ ...prev, ...partial }));

  const handleApply = () => onApply(draft);

  const handleClear = () => {
    setDraft(emptyFilters);
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleApply();
  };

  const hasApplied = applied.search || applied.codigo || applied.marca || applied.categoria || applied.status;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-muted/5">
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar produto..."
          value={draft.search}
          onChange={e => update({ search: e.target.value })}
          onKeyDown={handleKeyDown}
          className="pl-8 w-44 h-8 text-xs"
        />
      </div>
      <Input
        placeholder="Código"
        value={draft.codigo}
        onChange={e => update({ codigo: e.target.value })}
        onKeyDown={handleKeyDown}
        className="w-24 h-8 text-xs"
      />
      <Select value={draft.marca || "_all"} onValueChange={v => update({ marca: v === "_all" ? "" : v })}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todas as marcas</SelectItem>
          {marcas.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={draft.categoria || "_all"} onValueChange={v => update({ categoria: v === "_all" ? "" : v })}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todas as categorias</SelectItem>
          {categorias.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showStatus && (
        <Select value={draft.status || "_all"} onValueChange={v => update({ status: v === "_all" ? "" : v })}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="semEstoque">Sem Estoque</SelectItem>
            <SelectItem value="emAtencao">Em Atenção</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button size="sm" className="h-8 px-3 text-xs" onClick={handleApply}>
        <Filter className="h-3.5 w-3.5 mr-1" /> Filtrar
      </Button>
      {hasApplied && (
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={handleClear}>
          <X className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

function buildEstoqueListFilters(filters: Filters) {
  return {
    search: filters.search || undefined,
    codigo: filters.codigo || undefined,
    marca: filters.marca || undefined,
    categoria: filters.categoria || undefined,
  };
}

function EstoqueProdutoRow({ p, fmtDiasEstoque }: { p: any; fmtDiasEstoque: (v: unknown) => string }) {
  return (
    <tr>
      <td className="font-mono text-xs text-muted-foreground">{p.codProduto}</td>
      <td className="font-medium max-w-[220px] truncate">{p.nome || "—"}</td>
      <td className="text-muted-foreground text-xs">{p.marca || "—"}</td>
      <td className="text-muted-foreground text-xs">{p.categoria || "—"}</td>
      <td className="text-right text-muted-foreground">
        {Number(p.totalVendido3Meses ?? 0).toLocaleString("pt-BR")}
      </td>
      <td className="text-right text-muted-foreground">
        {Number(p.mediaVendasMensal ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      </td>
      <td className={`text-right font-bold ${Number(p.estoque ?? 0) === 0 ? "text-rose-500" : "text-emerald-500"}`}>
        {Number(p.estoque ?? 0).toLocaleString("pt-BR")}
      </td>
      <td className="text-right text-muted-foreground">
        {fmtDiasEstoque(p.diasEstoque)}
      </td>
    </tr>
  );
}

export default function Estoque() {
  const [activeTab, setActiveTab] = useState("visualizacao");
  const [semEstoqueOrderBy, setSemEstoqueOrderBy] = useState<"estoque">("estoque");
  const [semEstoqueOrderDir, setSemEstoqueOrderDir] = useState<"asc" | "desc">("asc");
  const [emAtencaoOrderBy, setEmAtencaoOrderBy] = useState<"estoqueAtual" | "totalVendido3Meses" | "mediaVendasMensal" | "diasEstoque">("estoqueAtual");
  const [emAtencaoOrderDir, setEmAtencaoOrderDir] = useState<"asc" | "desc">("asc");
  const [projecaoOrderBy, setProjecaoOrderBy] = useState<"vendas3m" | "estoqueAtual" | "totalVendido3Meses" | "mediaVendasMensal" | "diasEstoque">("diasEstoque");
  const [projecaoOrderDir, setProjecaoOrderDir] = useState<"asc" | "desc">("asc");
  const [todosOrderBy, setTodosOrderBy] = useState<"estoque">("estoque");
  const [todosOrderDir, setTodosOrderDir] = useState<"asc" | "desc">("asc");

  const [semEstoquePage, setSemEstoquePage] = useState(0);
  const [semEstoquePageSize, setSemEstoquePageSize] = useState(25);
  const [semEstoqueFilters, setSemEstoqueFilters] = useState<Filters>(emptyFilters);

  const [emAtencaoPage, setEmAtencaoPage] = useState(0);
  const [emAtencaoPageSize, setEmAtencaoPageSize] = useState(25);
  const [emAtencaoFilters, setEmAtencaoFilters] = useState<Filters>(emptyFilters);

  const [projecaoPage, setProjecaoPage] = useState(0);
  const [projecaoPageSize, setProjecaoPageSize] = useState(25);
  const [projecaoFilters, setProjecaoFilters] = useState<Filters>(emptyFilters);
  const [diasPedido, setDiasPedido] = useState("30");
  const [projecaoExcluirEstoqueZero, setProjecaoExcluirEstoqueZero] = useState(false);
  const [projecaoExcluirSemVendas3m, setProjecaoExcluirSemVendas3m] = useState(true);

  const [todosPage, setTodosPage] = useState(0);
  const [todosPageSize, setTodosPageSize] = useState(25);
  const [todosFilters, setTodosFilters] = useState<Filters>(emptyFilters);

  const [porMarcaFilters, setPorMarcaFilters] = useState<Filters>(emptyFilters);
  const [porMarcaOrderBy, setPorMarcaOrderBy] = useState<"estoque">("estoque");
  const [porMarcaOrderDir, setPorMarcaOrderDir] = useState<"asc" | "desc">("asc");
  const [, setPorMarcaPageDummy] = useState(0);

  const { data: resumo } = trpc.estoque.getResumo.useQuery();
  const { data: filterOptions } = trpc.estoque.getFilterOptions.useQuery();
  const { data: topAtencaoData } = trpc.estoque.getEmAtencao.useQuery({
    limit: 10,
    orderBy: "mediaVendasMensal",
    orderDir: "desc",
  });
  const { data: estoqueMarcasProblemasData } = trpc.estoque.getPorMarca.useQuery();

  const marcas = filterOptions?.marcas ?? [];
  const categorias = filterOptions?.categorias ?? [];

  const buildParams = (filters: Filters, page: number, pageSize: number) => ({
    ...buildEstoqueListFilters(filters),
    limit: pageSize,
    offset: page * pageSize,
  });

  const { data: semEstoqueData, isLoading: semEstoqueLoading } = trpc.estoque.getSemEstoque.useQuery(
    { ...buildParams(semEstoqueFilters, semEstoquePage, semEstoquePageSize), orderBy: semEstoqueOrderBy, orderDir: semEstoqueOrderDir }
  );

  const { data: emAtencaoData, isLoading: emAtencaoLoading } = trpc.estoque.getEmAtencao.useQuery(
    { ...buildParams(emAtencaoFilters, emAtencaoPage, emAtencaoPageSize), orderBy: emAtencaoOrderBy, orderDir: emAtencaoOrderDir }
  );
  const diasPedidoNumero = Number(diasPedido);
  const projecaoHabilitada = Number.isFinite(diasPedidoNumero) && diasPedidoNumero > 0;
  const { data: projecaoData, isLoading: projecaoLoading } = trpc.estoque.getProjecaoPedidos.useQuery(
    {
      ...buildParams(projecaoFilters, projecaoPage, projecaoPageSize),
      diasPedido: diasPedidoNumero,
      orderBy: projecaoOrderBy,
      orderDir: projecaoOrderDir,
      excludeZeroStock: projecaoExcluirEstoqueZero,
      excludeNoSales: projecaoExcluirSemVendas3m,
    },
    { enabled: projecaoHabilitada }
  );

  const { data: todosData, isLoading: todosLoading } = trpc.estoque.getPaginado.useQuery({
    ...buildParams(todosFilters, todosPage, todosPageSize),
    status: (todosFilters.status as 'semEstoque' | 'emAtencao') || undefined,
    orderBy: todosOrderBy,
    orderDir: todosOrderDir,
  });

  const { data: produtosAgrupadosPorMarca, isLoading: produtosPorMarcaLoading } =
    trpc.estoque.getProdutosAgrupadosPorMarca.useQuery(
      {
        ...buildEstoqueListFilters(porMarcaFilters),
        status: (porMarcaFilters.status as "semEstoque" | "emAtencao") || undefined,
        orderBy: porMarcaOrderBy,
        orderDir: porMarcaOrderDir,
      },
      { enabled: activeTab === "porMarca" },
    );

  const applyFilters = (
    setter: React.Dispatch<React.SetStateAction<Filters>>,
    pageSetter: React.Dispatch<React.SetStateAction<number>>,
  ) => (filters: Filters) => {
    setter(filters);
    pageSetter(0);
  };

  const clearFilters = (
    setter: React.Dispatch<React.SetStateAction<Filters>>,
    pageSetter: React.Dispatch<React.SetStateAction<number>>,
  ) => () => {
    setter(emptyFilters);
    pageSetter(0);
  };

  const renderSortIcon = (isActive: boolean, dir: "asc" | "desc") => {
    if (!isActive) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    return dir === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 text-foreground" />
      : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  const fmtDiasEstoque = (v: unknown) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return Math.floor(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Warehouse}
        title="Análises de Estoque"
        description="Indicadores de estoque considerando apenas produtos ativos"
        accent="amber"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            label: "Em Atenção",
            value: resumo?.emAtencao ?? 0,
            Icon: Eye,
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="visualizacao">Visualização</TabsTrigger>
          <TabsTrigger value="semEstoque">Sem Estoque</TabsTrigger>
          <TabsTrigger value="emAtencao">Em Atenção</TabsTrigger>
          <TabsTrigger value="projecaoPedidos">Projeção de Pedidos</TabsTrigger>
          <TabsTrigger value="porMarca">Estoque por Marca</TabsTrigger>
          <TabsTrigger value="todos">Todos os Produtos</TabsTrigger>
        </TabsList>

        {/* Aba: Sem Estoque */}
        <TabsContent value="semEstoque">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">
                Produtos Ativos sem Estoque
              </CardTitle>
            </CardHeader>
            <FilterBar
              applied={semEstoqueFilters}
              onApply={applyFilters(setSemEstoqueFilters, setSemEstoquePage)}
              onClear={clearFilters(setSemEstoqueFilters, setSemEstoquePage)}
              marcas={marcas}
              categorias={categorias}
            />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Marca</th>
                      <th>Categoria</th>
                      <th className="text-right">Vendido (3m)</th>
                      <th className="text-right">Média Mensal</th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setSemEstoquePage(0);
                            setSemEstoqueOrderBy("estoque");
                            setSemEstoqueOrderDir(prev => (semEstoqueOrderBy === "estoque" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Estoque
                          {renderSortIcon(semEstoqueOrderBy === "estoque", semEstoqueOrderDir)}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {semEstoqueLoading ? (
                      <SkeletonRows cols={7} />
                    ) : !semEstoqueData?.data?.length ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum produto ativo com estoque zerado</p>
                        </td>
                      </tr>
                    ) : (
                      semEstoqueData.data.map((p: any, i: number) => (
                        <tr key={i}>
                          <td className="font-mono text-xs text-muted-foreground">{p.codProduto}</td>
                          <td className="font-medium max-w-[250px] truncate">{p.nome || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.marca || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.categoria || "—"}</td>
                          <td className="text-right text-muted-foreground">
                            {Number(p.totalVendido3Meses ?? 0).toLocaleString("pt-BR")}
                          </td>
                          <td className="text-right text-muted-foreground">
                            {Number(p.mediaVendasMensal ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                          </td>
                          <td className="text-right font-bold text-rose-500">0</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={semEstoquePage}
                totalPages={Math.ceil((semEstoqueData?.total || 0) / semEstoquePageSize)}
                total={semEstoqueData?.total || 0}
                pageSize={semEstoquePageSize}
                onPageChange={setSemEstoquePage}
                onPageSizeChange={setSemEstoquePageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Em Atenção */}
        <TabsContent value="emAtencao">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">
                Produtos em Atenção
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Estoque abaixo da média de vendas dos últimos 3 meses
                </span>
              </CardTitle>
            </CardHeader>
            <FilterBar
              applied={emAtencaoFilters}
              onApply={applyFilters(setEmAtencaoFilters, setEmAtencaoPage)}
              onClear={clearFilters(setEmAtencaoFilters, setEmAtencaoPage)}
              marcas={marcas}
              categorias={categorias}
            />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Marca</th>
                      <th>Categoria</th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setEmAtencaoPage(0);
                            setEmAtencaoOrderBy("totalVendido3Meses");
                            setEmAtencaoOrderDir(prev => (emAtencaoOrderBy === "totalVendido3Meses" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Vendido (3m)
                          {renderSortIcon(emAtencaoOrderBy === "totalVendido3Meses", emAtencaoOrderDir)}
                        </button>
                      </th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setEmAtencaoPage(0);
                            setEmAtencaoOrderBy("mediaVendasMensal");
                            setEmAtencaoOrderDir(prev => (emAtencaoOrderBy === "mediaVendasMensal" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Média Mensal
                          {renderSortIcon(emAtencaoOrderBy === "mediaVendasMensal", emAtencaoOrderDir)}
                        </button>
                      </th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setEmAtencaoPage(0);
                            setEmAtencaoOrderBy("estoqueAtual");
                            setEmAtencaoOrderDir(prev => (emAtencaoOrderBy === "estoqueAtual" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Estoque Atual
                          {renderSortIcon(emAtencaoOrderBy === "estoqueAtual", emAtencaoOrderDir)}
                        </button>
                      </th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setEmAtencaoPage(0);
                            setEmAtencaoOrderBy("diasEstoque");
                            setEmAtencaoOrderDir(prev => (emAtencaoOrderBy === "diasEstoque" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Dias de estoque
                          {renderSortIcon(emAtencaoOrderBy === "diasEstoque", emAtencaoOrderDir)}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {emAtencaoLoading ? (
                      <SkeletonRows cols={8} />
                    ) : !emAtencaoData?.data?.length ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                          <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum produto em atenção</p>
                        </td>
                      </tr>
                    ) : (
                      emAtencaoData.data.map((p: any, i: number) => (
                        <tr key={i}>
                          <td className="font-mono text-xs text-muted-foreground">{p.codProduto}</td>
                          <td className="font-medium max-w-[200px] truncate">{p.nome || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.marca || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.categoria || "—"}</td>
                          <td className="text-right text-muted-foreground">
                            {Number(p.totalVendido3Meses ?? 0).toLocaleString("pt-BR")}
                          </td>
                          <td className="text-right text-muted-foreground">
                            {Number(p.mediaVendasMensal ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                          </td>
                          <td className="text-right font-bold text-amber-500">
                            {Number(p.estoqueAtual ?? 0).toLocaleString("pt-BR")}
                          </td>
                          <td className="text-right font-medium text-muted-foreground">
                            {fmtDiasEstoque(p.diasEstoque)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={emAtencaoPage}
                totalPages={Math.ceil((emAtencaoData?.total || 0) / emAtencaoPageSize)}
                total={emAtencaoData?.total || 0}
                pageSize={emAtencaoPageSize}
                onPageChange={setEmAtencaoPage}
                onPageSizeChange={setEmAtencaoPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Projeção de Pedidos */}
        <TabsContent value="projecaoPedidos">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">
                Projeção de Pedidos
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Produtos com dias de estoque abaixo do prazo de pedido
                </span>
              </CardTitle>
            </CardHeader>
            <div className="px-4 pt-3 flex flex-wrap items-end gap-6">
              <div className="max-w-[220px]">
                <label className="text-xs text-muted-foreground block mb-1">Dias de pedido</label>
                <Input
                  type="number"
                  min={1}
                  value={diasPedido}
                  onChange={(e) => {
                    setDiasPedido(e.target.value);
                    setProjecaoPage(0);
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                <Checkbox
                  checked={projecaoExcluirEstoqueZero}
                  onCheckedChange={(v) => {
                    setProjecaoExcluirEstoqueZero(v === true);
                    setProjecaoPage(0);
                  }}
                />
                <span>Excluir produtos com estoque zerado</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                <Checkbox
                  checked={projecaoExcluirSemVendas3m}
                  onCheckedChange={(v) => {
                    setProjecaoExcluirSemVendas3m(v === true);
                    setProjecaoPage(0);
                  }}
                />
                <span>Excluir produtos sem vendas nos últimos 3 meses</span>
              </label>
            </div>
            <FilterBar
              applied={projecaoFilters}
              onApply={applyFilters(setProjecaoFilters, setProjecaoPage)}
              onClear={clearFilters(setProjecaoFilters, setProjecaoPage)}
              marcas={marcas}
              categorias={categorias}
            />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Marca</th>
                      <th>Categoria</th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setProjecaoPage(0);
                            setProjecaoOrderBy("totalVendido3Meses");
                            setProjecaoOrderDir(prev => (projecaoOrderBy === "totalVendido3Meses" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Vendido (3m)
                          {renderSortIcon(projecaoOrderBy === "totalVendido3Meses", projecaoOrderDir)}
                        </button>
                      </th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setProjecaoPage(0);
                            setProjecaoOrderBy("mediaVendasMensal");
                            setProjecaoOrderDir(prev => (projecaoOrderBy === "mediaVendasMensal" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Média Mensal
                          {renderSortIcon(projecaoOrderBy === "mediaVendasMensal", projecaoOrderDir)}
                        </button>
                      </th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setProjecaoPage(0);
                            setProjecaoOrderBy("estoqueAtual");
                            setProjecaoOrderDir(prev => (projecaoOrderBy === "estoqueAtual" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Estoque Atual
                          {renderSortIcon(projecaoOrderBy === "estoqueAtual", projecaoOrderDir)}
                        </button>
                      </th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setProjecaoPage(0);
                            setProjecaoOrderBy("diasEstoque");
                            setProjecaoOrderDir(prev => (projecaoOrderBy === "diasEstoque" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Dias de estoque
                          {renderSortIcon(projecaoOrderBy === "diasEstoque", projecaoOrderDir)}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!projecaoHabilitada ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                          Informe um valor maior que 0 em Dias de pedido para gerar a projeção.
                        </td>
                      </tr>
                    ) : projecaoLoading ? (
                      <SkeletonRows cols={8} />
                    ) : !projecaoData?.data?.length ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum produto abaixo do prazo informado</p>
                        </td>
                      </tr>
                    ) : (
                      projecaoData.data.map((p: any, i: number) => (
                        <tr key={i}>
                          <td className="font-mono text-xs text-muted-foreground">{p.codProduto}</td>
                          <td className="font-medium max-w-[200px] truncate">{p.nome || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.marca || "—"}</td>
                          <td className="text-muted-foreground text-xs">{p.categoria || "—"}</td>
                          <td className="text-right text-muted-foreground">
                            {Number(p.totalVendido3Meses ?? 0).toLocaleString("pt-BR")}
                          </td>
                          <td className="text-right text-muted-foreground">
                            {Number(p.mediaVendasMensal ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                          </td>
                          <td className="text-right font-bold text-amber-500">
                            {Number(p.estoqueAtual ?? 0).toLocaleString("pt-BR")}
                          </td>
                          <td className="text-right font-medium text-rose-500">
                            {fmtDiasEstoque(p.diasEstoque)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={projecaoPage}
                totalPages={Math.ceil((projecaoData?.total || 0) / projecaoPageSize)}
                total={projecaoData?.total || 0}
                pageSize={projecaoPageSize}
                onPageChange={setProjecaoPage}
                onPageSizeChange={setProjecaoPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Estoque por Marca */}
        <TabsContent value="porMarca">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">Estoque por Marca</CardTitle>
            </CardHeader>
            <FilterBar
              applied={porMarcaFilters}
              onApply={applyFilters(setPorMarcaFilters, setPorMarcaPageDummy)}
              onClear={clearFilters(setPorMarcaFilters, setPorMarcaPageDummy)}
              marcas={marcas}
              categorias={categorias}
              showStatus
            />
            <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-2 border-b bg-muted/5">
              <span className="text-xs text-muted-foreground">Ordenação dos produtos:</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted/50"
                onClick={() => {
                  setPorMarcaOrderBy("estoque");
                  setPorMarcaOrderDir(prev =>
                    porMarcaOrderBy === "estoque" ? (prev === "asc" ? "desc" : "asc") : "asc",
                  );
                }}
              >
                Estoque
                {renderSortIcon(porMarcaOrderBy === "estoque", porMarcaOrderDir)}
              </button>
            </div>
            <CardContent className="p-0">
              {produtosPorMarcaLoading ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Produto</th>
                        <th>Marca</th>
                        <th>Categoria</th>
                        <th className="text-right">Vendido (3m)</th>
                        <th className="text-right">Média Mensal</th>
                        <th className="text-right">Estoque</th>
                        <th className="text-right">Dias de estoque</th>
                      </tr>
                    </thead>
                    <tbody>
                      <SkeletonRows cols={8} />
                    </tbody>
                  </table>
                </div>
              ) : !produtosAgrupadosPorMarca?.groups?.length ? (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum produto encontrado</p>
                </div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {produtosAgrupadosPorMarca.groups.map((g, idx) => (
                    <AccordionItem key={`marca-${idx}`} value={`marca-${idx}`} className="border-b">
                      <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                        <span className="truncate text-left">
                          {g.marca}
                          <span className="ml-2 font-normal text-muted-foreground">
                            ({g.produtos.length})
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="overflow-x-auto border-t">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Código</th>
                                <th>Produto</th>
                                <th>Marca</th>
                                <th>Categoria</th>
                                <th className="text-right">Vendido (3m)</th>
                                <th className="text-right">Média Mensal</th>
                                <th className="text-right">Estoque</th>
                                <th className="text-right">Dias de estoque</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.produtos.map((p: any) => (
                                <EstoqueProdutoRow key={p.codProduto} p={p} fmtDiasEstoque={fmtDiasEstoque} />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Todos os Produtos */}
        <TabsContent value="todos">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">Todos os Produtos Ativos</CardTitle>
            </CardHeader>
            <FilterBar
              applied={todosFilters}
              onApply={applyFilters(setTodosFilters, setTodosPage)}
              onClear={clearFilters(setTodosFilters, setTodosPage)}
              marcas={marcas}
              categorias={categorias}
              showStatus
            />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Marca</th>
                      <th>Categoria</th>
                      <th className="text-right">Vendido (3m)</th>
                      <th className="text-right">Média Mensal</th>
                      <th className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 ml-auto"
                          onClick={() => {
                            setTodosPage(0);
                            setTodosOrderBy("estoque");
                            setTodosOrderDir(prev => (todosOrderBy === "estoque" ? (prev === "asc" ? "desc" : "asc") : "asc"));
                          }}
                        >
                          Estoque
                          {renderSortIcon(todosOrderBy === "estoque", todosOrderDir)}
                        </button>
                      </th>
                      <th className="text-right">Dias de estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todosLoading ? (
                      <SkeletonRows cols={8} />
                    ) : !todosData?.data?.length ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum produto encontrado</p>
                        </td>
                      </tr>
                    ) : (
                      todosData.data.map((p: any) => (
                        <EstoqueProdutoRow key={p.codProduto} p={p} fmtDiasEstoque={fmtDiasEstoque} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={todosPage}
                totalPages={Math.ceil((todosData?.total || 0) / todosPageSize)}
                total={todosData?.total || 0}
                pageSize={todosPageSize}
                onPageChange={setTodosPage}
                onPageSizeChange={setTodosPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Visualização */}
        <TabsContent value="visualizacao">
          <div className="grid grid-cols-1 gap-4">
            {/* Top 10 Produtos em Atenção — Estoque vs Vendas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Top 10 Produtos em Atenção
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Média de venda (3m), estoque atual e dias de estoque
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!topAtencaoData?.data?.length ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(360, (topAtencaoData.data.length) * 48)}>
                    <BarChart
                      data={topAtencaoData.data.map((p: any) => {
                        const n = Number(p.diasEstoque);
                        const dias = Number.isFinite(n) ? Math.floor(n) : 0;
                        return {
                          produto: (p.nome || String(p.codProduto) || "—").slice(0, 25),
                          "Média Venda (3m)": Number(p.mediaVendasMensal ?? 0),
                          "Estoque Atual": Number(p.estoqueAtual ?? 0),
                          "Dias de estoque": dias,
                        };
                      })}
                      layout="vertical"
                      margin={{ left: 10, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="produto" tick={{ fontSize: 10 }} width={160} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Média Venda (3m)" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Estoque Atual" fill={CHART_COLORS.indigo} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Dias de estoque" fill={CHART_COLORS.emerald} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribuição de Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Distribuição de Status de Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                  {!resumo?.totalProdutos ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                      <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                    </div>
                  ) : (() => {
                    const normal = Math.max(0, resumo.totalProdutos - resumo.semEstoque - resumo.emAtencao);
                    const pieData = [
                      { name: "Sem Estoque", value: resumo.semEstoque },
                      { name: "Em Atenção", value: resumo.emAtencao },
                      { name: "Normal", value: normal },
                    ].filter(d => d.value > 0);
                    return (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Top 10 Marcas com Problemas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Top 10 Marcas com Problemas de Estoque
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!estoqueMarcasProblemasData?.length ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                      <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado disponível
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={estoqueMarcasProblemasData.map((c: any) => ({
                          marca: (c.marca || "—").slice(0, 18),
                          "Sem Estoque": Number(c.semEstoque ?? 0),
                          "Em Atenção": Number(c.emAtencao ?? 0),
                        }))}
                        margin={{ left: 0, right: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="marca" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Sem Estoque" stackId="a" fill={CHART_COLORS.rose} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Em Atenção" stackId="a" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
