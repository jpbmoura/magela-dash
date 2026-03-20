import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { calcularDre, type DreCompleto } from "../../../shared/dreCalculations";
import {
  formatCurrency,
  formatCurrencyShort,
  formatPercent,
} from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileSpreadsheet,
  Save,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Link2,
  Unlink,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

function toNum(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

function MoneyInput({
  label,
  value,
  onChange,
  readOnly,
  badge,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  badge?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        {badge && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {badge}
          </Badge>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          R$
        </span>
        <Input
          type="number"
          step="0.01"
          className="pl-9 h-9 text-sm tabular-nums"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>
    </div>
  );
}

interface FormState {
  receitaBrutaManual: string;
  useManualReceita: boolean;
  deducoesReceita: string;
  custosVariaveis: string;
  despesasPessoal: string;
  despesasAdministrativas: string;
  despesasComerciais: string;
  despesasGerais: string;
  depreciacaoAmortizacao: string;
  resultadoFinanceiro: string;
  irCsll: string;
  observacoes: string;
}

const EMPTY_FORM: FormState = {
  receitaBrutaManual: "",
  useManualReceita: false,
  deducoesReceita: "",
  custosVariaveis: "",
  despesasPessoal: "",
  despesasAdministrativas: "",
  despesasComerciais: "",
  despesasGerais: "",
  depreciacaoAmortizacao: "",
  resultadoFinanceiro: "",
  irCsll: "",
  observacoes: "",
};

const DRE_GROUP_OPTIONS = [
  { value: "deducoes_receita", label: "Deduções da Receita" },
  { value: "custos_variaveis", label: "Custos Variáveis" },
  { value: "despesas_pessoal", label: "Despesas com Pessoal" },
  { value: "despesas_administrativas", label: "Despesas Administrativas" },
  { value: "despesas_comerciais", label: "Despesas Comerciais" },
  { value: "despesas_gerais", label: "Despesas Gerais" },
  { value: "depreciacao_amortizacao", label: "Depreciação e Amortização" },
  { value: "resultado_financeiro", label: "Resultado Financeiro" },
  { value: "ir_csll", label: "IR/CSLL" },
  { value: "ignorar", label: "Ignorar" },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

const PercentTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatPercent(p.value)}
        </p>
      ))}
    </div>
  );
};

function KPICard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: any;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  const bgMap: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    violet: "bg-violet-500/10 text-violet-500",
    amber: "bg-amber-500/10 text-amber-500",
    sky: "bg-sky-500/10 text-sky-500",
    rose: "bg-rose-500/10 text-rose-500",
    blue: "bg-blue-500/10 text-blue-500",
    teal: "bg-teal-500/10 text-teal-500",
  };

  return (
    <Card className="py-3 px-4 gap-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium truncate">
          {label}
        </span>
        <div
          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${bgMap[color] || bgMap.indigo}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-lg font-bold tracking-tight tabular-nums">{value}</p>
      {subValue && (
        <div className="flex items-center gap-1 mt-0.5">
          {trend === "up" && (
            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
          )}
          {trend === "down" && (
            <ArrowDownRight className="h-3 w-3 text-rose-500" />
          )}
          <span
            className={`text-xs ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-muted-foreground"}`}
          >
            {subValue}
          </span>
        </div>
      )}
    </Card>
  );
}

