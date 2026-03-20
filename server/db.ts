import { eq, and, desc, sql, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { 
  InsertUser, 
  users,
  clientes,
  produtos,
  estoque,
  equipe,
  vendas,
  importLogs,
  alertas,
  dreGerencialMensal,
  dreAccountMappings,
  contaAzulCategories,
  contaAzulCostCenters,
  type Cliente,
  type Produto,
  type Estoque,
  type Equipe,
  type Venda,
  type Alerta,
  type InsertDreGerencialMensal,
  type InsertDreAccountMapping,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _migrated = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to create drizzle instance:", error);
      _db = null;
    }
  }

  if (_db && !_migrated) {
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const migrationsFolder = path.resolve(__dirname, "..", "drizzle");
      console.log("[Database] Running migrations from:", migrationsFolder);
      await migrate(_db, { migrationsFolder });
      _migrated = true;
      console.log("[Database] Migrations applied successfully");
    } catch (error: any) {
      const cause = error?.cause?.message || error?.cause || '';
      console.error("[Database] Migration failed:", error?.message, cause ? `| Cause: ${cause}` : '');
      if (error?.cause) console.error("[Database] Cause detail:", error.cause);
      _db = null;
      _migrated = false;
    }
  }

  return _db;
}

// ============= USER OPERATIONS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= CLIENTE OPERATIONS =============

export async function getAllClientes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clientes).where(eq(clientes.ativo, 'ATIVO')).orderBy(clientes.razaoSocial);
}

export async function getClienteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return result[0] || null;
}

export async function searchClientes(query: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clientes)
    .where(and(
      eq(clientes.ativo, 'ATIVO'),
      like(clientes.razaoSocial, `%${query}%`)
    ))
    .orderBy(clientes.razaoSocial);
}

export async function getTopClientesByValue(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: clientes.id,
    codCliente: sql<number>`ANY_VALUE(${clientes.codCliente})`,
    razaoSocial: sql<string>`ANY_VALUE(${clientes.razaoSocial})`,
    fantasia: sql<string>`ANY_VALUE(${clientes.fantasia})`,
    cidade: sql<string>`ANY_VALUE(${clientes.cidade})`,
    estado: sql<string>`ANY_VALUE(${clientes.estado})`,
    totalVendas: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidadeVendas: sql<number>`COUNT(${vendas.numVenda})`,
  })
    .from(clientes)
    .leftJoin(vendas, eq(clientes.codCliente, vendas.codCliente))
    .where(eq(clientes.ativo, 'ATIVO'))
    .groupBy(clientes.id)
    .orderBy(desc(sql`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))))`)) 
    .limit(limit);
}

// ============= PRODUTO OPERATIONS =============

export async function getAllProdutos() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(produtos).where(eq(produtos.ativo, 'ATIVO')).orderBy(produtos.nome);
}

export async function getProdutoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(produtos).where(eq(produtos.id, id)).limit(1);
  return result[0] || null;
}

export async function getTopProdutosByVendas(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    codProduto: vendas.codProduto,
    produto: sql<string>`ANY_VALUE(${vendas.produto})`,
    marca: sql<string>`ANY_VALUE(${vendas.marca})`,
    categoria: sql<string>`ANY_VALUE(${vendas.categoria})`,
    quantidadeVendida: sql<number>`COALESCE(SUM(CAST(${vendas.qtdUndVda} AS DECIMAL(12,2))), 0)`,
    faturamento: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
  })
    .from(vendas)
    .where(sql`${vendas.codProduto} IS NOT NULL`)
    .groupBy(vendas.codProduto)
    .orderBy(desc(sql`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))))`)) 
    .limit(limit);
}

/// ============= ESTOQUE OPERATIONS =============
// Estoque vem diretamente da coluna estoque_total da tabela produtos
// (importada da coluna 'ESTOQUE TOTAL UND' da aba PRODUTOS do Excel)
// Limiares: sem_estoque <= 0, critico <= 50, baixo <= 200
const LIMIAR_CRITICO = 50;
const LIMIAR_BAIXO = 200;

export async function getEstoqueByProdutoId(produtoId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(estoque).where(eq(estoque.produtoId, produtoId)).limit(1);
  return result[0] || null;
}

export async function getEstoqueBaixo(limite: number = 200) {
  const db = await getDb();
  if (!db) return [];
  // Retorna produtos com estoque_total <= LIMIAR_BAIXO, ordenados do menor para o maior
  const rows = await db.execute(sql`
    SELECT
      cod_produto  AS codProduto,
      nome         AS produto,
      marca,
      categoria,
      COALESCE(estoque_total, 0) AS estoque
    FROM produtos
    WHERE estoque_total IS NOT NULL AND estoque_total <= ${LIMIAR_BAIXO}
    ORDER BY estoque_total ASC
    LIMIT ${limite}
  `);
  return (rows[0] as unknown) as any[];
}

