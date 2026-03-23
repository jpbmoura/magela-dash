import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Package,
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  BarChart3,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ITEMS_PER_PAGE = 50;

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
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
      <p className="font-medium mb-1 truncate max-w-[200px]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" &&
          p.name?.toLowerCase().includes("valor")
            ? formatCurrency(p.value)
            : p.value?.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
};

function ProdutoDetailModal({
  produto,
  onClose,
}: {
  produto: any;
  onClose: () => void;
}) {
  const codProduto = produto?.codProduto?.toString() || "";
  const { data: perf, isLoading } = trpc.produtos.getPerformance.useQuery(
    { codProduto },
    { enabled: !!codProduto }
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {produto.nome}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Código: {produto.codProduto}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="space-y-1 text-sm">
            {produto.marca && (
              <p>
                <span className="text-muted-foreground">Marca:</span>{" "}
                {produto.marca}
              </p>
            )}
            {produto.categoria && (
              <p>
                <span className="text-muted-foreground">Categoria:</span>{" "}
                {produto.categoria}
              </p>
            )}
            {produto.descSubgrupo && (
              <p>
                <span className="text-muted-foreground">Subgrupo:</span>{" "}
                {produto.descSubgrupo}
              </p>
            )}
            {produto.unidade && (
              <p>
                <span className="text-muted-foreground">Unidade:</span>{" "}
                {produto.unidade}
              </p>
            )}
          </div>
          <div className="space-y-1 text-sm">
            {produto.precoVenda && (
              <p>
                <span className="text-muted-foreground">Preço Venda:</span>{" "}
                <strong>{formatCurrency(produto.precoVenda)}</strong>
              </p>
            )}
            {produto.custo && (
              <p>
                <span className="text-muted-foreground">Custo:</span>{" "}
                {formatCurrency(produto.custo)}
              </p>
            )}
            {produto.estoque !== undefined && (
              <p>
                <span className="text-muted-foreground">Estoque:</span>{" "}
                {produto.estoque ?? "—"}
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : perf ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Vendido</p>
              <p className="text-sm font-bold text-primary">
                {formatCurrency((perf as any).totalVendido)}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Qtd. Vendas</p>
              <p className="text-sm font-bold">
                {((perf as any).qtdVendas ?? 0).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="text-sm font-bold">
                {formatCurrency((perf as any).precoMedio)}
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function Produtos() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedProduto, setSelectedProduto] = useState<any>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    clearTimeout((window as any)._searchTimeout);
    (window as any)._searchTimeout = setTimeout(
      () => setDebouncedSearch(value),
      400
    );
  };

  const { data: produtosPaginados, isLoading } =
    trpc.produtos.getPaginados.useQuery({
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
      search: debouncedSearch || undefined,
    });

  const { data: topProdutos } = trpc.produtos.getTopByVendas.useQuery({
    limit: 15,
  });
  const { data: statusEstoque } = trpc.produtos.getStatusEstoque.useQuery();

  const totalPages = Math.ceil(
    (produtosPaginados?.total || 0) / ITEMS_PER_PAGE
  );

  const chartTop = (topProdutos || []).slice(0, 10).map((p: any) => ({
    produto: (p.produto || p.codProduto || "—").slice(0, 20),
    "Valor (R$)": parseFloat(p.faturamento || 0),
    Qtd: parseInt(p.quantidadeVendida || 0),
  }));

  const statusObj = statusEstoque as any;
  const chartStatus =
    statusObj && !Array.isArray(statusObj)
      ? Object.entries(statusObj).map(([status, quantidade]) => ({
          status,
          quantidade: Number(quantidade),
        }))
      : [];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Package}
        title="Monitor de Produtos"
        description={
          produtosPaginados?.total
            ? `${produtosPaginados.total.toLocaleString("pt-BR")} produtos cadastrados`
            : "Carregando..."
        }
        accent="rose"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 w-60 h-9 text-sm"
          />
        </div>
      </PageHeader>

      <Tabs defaultValue="catalogo">
        <TabsList className="mb-4">
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="estoque">Status Estoque</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Marca</th>
                      <th>Categoria</th>
                      <th className="text-right">Preço</th>
                      <th className="text-right">Estoque</th>
                      <th className="text-center">Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <Skeleton className="h-4 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : !produtosPaginados?.data?.length ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-muted-foreground"
                        >
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Nenhum produto encontrado</p>
                          {!debouncedSearch && (
                            <p className="text-xs mt-1">
                              Importe um arquivo Excel para começar
                            </p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      produtosPaginados.data.map((p: any) => (
                        <tr key={p.id}>
                          <td className="font-mono text-xs text-muted-foreground">
                            {p.codProduto}
                          </td>
                          <td className="font-medium max-w-[200px] truncate">
                            {p.nome}
                          </td>
                          <td className="text-muted-foreground text-xs">
                            {p.marca || "—"}
                          </td>
                          <td>
                            {p.categoria ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-500/10 text-violet-700 dark:text-violet-400">
                                <Tag className="h-2.5 w-2.5" />
                                {p.categoria}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="text-right font-semibold">
                            {formatCurrency(p.precoVenda)}
                          </td>
                          <td className="text-right">
                            <span
                              className={`text-xs font-bold ${(p.estoque ?? 0) <= 0 ? "text-rose-500" : (p.estoque ?? 0) <= 10 ? "text-amber-500" : "text-emerald-600"}`}
                            >
                              {p.estoque ?? "—"}
                            </span>
                          </td>
                          <td className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                              onClick={() => setSelectedProduto(p)}
                            >
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
                  <p className="text-xs text-muted-foreground">
                    Página {page + 1} de {totalPages} &mdash;{" "}
                    {produtosPaginados?.total?.toLocaleString("pt-BR")}{" "}
                    registros
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setPage(p => Math.min(totalPages - 1, p + 1))
                      }
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

        <TabsContent value="performance">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Top 10 Produtos por Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!chartTop.length ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum dado
                  disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartTop} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={formatCurrencyShort}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="produto"
                      tick={{ fontSize: 10 }}
                      width={130}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="Valor (R$)"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Distribuição por Status de Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!chartStatus.length ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    <BarChart3 className="h-8 w-8 mr-2 opacity-30" /> Nenhum
                    dado disponível
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chartStatus.map((s: any, i: number) => {
                      const maxQty = Math.max(
                        ...chartStatus.map((x: any) => x.quantidade),
                        1
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-muted-foreground capitalize">
                            {s.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${Math.min(100, (s.quantidade / maxQty) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {s.quantidade}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Produtos com Estoque Crítico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EstoqueCriticoList />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {selectedProduto && (
        <ProdutoDetailModal
          produto={selectedProduto}
          onClose={() => setSelectedProduto(null)}
        />
      )}
    </div>
  );
}

function EstoqueCriticoList() {
  const { data: result, isLoading } = trpc.estoque.getSemEstoque.useQuery({ limit: 10 });
  const items = result?.data;

  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  if (!items?.length)
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum produto ativo sem estoque
      </p>
    );

  return (
    <div className="space-y-2">
      {items.map((p: any, i: number) => (
        <div
          key={i}
          className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
        >
          <div>
            <p className="text-sm font-medium truncate max-w-[200px]">
              {p.nome || p.codProduto}
            </p>
            <p className="text-xs text-muted-foreground">{p.codProduto}</p>
          </div>
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">
            0 un
          </span>
        </div>
      ))}
    </div>
  );
}
