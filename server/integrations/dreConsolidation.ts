import { eq, sql, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  contaAzulExpenses,
  contaAzulCategories,
  dreAccountMappings,
  type DreGroup,
} from "../../drizzle/schema";
import { getFaturamentoByCompetencia } from "../db";

export interface ConsolidationResult {
  competencia: string;
  receitaBruta: number;
  deducoes_receita: number;
  custos_variaveis: number;
  despesas_pessoal: number;
  despesas_administrativas: number;
  despesas_comerciais: number;
  despesas_gerais: number;
  depreciacao_amortizacao: number;
  resultado_financeiro: number;
  ir_csll: number;
  meta: {
    totalExpenses: number;
    mappedExpenses: number;
    unmappedExpenses: number;
    unmappedCategories: string[];
    lastSyncAt: string | null;
  };
}

export async function consolidarDreImportado(
  competencia: string
): Promise<ConsolidationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const expenses = await db
    .select()
    .from(contaAzulExpenses)
    .where(eq(contaAzulExpenses.competencia, competencia));

  const mappings = await db.select().from(dreAccountMappings);

  const mappingMap = new Map<string, DreGroup>();
  for (const m of mappings) {
    const key = `${m.sourceType}:${m.sourceExternalId}`;
    mappingMap.set(key, m.dreGroup as DreGroup);
  }

  const groups: Record<string, number> = {
    deducoes_receita: 0,
    custos_variaveis: 0,
    despesas_pessoal: 0,
    despesas_administrativas: 0,
    despesas_comerciais: 0,
    despesas_gerais: 0,
    depreciacao_amortizacao: 0,
    resultado_financeiro: 0,
    ir_csll: 0,
  };

  let mappedCount = 0;
  let unmappedCount = 0;
  const unmappedCategorySet = new Set<string>();

  for (const exp of expenses) {
    const amount = Number(exp.amount) || 0;

    let dreGroup: DreGroup | undefined;

    if (exp.categoryExternalId) {
      dreGroup = mappingMap.get(
        `conta_azul_category:${exp.categoryExternalId}`
      );
    }

    if (!dreGroup && exp.costCenterExternalId) {
      dreGroup = mappingMap.get(
        `cost_center:${exp.costCenterExternalId}`
      );
    }

    if (!dreGroup && exp.categoryExternalId) {
      const [cat] = await db
        .select()
        .from(contaAzulCategories)
        .where(eq(contaAzulCategories.externalId, exp.categoryExternalId))
        .limit(1);

      if (cat?.entradaDre) {
        const ENTRADA_DRE_MAP: Record<string, string> = {
          DEDUCAO_DA_RECEITA_BRUTA: "deducoes_receita",
          CUSTO_DAS_MERCADORIAS: "custos_variaveis",
          CUSTO_DOS_SERVICOS: "custos_variaveis",
          DESPESAS_COM_PESSOAL: "despesas_pessoal",
          DESPESAS_ADMINISTRATIVAS: "despesas_administrativas",
          DESPESAS_COMERCIAIS: "despesas_comerciais",
          OUTRAS_DESPESAS_OPERACIONAIS: "despesas_gerais",
          DEPRECIACAO_E_AMORTIZACAO: "depreciacao_amortizacao",
          RECEITAS_FINANCEIRAS: "resultado_financeiro",
          DESPESAS_FINANCEIRAS: "resultado_financeiro",
          IMPOSTOS_SOBRE_O_LUCRO: "ir_csll",
        };
        dreGroup = ENTRADA_DRE_MAP[cat.entradaDre] as DreGroup;
      }
    }

    if (dreGroup && dreGroup !== "ignorar" && groups[dreGroup] !== undefined) {
      groups[dreGroup] += amount;
      mappedCount++;
    } else if (dreGroup === "ignorar") {
      mappedCount++;
    } else {
      unmappedCount++;
      const catLabel =
        exp.categoryName || exp.categoryExternalId || "Sem categoria";
      unmappedCategorySet.add(catLabel);
    }
  }

  const receitaBruta = await getFaturamentoByCompetencia(competencia);

  return {
    competencia,
    receitaBruta,
    deducoes_receita: groups.deducoes_receita,
    custos_variaveis: groups.custos_variaveis,
    despesas_pessoal: groups.despesas_pessoal,
    despesas_administrativas: groups.despesas_administrativas,
    despesas_comerciais: groups.despesas_comerciais,
    despesas_gerais: groups.despesas_gerais,
    depreciacao_amortizacao: groups.depreciacao_amortizacao,
    resultado_financeiro: groups.resultado_financeiro,
    ir_csll: groups.ir_csll,
    meta: {
      totalExpenses: expenses.length,
      mappedExpenses: mappedCount,
      unmappedExpenses: unmappedCount,
      unmappedCategories: Array.from(unmappedCategorySet),
      lastSyncAt: expenses.length > 0
        ? expenses[0].importedAt?.toISOString() ?? null
        : null,
    },
  };
}

export async function getUnmappedItems() {
  const db = await getDb();
  if (!db) return [];

  const categories = await db.select().from(contaAzulCategories);
  const mappings = await db.select().from(dreAccountMappings);

  const mappedIds = new Set(
    mappings
      .filter((m) => m.sourceType === "conta_azul_category")
      .map((m) => m.sourceExternalId)
  );

  return categories
    .filter((c) => !mappedIds.has(c.externalId) && c.type === "DESPESA")
    .map((c) => ({
      externalId: c.externalId,
      name: c.name,
      type: c.type,
      entradaDre: c.entradaDre,
    }));
}