export async function getTotalEstoque() {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.execute(sql`
    SELECT COALESCE(SUM(estoque_total), 0) AS total
    FROM produtos
    WHERE estoque_total IS NOT NULL
  `);
  const result = ((rows[0] as unknown) as any[])[0];
  return Number(result?.total || 0);
}

export async function getEstoqueResumo() {
  const db = await getDb();
  if (!db) return { total: 0, semEstoque: 0, critico: 0, baixo: 0 };
  const rows = await db.execute(sql`
    SELECT
      COALESCE(SUM(estoque_total), 0) AS totalGeral,
      SUM(CASE WHEN estoque_total <= 0 THEN 1 ELSE 0 END) AS semEstoque,
      SUM(CASE WHEN estoque_total > 0 AND estoque_total <= 50 THEN 1 ELSE 0 END) AS critico,
      SUM(CASE WHEN estoque_total > 50 AND estoque_total <= 200 THEN 1 ELSE 0 END) AS baixo
    FROM produtos
    WHERE estoque_total IS NOT NULL
  `);
  const r = ((rows[0] as unknown) as any[])[0];
  return {
    total: Number(r?.totalGeral || 0),
    semEstoque: Number(r?.semEstoque || 0),
    critico: Number(r?.critico || 0),
    baixo: Number(r?.baixo || 0),
  };
}

export async function getEstoquePaginado(limit: number = 50, offset: number = 0, search?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const searchClause = search ? sql`AND nome LIKE ${'%' + search + '%'}` : sql``;
  const dataRows = await db.execute(sql`
    SELECT
      cod_produto   AS codProduto,
      nome,
      marca,
      categoria,
      COALESCE(estoque_total, 0) AS estoque
    FROM produtos
    WHERE estoque_total IS NOT NULL ${searchClause}
    ORDER BY estoque_total ASC
    LIMIT ${limit} OFFSET ${offset}
  `);
  const countRows = await db.execute(sql`
    SELECT COUNT(*) AS total
    FROM produtos
    WHERE estoque_total IS NOT NULL ${searchClause}
  `);
  return {
    data: (dataRows[0] as unknown) as any[],
    total: Number(((countRows[0] as unknown) as any[])[0]?.total || 0),
  };
}

// ============= EQUIPE OPERATIONS =============

export async function getAllEquipe() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(equipe).where(sql`${equipe.ativo} = 'ATIVO'`).orderBy(equipe.nome);
}

export async function getEquipeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(equipe).where(eq(equipe.id, id)).limit(1);
  return result[0] || null;
}

export async function getVendedorRanking(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: equipe.id,
    codVendedor: sql<number>`ANY_VALUE(${equipe.codVendedor})`,
    nome: sql<string>`ANY_VALUE(${equipe.nome})`,
    departamento: sql<string>`ANY_VALUE(${equipe.departamento})`,
    meta: sql<string>`ANY_VALUE(${equipe.meta})`,
    totalFaturamento: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidadeVendas: sql<number>`COUNT(${vendas.numVenda})`,
    ticketMedio: sql<number>`COALESCE(AVG(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
  })
    .from(equipe)
    .leftJoin(vendas, eq(equipe.codVendedor, vendas.codVendedor))
    .where(sql`${equipe.ativo} = 'ATIVO'`)
    .groupBy(equipe.id)
    .orderBy(desc(sql`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))))`)) 
    .limit(limit);
}

// ============= VENDA OPERATIONS =============

export async function getAllVendas(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(vendas)
    .orderBy(desc(vendas.emissaoData))
    .limit(limit)
    .offset(offset);
}

export async function getVendaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(vendas).where(eq(vendas.id, id)).limit(1);
  return result[0] || null;
}

export async function getVendasByClienteId(clienteId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(vendas)
    .where(eq(vendas.codCliente, clienteId))
    .orderBy(desc(vendas.emissaoData));
}

export async function getVendasByPeriod(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(vendas)
    .where(and(
      gte(vendas.emissaoData, startDate),
      lte(vendas.emissaoData, endDate)
    ))
    .orderBy(desc(vendas.emissaoData));
}

export async function getTotalVendas(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const conditions = [];
    if (startDate) conditions.push(gte(vendas.emissaoData, startDate));
    if (endDate) conditions.push(lte(vendas.emissaoData, endDate));
    
    const result = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    })
      .from(vendas)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return result[0]?.total || 0;
  } catch (err: any) {
    console.error('[getTotalVendas] MySQL Error:', {
      message: err?.message,
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
      sql: err?.sql,
      cause: err?.cause?.message || err?.cause,
      causeCode: err?.cause?.code,
      causeSqlMessage: err?.cause?.sqlMessage,
    });
    return 0;
  }
}

export async function getQuantidadeVendas(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions = [];
  if (startDate) conditions.push(gte(vendas.emissaoData, startDate));
  if (endDate) conditions.push(lte(vendas.emissaoData, endDate));
  
  const result = await db.select({
    quantidade: sql<number>`COUNT(${vendas.id})`,
  })
    .from(vendas)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  return result[0]?.quantidade || 0;
}

export async function getTicketMedio(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions = [];
  if (startDate) conditions.push(gte(vendas.emissaoData, startDate));
  if (endDate) conditions.push(lte(vendas.emissaoData, endDate));
  
  const result = await db.select({
    media: sql<number>`COALESCE(AVG(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
  })
    .from(vendas)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  return result[0]?.media || 0;
}

