import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  contaAzulCategories,
  contaAzulCostCenters,
  contaAzulExpenses,
  dreAccountMappings,
} from "../../drizzle/schema";
import { contaAzulGet } from "./contaAzulClient";
import { updateLastSyncAt } from "./contaAzulAuth";

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

export async function syncCategories(): Promise<{ synced: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let page = 1;
  let totalSynced = 0;
  const pageSize = 500;

  while (true) {
    const data = await contaAzulGet<{
      itens: any[];
      itens_totais: number;
    }>("/v1/categorias", {
      pagina: page,
      tamanho_pagina: pageSize,
      permite_apenas_filhos: false,
    });

    if (!data.itens || data.itens.length === 0) break;

    for (const item of data.itens) {
      const externalId = item.id;
      const existing = await db
        .select()
        .from(contaAzulCategories)
        .where(eq(contaAzulCategories.externalId, externalId))
        .limit(1);

      const values = {
        externalId,
        name: item.nome || "Sem nome",
        type: item.tipo || null,
        entradaDre: item.entrada_dre || null,
        parentExternalId: item.categoria_pai || null,
        rawPayload: item,
      };

      if (existing.length > 0) {
        await db
          .update(contaAzulCategories)
          .set(values)
          .where(eq(contaAzulCategories.externalId, externalId));
      } else {
        await db.insert(contaAzulCategories).values(values);
      }
      totalSynced++;
    }

    if (data.itens.length < pageSize) break;
    page++;
  }

  console.log(`[ContaAzul] Synced ${totalSynced} categories`);
  return { synced: totalSynced };
}

export async function syncCostCenters(): Promise<{ synced: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let page = 1;
  let totalSynced = 0;
  const pageSize = 500;

  while (true) {
    const data = await contaAzulGet<{
      itens: any[];
      itens_totais: number;
    }>("/v1/centro-de-custo", {
      pagina: page,
      tamanho_pagina: pageSize,
      status: "ATIVO",
    });

    if (!data.itens || data.itens.length === 0) break;

    for (const item of data.itens) {
      const externalId = item.id;
      const existing = await db
        .select()
        .from(contaAzulCostCenters)
        .where(eq(contaAzulCostCenters.externalId, externalId))
        .limit(1);

      const values = {
        externalId,
        name: item.nome || "Sem nome",
        code: item.codigo || null,
        active: item.ativo ?? true,
        rawPayload: item,
      };

      if (existing.length > 0) {
        await db
          .update(contaAzulCostCenters)
          .set(values)
          .where(eq(contaAzulCostCenters.externalId, externalId));
      } else {
        await db.insert(contaAzulCostCenters).values(values);
      }
      totalSynced++;
    }

    if (data.itens.length < pageSize) break;
    page++;
  }

  console.log(`[ContaAzul] Synced ${totalSynced} cost centers`);
  return { synced: totalSynced };
}

export async function syncExpensesByCompetencia(
  competencia: string
): Promise<{ synced: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [year, month] = competencia.split("-").map(Number);
  const startDate = `${competencia}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${competencia}-${String(lastDay).padStart(2, "0")}`;

  // The API requires data_vencimento_de/ate, but we filter by competencia
  let page = 1;
  let totalSynced = 0;
  const pageSize = 500;

  while (true) {
    const data = await contaAzulGet<{
      itens: any[];
      itens_totais: number;
    }>("/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar", {
      pagina: page,
      tamanho_pagina: pageSize,
      data_vencimento_de: startDate,
      data_vencimento_ate: endDate,
    });

    if (!data.itens || data.itens.length === 0) break;

    for (const item of data.itens) {
      const externalId = item.id;

      const catId =
        item.categorias?.[0]?.id || null;
      const catName =
        item.categorias?.[0]?.nome || null;
      const ccId =
        item.centros_custo?.[0]?.id || null;
      const ccName =
        item.centros_custo?.[0]?.nome || null;

      const itemCompetencia = item.data_competencia
        ? item.data_competencia.substring(0, 7)
        : competencia;

      const existing = await db
        .select()
        .from(contaAzulExpenses)
        .where(eq(contaAzulExpenses.externalId, externalId))
        .limit(1);

      const values = {
        externalId,
        competencia: itemCompetencia,
        dueDate: item.data_vencimento || null,
        paymentDate: item.data_pagamento || null,
        description: item.descricao || null,
        amount: String(item.total ?? item.nao_pago ?? 0),
        status: item.status_traduzido || item.status || null,
        categoryExternalId: catId,
        categoryName: catName,
        costCenterExternalId: ccId,
        costCenterName: ccName,
        rawPayload: item,
        importedAt: new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(contaAzulExpenses)
          .set(values)
          .where(eq(contaAzulExpenses.externalId, externalId));
      } else {
        await db.insert(contaAzulExpenses).values(values);
      }
      totalSynced++;
    }

    if (data.itens.length < pageSize) break;
    page++;
  }

  console.log(
    `[ContaAzul] Synced ${totalSynced} expenses for ${competencia}`
  );
  return { synced: totalSynced };
}

export async function autoMapCategories(): Promise<{ mapped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const categories = await db
    .select()
    .from(contaAzulCategories)
    .where(sql`${contaAzulCategories.entradaDre} IS NOT NULL AND ${contaAzulCategories.entradaDre} != ''`);

  let mapped = 0;

  for (const cat of categories) {
    const dreGroup =
      ENTRADA_DRE_MAP[cat.entradaDre!] || null;
    if (!dreGroup) continue;

    const existing = await db
      .select()
      .from(dreAccountMappings)
      .where(
        sql`${dreAccountMappings.sourceType} = 'conta_azul_category' AND ${dreAccountMappings.sourceExternalId} = ${cat.externalId}`
      )
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(dreAccountMappings).values({
      sourceType: "conta_azul_category",
      sourceExternalId: cat.externalId,
      sourceName: cat.name,
      dreGroup: dreGroup as any,
    });
    mapped++;
  }

  console.log(`[ContaAzul] Auto-mapped ${mapped} categories`);
  return { mapped };
}

export async function syncAllMasterData() {
  const [catResult, ccResult] = await Promise.all([
    syncCategories(),
    syncCostCenters(),
  ]);
  const mapResult = await autoMapCategories();
  await updateLastSyncAt();

  return {
    categories: catResult.synced,
    costCenters: ccResult.synced,
    autoMapped: mapResult.mapped,
  };
}