function DreStatementRow({
  label,
  value,
  pct,
  type,
}: {
  label: string;
  value: number;
  pct?: number;
  type: "item" | "subtotal" | "result";
}) {
  const isSubtotal = type === "subtotal";
  const isResult = type === "result";

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 ${
        isResult
          ? "bg-primary/5 border-t-2 border-primary/20 font-bold"
          : isSubtotal
            ? "bg-muted/50 font-semibold border-t border-border/50"
            : "border-b border-border/30"
      }`}
    >
      <span
        className={`text-sm ${isResult ? "text-primary" : isSubtotal ? "" : "text-muted-foreground pl-2"}`}
      >
        {label}
      </span>
      <div className="flex items-center gap-4">
        {pct !== undefined && (
          <span
            className={`text-xs tabular-nums w-16 text-right ${isResult || isSubtotal ? "" : "text-muted-foreground"}`}
          >
            {formatPercent(pct)}
          </span>
        )}
        <span
          className={`text-sm tabular-nums w-32 text-right ${value < 0 ? "text-rose-500" : ""}`}
        >
          {formatCurrency(value)}
        </span>
      </div>
    </div>
  );
}

export default function DreGerencial() {
  const [selectedCompetencia, setSelectedCompetencia] = useState(CURRENT_MONTH);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompetencia, setNewCompetencia] = useState(CURRENT_MONTH);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected === "true") {
      toast.success("Conta Azul conectada com sucesso!");
      utils.contaAzul.invalidate();
    } else if (error === "no_code") {
      toast.error("Falha na autorização: código não recebido do Conta Azul.");
    } else if (error === "auth_failed") {
      toast.error("Falha ao conectar com o Conta Azul. Tente novamente.");
    }
    if (connected || error) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: dreList, isLoading: loadingList } = trpc.dre.list.useQuery();
  const { data: dreData, isLoading: loadingDre } =
    trpc.dre.getByCompetencia.useQuery(
      { competencia: selectedCompetencia },
      { enabled: !isCreating }
    );
  const { data: resumoData, isLoading: loadingResumo } =
    trpc.dre.getResumo.useQuery();

  // Conta Azul integration
  const { data: caStatus } = trpc.contaAzul.getStatus.useQuery();
  const isConnected = caStatus?.connected === true;

  const [showMappings, setShowMappings] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);

  const connectUrlQuery = trpc.contaAzul.getConnectUrl.useQuery(undefined, {
    enabled: false,
  });

  const disconnectMutation = trpc.contaAzul.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Conta Azul desconectada");
      utils.contaAzul.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const syncMasterMutation = trpc.contaAzul.syncMasterData.useMutation({
    onSuccess: data => {
      toast.success(
        `Sincronizado: ${data.categories} categorias, ${data.costCenters} centros de custo, ${data.autoMapped} mapeados`
      );
      utils.contaAzul.invalidate();
      utils.dreMappings.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const syncExpensesMutation = trpc.contaAzul.syncExpenses.useMutation({
    onSuccess: data => {
      toast.success(`${data.synced} despesas sincronizadas`);
    },
    onError: err => toast.error(err.message),
  });

  const importPreviewQuery = trpc.contaAzul.getImportPreview.useQuery(
    { competencia: isCreating ? newCompetencia : selectedCompetencia },
    { enabled: false }
  );

  const { data: mappingsList } = trpc.dreMappings.list.useQuery(undefined, {
    enabled: showMappings,
  });

  const { data: unmappedItems } = trpc.contaAzul.getUnmappedItems.useQuery(
    undefined,
    { enabled: showMappings }
  );

  const { data: caCategories } = trpc.contaAzul.getCategories.useQuery(
    undefined,
    { enabled: showMappings }
  );

  const upsertMappingMutation = trpc.dreMappings.upsert.useMutation({
    onSuccess: () => {
      utils.dreMappings.invalidate();
      utils.contaAzul.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const deleteMappingMutation = trpc.dreMappings.delete.useMutation({
    onSuccess: () => {
      utils.dreMappings.invalidate();
      utils.contaAzul.invalidate();
    },
  });

  const autoMapMutation = trpc.dreMappings.autoMap.useMutation({
    onSuccess: data => {
      if (data.mapped > 0) {
        toast.success(
          `Auto-mapeamento concluído: ${data.mapped} categorias associadas automaticamente. ${data.pending} categorias seguem pendentes para revisão manual.`,
        );
      } else {
        toast.info(
          data.pending > 0
            ? `Nenhuma categoria pôde ser mapeada automaticamente. ${data.pending} categorias seguem pendentes para revisão manual.`
            : "Todas as categorias já estão mapeadas.",
        );
      }
      utils.dreMappings.invalidate();
      utils.contaAzul.invalidate();
    },
  });

  const handleConnect = async () => {
    const result = await connectUrlQuery.refetch();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  };

  const handleImportPreview = async () => {
    const comp = isCreating ? newCompetencia : selectedCompetencia;
    await syncExpensesMutation.mutateAsync({ competencia: comp });
    const result = await importPreviewQuery.refetch();
    if (result.data) {
      setImportPreview(result.data);
    }
  };

  const handleApplyImport = () => {
    if (!importPreview) return;
    setForm(prev => ({
      ...prev,
      deducoesReceita: String(importPreview.deducoes_receita || 0),
      custosVariaveis: String(importPreview.custos_variaveis || 0),
      despesasPessoal: String(importPreview.despesas_pessoal || 0),
      despesasAdministrativas: String(
        importPreview.despesas_administrativas || 0
      ),
      despesasComerciais: String(importPreview.despesas_comerciais || 0),
      despesasGerais: String(importPreview.despesas_gerais || 0),
      depreciacaoAmortizacao: String(
        importPreview.depreciacao_amortizacao || 0
      ),
      resultadoFinanceiro: String(importPreview.resultado_financeiro || 0),
      irCsll: String(importPreview.ir_csll || 0),
    }));
    setImportPreview(null);
    toast.success("Valores importados aplicados ao formulário");
  };

  const createMutation = trpc.dre.create.useMutation({
    onSuccess: () => {
      toast.success("DRE salvo com sucesso!");
      setIsCreating(false);
      utils.dre.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const updateMutation = trpc.dre.update.useMutation({
    onSuccess: () => {
      toast.success("DRE atualizado com sucesso!");
      setEditingId(null);
      utils.dre.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const deleteMutation = trpc.dre.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro removido");
      setEditingId(null);
      utils.dre.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  useEffect(() => {
    if (isCreating) {
      setForm(EMPTY_FORM);
      setEditingId(null);
      return;
    }
    if (dreData?.dre) {
      const d = dreData.dre;
      setForm({
        receitaBrutaManual: d.receitaBrutaManual ?? "",
        useManualReceita: !!d.receitaBrutaManual,
        deducoesReceita: d.deducoesReceita ?? "0",
        custosVariaveis: d.custosVariaveis ?? "0",
        despesasPessoal: d.despesasPessoal ?? "0",
        despesasAdministrativas: d.despesasAdministrativas ?? "0",
        despesasComerciais: d.despesasComerciais ?? "0",
        despesasGerais: d.despesasGerais ?? "0",
        depreciacaoAmortizacao: d.depreciacaoAmortizacao ?? "0",
        resultadoFinanceiro: d.resultadoFinanceiro ?? "0",
        irCsll: d.irCsll ?? "0",
        observacoes: d.observacoes ?? "",
      });
      setEditingId(d.id);
    } else {
      setForm(EMPTY_FORM);
      setEditingId(null);
    }
  }, [dreData, isCreating]);

  const faturamento = dreData?.faturamento ?? 0;

  const receitaBruta =
    form.useManualReceita && form.receitaBrutaManual
      ? toNum(form.receitaBrutaManual)
      : faturamento;

  const dre: DreCompleto = useMemo(
    () =>
      calcularDre({
        receitaBruta,
        deducoesReceita: toNum(form.deducoesReceita),
        custosVariaveis: toNum(form.custosVariaveis),
        despesasPessoal: toNum(form.despesasPessoal),
        despesasAdministrativas: toNum(form.despesasAdministrativas),
        despesasComerciais: toNum(form.despesasComerciais),
        despesasGerais: toNum(form.despesasGerais),
        depreciacaoAmortizacao: toNum(form.depreciacaoAmortizacao),
        resultadoFinanceiro: toNum(form.resultadoFinanceiro),
        irCsll: toNum(form.irCsll),
      }),
    [form, receitaBruta]
  );

  const updateField = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    const payload = {
      receitaBrutaManual:
        form.useManualReceita && form.receitaBrutaManual
          ? form.receitaBrutaManual
          : null,
      deducoesReceita: form.deducoesReceita || "0",
      custosVariaveis: form.custosVariaveis || "0",
      despesasPessoal: form.despesasPessoal || "0",
      despesasAdministrativas: form.despesasAdministrativas || "0",
      despesasComerciais: form.despesasComerciais || "0",
      despesasGerais: form.despesasGerais || "0",
      depreciacaoAmortizacao: form.depreciacaoAmortizacao || "0",
      resultadoFinanceiro: form.resultadoFinanceiro || "0",
      irCsll: form.irCsll || "0",
      observacoes: form.observacoes || null,
    };

    if (isCreating) {
      createMutation.mutate({ competencia: newCompetencia, ...payload });
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    }
  };

  const handleNewClick = () => {
    setIsCreating(true);
    setNewCompetencia(CURRENT_MONTH);
    setForm(EMPTY_FORM);
  };

  const handleCancelNew = () => {
    setIsCreating(false);
  };

  const competencias = useMemo(() => {
    if (!dreList) return [];
    return dreList.map(d => d.competencia);
  }, [dreList]);

  useEffect(() => {
    if (competencias.length > 0 && !isCreating) {
      if (!competencias.includes(selectedCompetencia)) {
        setSelectedCompetencia(competencias[0]);
      }
    }
  }, [competencias]);

  const hasRecord = !!dreData?.dre && !isCreating;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const pctBase = dre.receitaLiquida || 1;

  // Chart data for history
  const evolutionData = useMemo(() => {
    if (!resumoData) return [];
    return [...resumoData]
      .sort((a, b) => a.competencia.localeCompare(b.competencia))
      .map(r => ({
        mes: r.competencia,
        "Receita Líquida": r.receitaLiquida,
        EBITDA: r.ebitda,
        "Lucro Líquido": r.lucroLiquido,
      }));
  }, [resumoData]);

  const marginsData = useMemo(() => {
    if (!resumoData) return [];
    return [...resumoData]
      .sort((a, b) => a.competencia.localeCompare(b.competencia))
      .map(r => ({
        mes: r.competencia,
        "Margem EBITDA": r.margemEbitda,
        "Margem Líquida": r.margemLiquida,
      }));
  }, [resumoData]);

  const despesasChartData = useMemo(() => {
    return [
      { name: "Pessoal", value: toNum(form.despesasPessoal) },
      { name: "Administrativas", value: toNum(form.despesasAdministrativas) },
      { name: "Comerciais", value: toNum(form.despesasComerciais) },
      { name: "Gerais", value: toNum(form.despesasGerais) },
      { name: "D&A", value: toNum(form.depreciacaoAmortizacao) },
    ];
  }, [form]);

  const historyTableData = useMemo(() => {
    if (!resumoData) return [];
    return [...resumoData].sort((a, b) =>
      b.competencia.localeCompare(a.competencia)
    );
  }, [resumoData]);

  if (loadingList) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileSpreadsheet}
        title="DRE Gerencial"
        description="Demonstração do Resultado do Exercício com EBITDA"
        accent="emerald"
      >
        {!isCreating && (
          <Select
            value={selectedCompetencia}
            onValueChange={v => {
              setSelectedCompetencia(v);
              setIsCreating(false);
            }}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Competência" />
            </SelectTrigger>
            <SelectContent>
              {competencias.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
              {competencias.length === 0 && (
                <SelectItem value={CURRENT_MONTH} disabled>
                  Nenhum registro
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" variant="outline" onClick={handleNewClick}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Mês
        </Button>
      </PageHeader>

      {/* Conta Azul Integration Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${isConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
            >
              {isConnected ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                Conta Azul{" "}
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className="ml-1.5 text-[10px] h-4 px-1.5"
                >
                  {isConnected ? "Conectado" : "Desconectado"}
                </Badge>
              </p>
              {isConnected && caStatus?.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Última sync:{" "}
                  {new Date(caStatus.lastSyncAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncMasterMutation.mutate()}
                  disabled={syncMasterMutation.isPending}
                >
                  {syncMasterMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Sincronizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMappings(true)}
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                  Mapeamentos
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Deseja desconectar o Conta Azul?"))
                      disconnectMutation.mutate();
                  }}
                >
                  <Unlink className="h-3.5 w-3.5 mr-1.5" />
                  Desconectar
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                <Link2 className="h-3.5 w-3.5 mr-1.5" />
                Conectar Conta Azul
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="cadastro" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cadastro">
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Cadastro / Edição
          </TabsTrigger>
          <TabsTrigger value="historico">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* ==================== ABA CADASTRO ==================== */}
        <TabsContent value="cadastro" className="space-y-5">
          {isCreating && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Nova competência:</Label>
                <Input
                  type="month"
                  className="w-44 h-9"
                  value={newCompetencia}
                  onChange={e => setNewCompetencia(e.target.value)}
                />
                <Button size="sm" variant="ghost" onClick={handleCancelNew}>
                  Cancelar
                </Button>
              </div>
            </Card>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KPICard
              label="Receita Bruta"
              value={formatCurrencyShort(dre.receitaBruta)}
              icon={DollarSign}
              color="indigo"
            />
            <KPICard
              label="Receita Líquida"
              value={formatCurrencyShort(dre.receitaLiquida)}
              icon={DollarSign}
              color="blue"
            />
            <KPICard
              label="Lucro Bruto"
              value={formatCurrencyShort(dre.lucroBruto)}
              subValue={formatPercent(dre.margemBruta)}
              icon={TrendingUp}
              color="teal"
              trend={dre.lucroBruto >= 0 ? "up" : "down"}
            />
            <KPICard
              label="EBITDA"
              value={formatCurrencyShort(dre.ebitda)}
              subValue={formatPercent(dre.margemEbitda)}
              icon={BarChart3}
              color="emerald"
              trend={dre.ebitda >= 0 ? "up" : "down"}
            />
            <KPICard
              label="Margem EBITDA"
              value={formatPercent(dre.margemEbitda)}
              icon={TrendingUp}
              color="violet"
            />
            <KPICard
              label="EBIT"
              value={formatCurrencyShort(dre.ebit)}
              icon={BarChart3}
              color="amber"
              trend={dre.ebit >= 0 ? "up" : "down"}
            />
            <KPICard
              label="Lucro Líquido"
              value={formatCurrencyShort(dre.lucroLiquido)}
              subValue={formatPercent(dre.margemLiquida)}
              icon={dre.lucroLiquido >= 0 ? TrendingUp : TrendingDown}
              color={dre.lucroLiquido >= 0 ? "emerald" : "rose"}
              trend={dre.lucroLiquido >= 0 ? "up" : "down"}
            />
            <KPICard
              label="Margem Líquida"
              value={formatPercent(dre.margemLiquida)}
              icon={dre.margemLiquida >= 0 ? TrendingUp : TrendingDown}
              color={dre.margemLiquida >= 0 ? "sky" : "rose"}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Formulário */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {isCreating
                    ? "Novo Registro"
                    : hasRecord
                      ? `Editar — ${selectedCompetencia}`
                      : "Cadastrar Dados"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Receita Bruta */}
                <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Receita Bruta</Label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={form.useManualReceita}
                          onChange={e =>
                            setForm(prev => ({
                              ...prev,
                              useManualReceita: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          Override manual
                        </span>
                      </label>
                    </div>
                  </div>

                  {form.useManualReceita ? (
                    <MoneyInput
                      label="Valor manual"
                      value={form.receitaBrutaManual}
                      onChange={v => updateField("receitaBrutaManual", v)}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tabular-nums">
                        {formatCurrency(faturamento)}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1.5"
                      >
                        Faturamento
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MoneyInput
                    label="(-) Deduções da Receita"
                    value={form.deducoesReceita}
                    onChange={v => updateField("deducoesReceita", v)}
                  />
                  <MoneyInput
                    label="(-) Custos Variáveis"
                    value={form.custosVariaveis}
                    onChange={v => updateField("custosVariaveis", v)}
                  />
                  <MoneyInput
                    label="(-) Despesas com Pessoal"
                    value={form.despesasPessoal}
                    onChange={v => updateField("despesasPessoal", v)}
                  />
                  <MoneyInput
                    label="(-) Despesas Administrativas"
                    value={form.despesasAdministrativas}
                    onChange={v => updateField("despesasAdministrativas", v)}
                  />
                  <MoneyInput
                    label="(-) Despesas Comerciais"
                    value={form.despesasComerciais}
                    onChange={v => updateField("despesasComerciais", v)}
                  />
                  <MoneyInput
                    label="(-) Despesas Gerais"
                    value={form.despesasGerais}
                    onChange={v => updateField("despesasGerais", v)}
                  />
                  <MoneyInput
                    label="(-) Depreciação e Amortização"
                    value={form.depreciacaoAmortizacao}
                    onChange={v => updateField("depreciacaoAmortizacao", v)}
                  />
                  <MoneyInput
                    label="(+/-) Resultado Financeiro"
                    value={form.resultadoFinanceiro}
                    onChange={v => updateField("resultadoFinanceiro", v)}
                  />
                  <MoneyInput
                    label="(-) IR/CSLL"
                    value={form.irCsll}
                    onChange={v => updateField("irCsll", v)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Observações
                  </Label>
                  <Textarea
                    className="text-sm h-20 resize-none"
                    placeholder="Notas sobre o período..."
                    value={form.observacoes}
                    onChange={e => updateField("observacoes", e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {isSaving
                      ? "Salvando..."
                      : isCreating
                        ? "Criar Registro"
                        : "Salvar Alterações"}
                  </Button>
                  {hasRecord && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        if (
                          editingId &&
                          confirm("Deseja remover este registro?")
                        ) {
                          deleteMutation.mutate({ id: editingId });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Demonstrativo DRE */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Demonstrativo do Resultado
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingDre ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y-0">
                    <DreStatementRow
                      label="Receita Bruta"
                      value={dre.receitaBruta}
                      pct={100}
                      type="subtotal"
                    />
                    <DreStatementRow
                      label="(-) Deduções da Receita"
                      value={-dre.deducoesReceita}
                      pct={
                        dre.receitaBruta
                          ? (dre.deducoesReceita / dre.receitaBruta) * -100
                          : 0
                      }
                      type="item"
                    />
                    <DreStatementRow
                      label="(=) Receita Líquida"
                      value={dre.receitaLiquida}
                      pct={
                        dre.receitaBruta
                          ? (dre.receitaLiquida / dre.receitaBruta) * 100
                          : 0
                      }
                      type="subtotal"
                    />
                    <DreStatementRow
                      label="(-) Custos Variáveis"
                      value={-dre.custosVariaveis}
                      pct={pctBase ? (dre.custosVariaveis / pctBase) * -100 : 0}
                      type="item"
                    />
                    <DreStatementRow
                      label="(=) Lucro Bruto"
                      value={dre.lucroBruto}
                      pct={dre.margemBruta}
                      type="subtotal"
                    />
                    <DreStatementRow
                      label="(-) Despesas com Pessoal"
                      value={-dre.despesasPessoal}
                      pct={pctBase ? (dre.despesasPessoal / pctBase) * -100 : 0}
                      type="item"
                    />
                    <DreStatementRow
                      label="(-) Despesas Administrativas"
                      value={-dre.despesasAdministrativas}
                      pct={
                        pctBase
                          ? (dre.despesasAdministrativas / pctBase) * -100
                          : 0
                      }
                      type="item"
                    />
                    <DreStatementRow
                      label="(-) Despesas Comerciais"
                      value={-dre.despesasComerciais}
                      pct={
                        pctBase ? (dre.despesasComerciais / pctBase) * -100 : 0
                      }
                      type="item"
                    />
                    <DreStatementRow
                      label="(-) Despesas Gerais"
                      value={-dre.despesasGerais}
                      pct={pctBase ? (dre.despesasGerais / pctBase) * -100 : 0}
                      type="item"
                    />
                    <DreStatementRow
                      label="(=) EBITDA"
                      value={dre.ebitda}
                      pct={dre.margemEbitda}
                      type="result"
                    />
                    <DreStatementRow
                      label="(-) Depreciação e Amortização"
                      value={-dre.depreciacaoAmortizacao}
                      pct={
                        pctBase
                          ? (dre.depreciacaoAmortizacao / pctBase) * -100
                          : 0
                      }
                      type="item"
                    />
                    <DreStatementRow
                      label="(=) EBIT"
                      value={dre.ebit}
                      pct={dre.margemEbit}
                      type="subtotal"
                    />
                    <DreStatementRow
                      label="(+/-) Resultado Financeiro"
                      value={dre.resultadoFinanceiro}
                      pct={
                        pctBase ? (dre.resultadoFinanceiro / pctBase) * 100 : 0
                      }
                      type="item"
                    />
                    <DreStatementRow
                      label="(=) Resultado Antes do IR/CSLL"
                      value={dre.resultadoAntesIrCsll}
                      pct={
                        pctBase ? (dre.resultadoAntesIrCsll / pctBase) * 100 : 0
                      }
                      type="subtotal"
                    />
                    <DreStatementRow
                      label="(-) IR/CSLL"
                      value={-dre.irCsll}
                      pct={pctBase ? (dre.irCsll / pctBase) * -100 : 0}
                      type="item"
                    />
                    <DreStatementRow
                      label="(=) Lucro Líquido"
                      value={dre.lucroLiquido}
                      pct={dre.margemLiquida}
                      type="result"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Conta Azul Import Panel */}
          {isConnected && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Importar do Conta Azul
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleImportPreview}
                    disabled={
                      syncExpensesMutation.isPending ||
                      importPreviewQuery.isFetching
                    }
                  >
                    {syncExpensesMutation.isPending ||
                    importPreviewQuery.isFetching ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Buscar despesas de{" "}
                    {isCreating ? newCompetencia : selectedCompetencia}
                  </Button>
                </div>
              </CardHeader>
              {importPreview && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <p className="text-muted-foreground text-xs">
                        Total de despesas
                      </p>
                      <p className="font-bold text-lg">
                        {importPreview.meta.totalExpenses}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-muted-foreground text-xs">
                        Com mapeamento
                      </p>
                      <p className="font-bold text-lg text-emerald-600">
                        {importPreview.meta.mappedExpenses}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-muted-foreground text-xs">
                        Sem mapeamento
                      </p>
                      <p className="font-bold text-lg text-amber-600">
                        {importPreview.meta.unmappedExpenses}
                      </p>
                    </div>
                  </div>

                  {importPreview.meta.unmappedCategories.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-700">
                          Categorias sem mapeamento:
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {importPreview.meta.unmappedCategories.join(", ")}
                        </p>
                        <Button
                          size="sm"
                          variant="link"
                          className="h-auto p-0 text-xs mt-1"
                          onClick={() => setShowMappings(true)}
                        >
                          Configurar mapeamentos
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Grupo DRE
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Valor Importado
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Valor Atual
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            key: "deducoes_receita",
                            label: "Deduções da Receita",
                            formKey: "deducoesReceita",
                          },
                          {
                            key: "custos_variaveis",
                            label: "Custos Variáveis",
                            formKey: "custosVariaveis",
                          },
                          {
                            key: "despesas_pessoal",
                            label: "Despesas com Pessoal",
                            formKey: "despesasPessoal",
                          },
                          {
                            key: "despesas_administrativas",
                            label: "Despesas Administrativas",
                            formKey: "despesasAdministrativas",
                          },
                          {
                            key: "despesas_comerciais",
                            label: "Despesas Comerciais",
                            formKey: "despesasComerciais",
                          },
                          {
                            key: "despesas_gerais",
                            label: "Despesas Gerais",
                            formKey: "despesasGerais",
                          },
                          {
                            key: "depreciacao_amortizacao",
                            label: "Depreciação e Amortização",
                            formKey: "depreciacaoAmortizacao",
                          },
                          {
                            key: "resultado_financeiro",
                            label: "Resultado Financeiro",
                            formKey: "resultadoFinanceiro",
                          },
                          {
                            key: "ir_csll",
                            label: "IR/CSLL",
                            formKey: "irCsll",
                          },
                        ].map(({ key, label, formKey }) => {
                          const imported = importPreview[key] || 0;
                          const current = toNum((form as any)[formKey]);
                          const diff = imported !== current;
                          return (
                            <tr
                              key={key}
                              className={`border-b border-border/30 ${diff ? "bg-amber-500/5" : ""}`}
                            >
                              <td className="px-3 py-2">{label}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium">
                                {formatCurrency(imported)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                {formatCurrency(current)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setImportPreview(null)}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleApplyImport}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Aplicar sugestões ao formulário
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Composição de Despesas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Composição de Despesas —{" "}
                {isCreating ? newCompetencia : selectedCompetencia}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={despesasChartData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={v => formatCurrencyShort(v)}
                      className="text-xs"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      className="text-xs"
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Valor"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ABA HISTÓRICO ==================== */}
        <TabsContent value="historico" className="space-y-5">
          {loadingResumo ? (
            <div className="space-y-4">
              <Skeleton className="h-80" />
              <Skeleton className="h-64" />
            </div>
          ) : historyTableData.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-2">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  Nenhum registro de DRE cadastrado.
                </p>
                <Button size="sm" variant="outline" onClick={handleNewClick}>
                  <Plus className="h-4 w-4 mr-1" />
                  Cadastrar primeiro mês
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Tabela histórica */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Visão Comparativa Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                            Competência
                          </th>
                          <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                            Receita Bruta
                          </th>
                          <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                            Receita Líquida
                          </th>
                          <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                            Lucro Bruto
                          </th>
                          <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                            EBITDA
                          </th>
                          <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                            Margem EBITDA
                          </th>
                          <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                            Lucro Líquido
                          </th>
                          <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                            Margem Líquida
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyTableData.map(r => (
                          <tr
                            key={r.competencia}
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedCompetencia(r.competencia);
                              setIsCreating(false);
                            }}
                          >
                            <td className="px-4 py-2.5 font-medium">
                              {r.competencia}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {formatCurrency(r.receitaBruta)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {formatCurrency(r.receitaLiquida)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {formatCurrency(r.lucroBruto)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                              {formatCurrency(r.ebitda)}
                            </td>
                            <td
                              className={`px-4 py-2.5 text-right tabular-nums ${r.margemEbitda >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                            >
                              {formatPercent(r.margemEbitda)}
                            </td>
                            <td
                              className={`px-4 py-2.5 text-right tabular-nums ${r.lucroLiquido >= 0 ? "" : "text-rose-500"}`}
                            >
                              {formatCurrency(r.lucroLiquido)}
                            </td>
                            <td
                              className={`px-4 py-2.5 text-right tabular-nums ${r.margemLiquida >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                            >
                              {formatPercent(r.margemLiquida)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico evolução */}
              <div className="grid lg:grid-cols-2 gap-5">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Evolução — Receita, EBITDA e Lucro Líquido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={evolutionData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border/50"
                          />
                          <XAxis dataKey="mes" className="text-xs" />
                          <YAxis
                            tickFormatter={v => formatCurrencyShort(v)}
                            className="text-xs"
                            width={80}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="Receita Líquida"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="EBITDA"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="Lucro Líquido"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Evolução — Margens (%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={marginsData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border/50"
                          />
                          <XAxis dataKey="mes" className="text-xs" />
                          <YAxis
                            tickFormatter={v => `${v.toFixed(0)}%`}
                            className="text-xs"
                            width={50}
                          />
                          <Tooltip content={<PercentTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="Margem EBITDA"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="Margem Líquida"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Mappings Dialog */}
      <Dialog open={showMappings} onOpenChange={setShowMappings}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Mapeamento de Categorias Conta Azul → DRE
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto min-h-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Associe cada categoria do Conta Azul a um grupo do DRE
                gerencial.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => autoMapMutation.mutate()}
                disabled={autoMapMutation.isPending}
              >
                {autoMapMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Auto-mapear
              </Button>
            </div>

            {unmappedItems && unmappedItems.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-700 mb-2">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  {unmappedItems.length} categorias sem mapeamento
                </p>
                <div className="space-y-2">
                  {unmappedItems.map(item => (
                    <div
                      key={item.externalId}
                      className="flex items-center justify-between gap-2 p-2 bg-background rounded border"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">
                          {item.name}
                        </p>
                        {item.entradaDre && (
                          <p className="text-xs text-muted-foreground">
                            entrada_dre: {item.entradaDre}
                          </p>
                        )}
                      </div>
                      <Select
                        onValueChange={dreGroup =>
                          upsertMappingMutation.mutate({
                            sourceType: "conta_azul_category",
                            sourceExternalId: item.externalId,
                            sourceName: item.name,
                            dreGroup: dreGroup as any,
                          })
                        }
                      >
                        <SelectTrigger className="w-64 h-8 text-xs shrink-0">
                          <SelectValue placeholder="Selecionar grupo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DRE_GROUP_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mappingsList && mappingsList.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Categoria
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Grupo DRE
                      </th>
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {mappingsList.map(m => (
                      <tr key={m.id} className="border-b border-border/30">
                        <td className="px-3 py-2">
                          <p className="font-medium">{m.sourceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.sourceType === "conta_azul_category"
                              ? "Categoria"
                              : "Centro de Custo"}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={m.dreGroup}
                            onValueChange={dreGroup =>
                              upsertMappingMutation.mutate({
                                sourceType: m.sourceType as any,
                                sourceExternalId: m.sourceExternalId,
                                sourceName: m.sourceName,
                                dreGroup: dreGroup as any,
                              })
                            }
                          >
                            <SelectTrigger className="w-64 h-8 text-xs shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DRE_GROUP_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() =>
                              deleteMappingMutation.mutate({ id: m.id })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(!mappingsList || mappingsList.length === 0) &&
              (!unmappedItems || unmappedItems.length === 0) && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum mapeamento encontrado.</p>
                  <p className="text-xs mt-1">
                    Sincronize as categorias do Conta Azul primeiro.
                  </p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