// ============= ALERTA OPERATIONS =============

export async function getAlertas(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(alertas)
    .orderBy(desc(alertas.dataAlerta))
    .limit(limit);
}

export async function getAlertasNaoLidos() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(alertas)
    .where(eq(alertas.lido, false))
    .orderBy(desc(alertas.dataAlerta));
}

export async function createAlerta(alerta: typeof alertas.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(alertas).values(alerta);
}

export async function markAlertaAsRead(alertaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(alertas)
    .set({ lido: true })
    .where(eq(alertas.id, alertaId));
}

// ============= IMPORT LOG OPERATIONS =============

export async function createImportLog(log: typeof importLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(importLogs).values(log);
}

export async function getLastImportLog() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(importLogs)
    .orderBy(desc(importLogs.dataImportacao))
    .limit(1);
  return result[0] || null;
}

// ============= BULK OPERATIONS =============

export async function clearAllData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available — check DATABASE_URL and connection");

  try {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  } catch (err: any) {
    const cause = err?.cause?.message || err?.cause || '';
    throw new Error(`FK_CHECKS failed: ${err?.message}${cause ? ' | Causa: ' + cause : ''}`);
  }

  try {
    await db.delete(vendas);
    await db.delete(estoque);
    await db.delete(alertas);
    await db.delete(clientes);
    await db.delete(produtos);
    await db.delete(equipe);
  } catch (err: any) {
    const cause = err?.cause?.message || err?.cause || '';
    console.error("[clearAllData] Delete failed:", err?.message, "| Cause:", err?.cause);
    throw new Error(`Falha ao limpar dados: ${err?.message}${cause ? ' | Causa: ' + cause : ''}`);
  } finally {
    try {
      await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    } catch (_) { /* best effort */ }
  }
}

export async function insertClientes(data: typeof clientes.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return { success: 0, failed: 0, errors: [] };
  await db.insert(clientes).values(data);
  return { success: data.length, failed: 0, errors: [] };
}

export async function insertProdutos(data: typeof produtos.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return { success: 0, failed: 0, errors: [] };
  await db.insert(produtos).values(data);
  return { success: data.length, failed: 0, errors: [] };
}

export async function insertEstoque(data: typeof estoque.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(estoque).values(data);
}

export async function insertEquipe(data: typeof equipe.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return { success: 0, failed: 0, errors: [] };
  await db.insert(equipe).values(data);
  return { success: data.length, failed: 0, errors: [] };
}

export async function insertVendas(data: typeof vendas.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return { success: 0, failed: 0, errors: [] };
  await db.insert(vendas).values(data);
  return { success: data.length, failed: 0, errors: [] };
}



export async function getClientesCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(clientes).where(eq(clientes.ativo, 'ATIVO'));
  return result[0]?.count || 0;
}

export async function getProdutosCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(produtos).where(eq(produtos.ativo, 'ATIVO'));
  return result[0]?.count || 0;
}

export async function getEquipeCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(equipe).where(sql`${equipe.ativo} = 'ATIVO'`);
  return result[0]?.count || 0;
}

// ============= VENDAS POR MÊS (GRÁFICO) =============

export async function getVendasPorMes(meses: number = 12) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    mes: vendas.emissaoAnoMes,
    total: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidade: sql<number>`COUNT(${vendas.id})`,
  })
    .from(vendas)
    .where(sql`${vendas.emissaoAnoMes} IS NOT NULL`)
    .groupBy(vendas.emissaoAnoMes)
    .orderBy(vendas.emissaoAnoMes)
    .limit(meses);
}

export async function getVendasPorVendedor(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    codVendedor: vendas.codVendedor,
    total: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidade: sql<number>`COUNT(${vendas.id})`,
  })
    .from(vendas)
    .where(sql`${vendas.codVendedor} IS NOT NULL`)
    .groupBy(vendas.codVendedor)
    .orderBy(desc(sql`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))))`)) 
    .limit(limit);
}

export async function getVendasPorCategoria() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    categoria: vendas.categoria,
    total: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidade: sql<number>`COUNT(${vendas.id})`,
  })
    .from(vendas)
    .where(sql`${vendas.categoria} IS NOT NULL AND ${vendas.categoria} != ''`)
    .groupBy(vendas.categoria)
    .orderBy(desc(sql`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))))`))
    .limit(20);
}

export async function getVendasPorCanal() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    canal: vendas.canal,
    total: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidade: sql<number>`COUNT(${vendas.id})`,
  })
    .from(vendas)
    .where(sql`${vendas.canal} IS NOT NULL AND ${vendas.canal} != ''`)
    .groupBy(vendas.canal)
    .orderBy(desc(sql`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))))`));
}

export async function getVendasRecentes(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: vendas.id,
    numVenda: vendas.numVenda,
    emissaoData: vendas.emissaoData,
    emissaoAnoMes: vendas.emissaoAnoMes,
    razaoSocial: vendas.razaoSocial,
    produto: vendas.produto,
    codVendedor: vendas.codVendedor,
    vlrVda: vendas.vlrVda,
    qtdUndVda: vendas.qtdUndVda,
    status: vendas.status,
    canal: vendas.canal,
    cidade: vendas.cidade,
  })
    .from(vendas)
    .orderBy(desc(vendas.emissaoData))
    .limit(limit);
}

export async function getVendasPaginadas(limit: number = 50, offset: number = 0, search?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  
  const conditions = search
    ? [like(vendas.razaoSocial, `%${search}%`)]
    : [];

  const [data, countResult] = await Promise.all([
    db.select({
      id: vendas.id,
      numVenda: vendas.numVenda,
      emissaoData: vendas.emissaoData,
      emissaoAnoMes: vendas.emissaoAnoMes,
      razaoSocial: vendas.razaoSocial,
      produto: vendas.produto,
      codVendedor: vendas.codVendedor,
      vlrVda: vendas.vlrVda,
      qtdUndVda: vendas.qtdUndVda,
      status: vendas.status,
      canal: vendas.canal,
      cidade: vendas.cidade,
      marca: vendas.marca,
      categoria: vendas.categoria,
    })
      .from(vendas)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vendas.emissaoData))
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`COUNT(*)` })
      .from(vendas)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  return { data, total: countResult[0]?.total || 0 };
}

// ============= CLIENTES PAGINADOS =============

export async function getClientesPaginados(limit: number = 50, offset: number = 0, search?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  
  const conditions: ReturnType<typeof like>[] = [];
  if (search) {
    conditions.push(like(clientes.razaoSocial, `%${search}%`));
  }

  const [data, countResult] = await Promise.all([
    db.select().from(clientes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(clientes.razaoSocial)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`COUNT(*)` })
      .from(clientes)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  return { data, total: countResult[0]?.total || 0 };
}

export async function getClienteHistoricoVendas(codCliente: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: vendas.id,
    numVenda: vendas.numVenda,
    emissaoData: vendas.emissaoData,
    emissaoAnoMes: vendas.emissaoAnoMes,
    produto: vendas.produto,
    vlrVda: vendas.vlrVda,
    qtdUndVda: vendas.qtdUndVda,
    status: vendas.status,
  })
    .from(vendas)
    .where(sql`${vendas.codCliente} = ${codCliente}`)
    .orderBy(desc(vendas.emissaoData))
    .limit(100);
}

export async function getClienteStats(codCliente: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    totalCompras: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidadeCompras: sql<number>`COUNT(${vendas.id})`,
    ticketMedio: sql<number>`COALESCE(AVG(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    ultimaCompra: sql<string>`MAX(${vendas.emissaoData})`,
  })
    .from(vendas)
    .where(sql`${vendas.codCliente} = ${codCliente}`);
  return result[0] || null;
}

// ============= CLIENTES ANALYTICS =============

export async function getClientesKPIs(dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return { totalAtivos: 0, totalComVendas: 0, novos: 0, inativos: 0, ticketMedioGeral: 0, totalFaturamento: 0 };
  await db.execute(sql`SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'`);
  const dateFilter = dataInicio && dataFim
    ? sql`AND v.emissao_data BETWEEN ${dataInicio} AND ${dataFim}`
    : sql``;
  // dateFilterSub: same filter but without table alias 'v.' for use in subqueries
  const dateFilterSub = dataInicio && dataFim
    ? sql`AND emissao_data BETWEEN ${dataInicio} AND ${dataFim}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM clientes WHERE ativo = 'ATIVO') AS totalAtivos,
      COUNT(DISTINCT v.cod_cliente) AS totalComVendas,
      COALESCE(SUM(CAST(v.vlr_vda AS DECIMAL(12,2))), 0) AS totalFaturamento,
      COALESCE(AVG(CAST(v.vlr_vda AS DECIMAL(12,2))), 0) AS ticketMedioGeral
    FROM vendas v
    WHERE v.ocorrencia = 'VENDA' ${dateFilter}
  `);
  const r = ((rows[0] as unknown) as any[])[0];

  // New clients: first purchase within the period
  const novosRows = await db.execute(sql`
    SELECT COUNT(DISTINCT v.cod_cliente) AS novos
    FROM vendas v
    WHERE v.ocorrencia = 'VENDA' ${dateFilter}
    AND v.cod_cliente NOT IN (
      SELECT DISTINCT cod_cliente FROM vendas
      WHERE ocorrencia = 'VENDA'
      ${dataInicio ? sql`AND emissao_data < ${dataInicio}` : sql`AND 1=0`}
    )
  `);
  const novos = Number(((novosRows[0] as unknown) as any[])[0]?.novos || 0);

  // Inactive: registered clients with no purchase in the period
  const inativosRows = await db.execute(sql`
    SELECT COUNT(DISTINCT c.cod_cliente) AS inativos
    FROM clientes c
    WHERE c.ativo = 'ATIVO'
    AND c.cod_cliente NOT IN (
      SELECT DISTINCT cod_cliente FROM vendas
      WHERE ocorrencia = 'VENDA' ${dateFilterSub}
    )
    AND c.cod_cliente IN (
      SELECT DISTINCT cod_cliente FROM vendas WHERE ocorrencia = 'VENDA'
    )
  `);
  const inativos = Number(((inativosRows[0] as unknown) as any[])[0]?.inativos || 0);

  return {
    totalAtivos: Number(r?.totalAtivos || 0),
    totalComVendas: Number(r?.totalComVendas || 0),
    novos,
    inativos,
    ticketMedioGeral: Number(r?.ticketMedioGeral || 0),
    totalFaturamento: Number(r?.totalFaturamento || 0),
  };
}

export async function getRankingClientes(
  limit: number = 50,
  offset: number = 0,
  search?: string,
  orderBy: 'valor' | 'pedidos' | 'ticket' = 'valor',
  dataInicio?: string,
  dataFim?: string
) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  await db.execute(sql`SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'`);

  const dateFilter = dataInicio && dataFim
    ? sql`AND v.emissao_data BETWEEN ${dataInicio} AND ${dataFim}`
    : sql``;

  const searchFilter = search
    ? sql`AND (c.fantasia LIKE ${'%' + search + '%'} OR c.razao_social LIKE ${'%' + search + '%'})`
    : sql``;

  const orderClause = orderBy === 'pedidos'
    ? sql`totalPedidos DESC`
    : orderBy === 'ticket'
    ? sql`ticketMedio DESC`
    : sql`totalComprado DESC`;

  const dataRows = await db.execute(sql`
    SELECT
      v.cod_cliente AS codCliente,
      COALESCE(ANY_VALUE(c.fantasia), ANY_VALUE(c.razao_social)) AS nome,
      ANY_VALUE(c.razao_social) AS razaoSocial,
      ANY_VALUE(c.cidade) AS cidade,
      ANY_VALUE(c.estado) AS estado,
      SUM(CAST(v.vlr_vda AS DECIMAL(12,2))) AS totalComprado,
      COUNT(DISTINCT v.num_venda) AS totalPedidos,
      AVG(CAST(v.vlr_vda AS DECIMAL(12,2))) AS ticketMedio,
      MAX(v.emissao_data) AS ultimaCompra
    FROM vendas v
    LEFT JOIN clientes c ON v.cod_cliente = c.cod_cliente
    WHERE v.ocorrencia = 'VENDA' ${dateFilter} ${searchFilter}
    GROUP BY v.cod_cliente
    ORDER BY ${orderClause}
    LIMIT ${limit} OFFSET ${sql.raw(String(offset))}
  `);

  const countRows = await db.execute(sql`
    SELECT COUNT(DISTINCT v.cod_cliente) AS total
    FROM vendas v
    LEFT JOIN clientes c ON v.cod_cliente = c.cod_cliente
    WHERE v.ocorrencia = 'VENDA' ${dateFilter} ${searchFilter}
  `);

  return {
    data: (dataRows[0] as unknown) as any[],
    total: Number(((countRows[0] as unknown) as any[])[0]?.total || 0),
  };
}

export async function getTopClientesPorPedidos(limit: number = 10, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return [];
  await db.execute(sql`SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'`);

  const dateFilter = dataInicio && dataFim
    ? sql`AND v.emissao_data BETWEEN ${dataInicio} AND ${dataFim}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      v.cod_cliente AS codCliente,
      COALESCE(ANY_VALUE(c.fantasia), ANY_VALUE(c.razao_social)) AS nome,
      ANY_VALUE(c.cidade) AS cidade,
      ANY_VALUE(c.estado) AS estado,
      COUNT(DISTINCT v.num_venda) AS totalPedidos,
      SUM(CAST(v.vlr_vda AS DECIMAL(12,2))) AS totalComprado,
      AVG(CAST(v.vlr_vda AS DECIMAL(12,2))) AS ticketMedio
    FROM vendas v
    LEFT JOIN clientes c ON v.cod_cliente = c.cod_cliente
    WHERE v.ocorrencia = 'VENDA' ${dateFilter}
    GROUP BY v.cod_cliente
    ORDER BY totalPedidos DESC
    LIMIT ${sql.raw(String(limit))}
  `);
  return (rows[0] as unknown) as any[];
}

export async function getTopClientesPorValor(limit: number = 10, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return [];
  await db.execute(sql`SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'`);

  const dateFilter = dataInicio && dataFim
    ? sql`AND v.emissao_data BETWEEN ${dataInicio} AND ${dataFim}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      v.cod_cliente AS codCliente,
      COALESCE(ANY_VALUE(c.fantasia), ANY_VALUE(c.razao_social)) AS nome,
      ANY_VALUE(c.cidade) AS cidade,
      ANY_VALUE(c.estado) AS estado,
      SUM(CAST(v.vlr_vda AS DECIMAL(12,2))) AS totalComprado,
      COUNT(DISTINCT v.num_venda) AS totalPedidos,
      AVG(CAST(v.vlr_vda AS DECIMAL(12,2))) AS ticketMedio
    FROM vendas v
    LEFT JOIN clientes c ON v.cod_cliente = c.cod_cliente
    WHERE v.ocorrencia = 'VENDA' ${dateFilter}
    GROUP BY v.cod_cliente
    ORDER BY totalComprado DESC
    LIMIT ${sql.raw(String(limit))}
  `);
  return (rows[0] as unknown) as any[];
}

export async function getClientesInativos(limit: number = 50, offset: number = 0, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  await db.execute(sql`SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'`);

  const dateFilter = dataInicio && dataFim
    ? sql`AND emissao_data BETWEEN ${dataInicio} AND ${dataFim}`
    : sql``;

  const dataRows = await db.execute(sql`
    SELECT
      c.cod_cliente AS codCliente,
      COALESCE(c.fantasia, c.razao_social) AS nome,
      c.cidade,
      c.estado,
      c.data_cadastro AS dataCadastro,
      MAX(v.emissao_data) AS ultimaCompra,
      COUNT(DISTINCT v.num_venda) AS totalPedidos,
      COALESCE(SUM(CAST(v.vlr_vda AS DECIMAL(12,2))), 0) AS totalComprado
    FROM clientes c
    LEFT JOIN vendas v ON c.cod_cliente = v.cod_cliente AND v.ocorrencia = 'VENDA'
    WHERE c.ativo = 'ATIVO'
    AND c.cod_cliente NOT IN (
      SELECT DISTINCT cod_cliente FROM vendas
      WHERE ocorrencia = 'VENDA' ${dateFilter}
    )
    AND c.cod_cliente IN (
      SELECT DISTINCT cod_cliente FROM vendas WHERE ocorrencia = 'VENDA'
    )
    GROUP BY c.cod_cliente, c.fantasia, c.razao_social, c.cidade, c.estado, c.data_cadastro
    ORDER BY ultimaCompra DESC
    LIMIT ${sql.raw(String(limit))} OFFSET ${sql.raw(String(offset))}
  `);
  const countRows = await db.execute(sql`
    SELECT COUNT(DISTINCT c.cod_cliente) AS total
    FROM clientes c
    WHERE c.ativo = 'ATIVO'
    AND c.cod_cliente NOT IN (
      SELECT DISTINCT cod_cliente FROM vendas
      WHERE ocorrencia = 'VENDA' ${dateFilter}
    )
    AND c.cod_cliente IN (
      SELECT DISTINCT cod_cliente FROM vendas WHERE ocorrencia = 'VENDA'
    )
  `);
  return {
    data: (dataRows[0] as unknown) as any[],
    total: Number(((countRows[0] as unknown) as any[])[0]?.total || 0),
  };
}
export async function getClientesNovos(limit: number = 50, offset: number = 0, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  await db.execute(sql`SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'`);

  const dateFilter = dataInicio && dataFim
    ? sql`AND v.emissao_data BETWEEN ${dataInicio} AND ${dataFim}`
    : sql``;

  const beforeFilter = dataInicio
    ? sql`AND emissao_data < ${dataInicio}`
    : sql`AND 1=0`;

  const dataRows = await db.execute(sql`
    SELECT
      v.cod_cliente AS codCliente,
      COALESCE(ANY_VALUE(c.fantasia), ANY_VALUE(c.razao_social)) AS nome,
      ANY_VALUE(c.cidade) AS cidade,
      ANY_VALUE(c.estado) AS estado,
      MIN(v.emissao_data) AS primeiraCompra,
      COUNT(DISTINCT v.num_venda) AS totalPedidos,
      SUM(CAST(v.vlr_vda AS DECIMAL(12,2))) AS totalComprado
    FROM vendas v
    LEFT JOIN clientes c ON v.cod_cliente = c.cod_cliente
    WHERE v.ocorrencia = 'VENDA' ${dateFilter}
    AND v.cod_cliente NOT IN (
      SELECT DISTINCT cod_cliente FROM vendas
      WHERE ocorrencia = 'VENDA' ${beforeFilter}
    )
    GROUP BY v.cod_cliente
    ORDER BY totalComprado DESC
     LIMIT ${sql.raw(String(limit))} OFFSET ${sql.raw(String(offset))}
  `);
  const countRows = await db.execute(sql`
    SELECT COUNT(DISTINCT v.cod_cliente) AS total
    FROM vendas v
    WHERE v.ocorrencia = 'VENDA' ${dateFilter}
    AND v.cod_cliente NOT IN (
      SELECT DISTINCT cod_cliente FROM vendas
      WHERE ocorrencia = 'VENDA' ${beforeFilter}
    )
  `);
  return {
    data: (dataRows[0] as unknown) as any[],
    total: Number(((countRows[0] as unknown) as any[])[0]?.total || 0),
  };
}
export async function getEvolucaoMensalTopClientes(topN: number = 5) {
  const db = await getDb();
  if (!db) return [];
  await db.execute(sql`SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'`);

  // Get top N clients by total value
  const topRows = await db.execute(sql`
    SELECT v.cod_cliente AS codCliente,
      COALESCE(ANY_VALUE(c.fantasia), ANY_VALUE(c.razao_social)) AS nome
    FROM vendas v
    LEFT JOIN clientes c ON v.cod_cliente = c.cod_cliente
    WHERE v.ocorrencia = 'VENDA'
    GROUP BY v.cod_cliente
    ORDER BY SUM(CAST(v.vlr_vda AS DECIMAL(12,2))) DESC
    LIMIT ${sql.raw(String(topN))}
  `);
  const topClientes = (topRows[0] as unknown) as any[];
  if (!topClientes.length) return [];

  const codigos = topClientes.map((c: any) => c.codCliente);

  // Monthly evolution for those clients
  const evolRows = await db.execute(sql`
    SELECT
      v.cod_cliente AS codCliente,
      DATE_FORMAT(v.emissao_data, '%Y-%m') AS mes,
      SUM(CAST(v.vlr_vda AS DECIMAL(12,2))) AS totalComprado
    FROM vendas v
    WHERE v.ocorrencia = 'VENDA'
    AND v.cod_cliente IN (${sql.raw(codigos.join(','))})
    GROUP BY v.cod_cliente, mes
    ORDER BY mes ASC
  `);
  const evolucao = (evolRows[0] as unknown) as any[];

  return topClientes.map((c: any) => ({
    codCliente: c.codCliente,
    nome: c.nome,
    meses: evolucao
      .filter((e: any) => e.codCliente === c.codCliente)
      .map((e: any) => ({ mes: e.mes, total: Number(e.totalComprado) })),
  }));
}

// ============= PRODUTOS PAGINADOS =============

export async function getProdutosPaginados(limit: number = 50, offset: number = 0, search?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  
  const conditions: ReturnType<typeof like>[] = [];
  if (search) {
    conditions.push(like(produtos.nome, `%${search}%`));
  }

  const [data, countResult] = await Promise.all([
    db.select().from(produtos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(produtos.nome)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`COUNT(*)` })
      .from(produtos)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  return { data, total: countResult[0]?.total || 0 };
}

export async function getProdutoPerformance(codProduto: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    totalVendido: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    qtdVendida: sql<number>`COALESCE(SUM(CAST(${vendas.qtdUndVda} AS DECIMAL(12,2))), 0)`,
    qtdVendas: sql<number>`COUNT(${vendas.id})`,
    precoMedio: sql<number>`COALESCE(AVG(CAST(${vendas.vlrUndVda} AS DECIMAL(12,2))), 0)`,
  })
    .from(vendas)
    .where(sql`${vendas.codProduto} = ${codProduto}`);
  return result[0] || null;
}

// ============= EQUIPE PAGINADA =============

export async function getEquipePaginada(limit: number = 50, offset: number = 0, search?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  
  const conditions = search
    ? [like(equipe.nome, `%${search}%`)]
    : [];

  const [data, countResult] = await Promise.all([
    db.select().from(equipe)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(equipe.nome)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`COUNT(*)` })
      .from(equipe)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  return { data, total: countResult[0]?.total || 0 };
}

export async function getVendedorStats(codVendedor: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    totalFaturamento: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidadeVendas: sql<number>`COUNT(${vendas.id})`,
    ticketMedio: sql<number>`COALESCE(AVG(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    clientesAtendidos: sql<number>`COUNT(DISTINCT ${vendas.codCliente})`,
  })
    .from(vendas)
    .where(eq(vendas.codVendedor, codVendedor));
  return result[0] || null;
}

export async function getVendedorVendasPorMes(codVendedor: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    mes: vendas.emissaoAnoMes,
    total: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(12,2))), 0)`,
    quantidade: sql<number>`COUNT(${vendas.id})`,
  })
    .from(vendas)
    .where(and(
      eq(vendas.codVendedor, codVendedor),
      sql`${vendas.emissaoAnoMes} IS NOT NULL`
    ))
    .groupBy(vendas.emissaoAnoMes)
    .orderBy(vendas.emissaoAnoMes)
    .limit(12);
}

// ============= ESTOQUE DOS PRODUTOS =============

export async function getProdutosComEstoque(limit: number = 50, offset: number = 0, search?: string) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  
  const conditions = search
    ? [like(produtos.nome, `%${search}%`)]
    : [];

  const [data, countResult] = await Promise.all([
    db.select().from(produtos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(produtos.nome)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`COUNT(*)` })
      .from(produtos)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  return { data, total: countResult[0]?.total || 0 };
}

export async function getProdutosPorStatusEstoque() {
  const db = await getDb();
  if (!db) return { ativo: 0, inativo: 0, bloqueado: 0 };
  
  const result = await db.select({
    ativo: produtos.ativo,
    count: sql<number>`COUNT(*)`,
  })
    .from(produtos)
    .groupBy(produtos.ativo);

  const stats = { ativo: 0, inativo: 0, bloqueado: 0 };
  for (const row of result) {
    const status = (row.ativo || '').toUpperCase();
    if (status === 'ATIVO') stats.ativo += Number(row.count);
    else if (status === 'BLOQUEADO') stats.bloqueado += Number(row.count);
    else stats.inativo += Number(row.count);
  }
  return stats;
}

// ============= DRE GERENCIAL MENSAL =============

export async function createDreGerencial(data: Omit<InsertDreGerencialMensal, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(dreGerencialMensal).values(data);
  const [row] = await db.select().from(dreGerencialMensal).where(eq(dreGerencialMensal.competencia, data.competencia));
  return row;
}

export async function getDreByCompetencia(competencia: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(dreGerencialMensal).where(eq(dreGerencialMensal.competencia, competencia));
  return row ?? null;
}

export async function listDreGerencial() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dreGerencialMensal).orderBy(desc(dreGerencialMensal.competencia));
}

export async function updateDreGerencial(id: number, data: Partial<Omit<InsertDreGerencialMensal, "id" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dreGerencialMensal).set(data).where(eq(dreGerencialMensal.id, id));
  const [row] = await db.select().from(dreGerencialMensal).where(eq(dreGerencialMensal.id, id));
  return row;
}

export async function deleteDreGerencial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dreGerencialMensal).where(eq(dreGerencialMensal.id, id));
  return { success: true };
}

export async function getFaturamentoByCompetencia(competencia: string) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({
    total: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(14,2))), 0)`,
  })
    .from(vendas)
    .where(eq(vendas.emissaoAnoMes, competencia));
  return Number(result?.total ?? 0);
}

export async function getFaturamentoMensalMap(): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select({
    mes: vendas.emissaoAnoMes,
    total: sql<number>`COALESCE(SUM(CAST(${vendas.vlrVda} AS DECIMAL(14,2))), 0)`,
  })
    .from(vendas)
    .where(sql`${vendas.emissaoAnoMes} IS NOT NULL`)
    .groupBy(vendas.emissaoAnoMes)
    .orderBy(vendas.emissaoAnoMes);

  const map: Record<string, number> = {};
  for (const r of rows) {
    if (r.mes) map[r.mes] = Number(r.total);
  }
  return map;
}

// ============= DRE ACCOUNT MAPPINGS =============

export async function listDreMappings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dreAccountMappings).orderBy(dreAccountMappings.sourceName);
}

export async function upsertDreMapping(data: Omit<InsertDreAccountMapping, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(dreAccountMappings).where(
    and(
      eq(dreAccountMappings.sourceType, data.sourceType),
      eq(dreAccountMappings.sourceExternalId, data.sourceExternalId),
    )
  );

  if (existing) {
    await db.update(dreAccountMappings).set({
      sourceName: data.sourceName,
      dreGroup: data.dreGroup,
      notes: data.notes,
    }).where(eq(dreAccountMappings.id, existing.id));
    const [updated] = await db.select().from(dreAccountMappings).where(eq(dreAccountMappings.id, existing.id));
    return updated;
  }

  await db.insert(dreAccountMappings).values(data);
  const [row] = await db.select().from(dreAccountMappings).where(
    and(
      eq(dreAccountMappings.sourceType, data.sourceType),
      eq(dreAccountMappings.sourceExternalId, data.sourceExternalId),
    )
  );
  return row;
}

export async function deleteDreMapping(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dreAccountMappings).where(eq(dreAccountMappings.id, id));
  return { success: true };
}

export async function listContaAzulCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contaAzulCategories).orderBy(contaAzulCategories.name);
}

export async function listContaAzulCostCenters() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contaAzulCostCenters).orderBy(contaAzulCostCenters.name);
}
