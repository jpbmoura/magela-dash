import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { importExcelFile } from "./utils/excelImport";
import {
  getAllClientes,
  getAllProdutos,
  getAllEquipe,
  getTopClientesByValue,
  getTopProdutosByVendas,
  getVendedorRanking,
  getTotalVendas,
  getQuantidadeVendas,
  getTicketMedio,
  getTotalEstoque,
  getProdutosSemEstoque,
  getProdutosEmAtencao,
  getAlertas,
  getAlertasNaoLidos,
  markAlertaAsRead,
  getLastImportLog,
  getClientesCount,
  getProdutosCount,
  getEquipeCount,
  getVendasByPeriod,
  getVendasPorMes,
  getVendasPorCategoria,
  getVendasPorCanal,
  getVendasRecentes,
  getVendasPaginadas,
  getClientesPaginados,
  getClienteHistoricoVendas,
  getClienteStats,
  getProdutosPaginados,
  getProdutoPerformance,
  getEquipePaginada,
  getVendedorStats,
  getVendedorVendasPorMes,
  getProdutosComEstoque,
  getProdutosPorStatusEstoque,
  getEstoqueResumo,
  getEstoquePaginado,
  getEstoqueProdutosAgrupadosPorMarca,
  getEstoqueFilterOptions,
  getEstoquePorCategoria,
  getEstoquePorMarca,
  getProjecaoPedidos,
  getClientesKPIs,
  getRankingClientes,
  getTopClientesPorPedidos,
  getTopClientesPorValor,
  getClientesInativos,
  getClientesNovos,
  getEvolucaoMensalTopClientes,
  getAvailablePeriods,
  createDreGerencial,
  getDreByCompetencia,
  listDreGerencial,
  updateDreGerencial,
  deleteDreGerencial,
  getFaturamentoByCompetencia,
  getFaturamentoMensalMap,
  listDreMappings,
  upsertDreMapping,
  deleteDreMapping,
  listContaAzulCategories,
  listContaAzulCostCenters,
  listCompanies,
} from "./db";
import { calcularDre } from "../shared/dreCalculations";
import { notifyOwner } from "./_core/notification";
import { getAuthorizationUrl, getConnectionStatus, disconnect as disconnectContaAzul } from "./integrations/contaAzulAuth";
import { syncAllMasterData, syncExpensesByCompetencia, autoMapCategories } from "./integrations/contaAzulSync";
import { consolidarDreImportado, getUnmappedItems } from "./integrations/dreConsolidation";

const companyInput = z.object({
  empresa: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  companies: router({
    list: publicProcedure.query(async () => listCompanies()),
  }),

  // ============= IMPORT PROCEDURES =============
  import: router({
    uploadExcel: publicProcedure
      .input(z.object({
        fileBuffer: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          if (!input.fileName.toLowerCase().endsWith('.xlsm')) {
            return {
              success: false,
              message: 'Apenas arquivos .xlsm são aceitos',
              linhasImportadas: 0,
              linhasErro: 0,
              detalhes: {},
            };
          }
          const buffer = Buffer.from(input.fileBuffer, 'base64');
          const result = await importExcelFile(buffer);
          return result;
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            linhasImportadas: 0,
            linhasErro: 0,
            detalhes: {},
          };
        }
      }),

    getLastImport: publicProcedure.query(async () => {
      return await getLastImportLog();
    }),
  }),

  // ============= DASHBOARD PROCEDURES =============
  dashboard: router({
    getMetrics: publicProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const startDate = input?.startDate;
        const endDate = input?.endDate;
        const empresa = input?.empresa;
        const [
          totalVendas,
          quantidadeVendas,
          ticketMedio,
          clientesCount,
          produtosCount,
          equipCount,
          totalEstoque,
          estoqueAlerts,
        ] = await Promise.all([
          getTotalVendas(startDate, endDate, empresa),
          getQuantidadeVendas(startDate, endDate, empresa),
          getTicketMedio(startDate, endDate, empresa),
          getClientesCount(empresa),
          getProdutosCount(empresa),
          getEquipeCount(empresa),
          getTotalEstoque(empresa),
          getProdutosSemEstoque({ empresa }),
        ]);
        return {
          totalVendas,
          quantidadeVendas,
          ticketMedio,
          clientesCount,
          produtosCount,
          equipCount,
          totalEstoque,
          estoqueAlerts: estoqueAlerts.total,
        };
      }),

    getTopClientes: publicProcedure
      .input(z.object({ limit: z.number().optional(), empresa: z.string().optional() }).optional())
      .query(async ({ input }) => getTopClientesByValue(input?.limit || 5, input?.empresa)),

    getTopProdutos: publicProcedure
      .input(z.object({ limit: z.number().optional(), empresa: z.string().optional() }).optional())
      .query(async ({ input }) => getTopProdutosByVendas(input?.limit || 5, input?.empresa)),

    getVendedores: publicProcedure
      .input(z.object({ limit: z.number().optional(), empresa: z.string().optional() }).optional())
      .query(async ({ input }) => getVendedorRanking(input?.limit || 5, input?.empresa)),

    getVendasPorMes: publicProcedure
      .input(z.object({ meses: z.number().optional(), empresa: z.string().optional() }).optional())
      .query(async ({ input }) => getVendasPorMes(input?.meses || 12, input?.empresa)),

    getAlertas: publicProcedure.query(async () => getAlertas(10)),
    getAlertasNaoLidos: publicProcedure.query(async () => getAlertasNaoLidos()),
    getAvailablePeriods: publicProcedure
      .input(companyInput.optional())
      .query(async ({ input }) => getAvailablePeriods(input?.empresa)),
  }),

  // ============= CLIENTES PROCEDURES =============
  clientes: router({
    getAll: publicProcedure.query(async () => getAllClientes()),
    getPaginados: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getClientesPaginados(input?.limit || 50, input?.offset || 0, input?.search, input?.empresa)
      ),
    getTopByValue: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getTopClientesByValue(input?.limit || 10)),
    getHistoricoVendas: publicProcedure
      .input(z.object({ codCliente: z.string() }))
      .query(async ({ input }) => getClienteHistoricoVendas(input.codCliente)),
    getStats: publicProcedure
      .input(z.object({ codCliente: z.string(), empresa: z.string().optional() }))
      .query(async ({ input }) => getClienteStats(input.codCliente, input.empresa)),
    // New analytics endpoints
    getKPIs: publicProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getClientesKPIs(input?.dataInicio, input?.dataFim, input?.empresa)),
    getRanking: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        orderBy: z.enum(['valor', 'pedidos', 'ticket']).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getRankingClientes(
          input?.limit || 50,
          input?.offset || 0,
          input?.search,
          input?.orderBy || 'valor',
          input?.dataInicio,
          input?.dataFim,
          input?.empresa
        )
      ),
    getTopPorPedidos: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getTopClientesPorPedidos(input?.limit || 10, input?.dataInicio, input?.dataFim, input?.empresa)),
    getTopPorValor: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getTopClientesPorValor(input?.limit || 10, input?.dataInicio, input?.dataFim, input?.empresa)),
    getInativos: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getClientesInativos(input?.limit || 50, input?.offset || 0, input?.dataInicio, input?.dataFim, input?.empresa)),
    getNovos: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getClientesNovos(input?.limit || 50, input?.offset || 0, input?.dataInicio, input?.dataFim, input?.empresa)),
    getEvolucaoMensal: publicProcedure
      .input(z.object({ topN: z.number().optional(), empresa: z.string().optional() }).optional())
      .query(async ({ input }) => getEvolucaoMensalTopClientes(input?.topN || 5, input?.empresa)),
  }),

  // ============= PRODUTOS PROCEDURES =============
  produtos: router({
    getAll: publicProcedure.query(async () => getAllProdutos()),

    getPaginados: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getProdutosPaginados(input?.limit || 50, input?.offset || 0, input?.search, input?.empresa)
      ),

    getTopByVendas: publicProcedure
      .input(z.object({ limit: z.number().optional(), empresa: z.string().optional() }).optional())
      .query(async ({ input }) => getTopProdutosByVendas(input?.limit || 10, input?.empresa)),

    getPerformance: publicProcedure
      .input(z.object({ codProduto: z.string(), empresa: z.string().optional() }))
      .query(async ({ input }) => getProdutoPerformance(input.codProduto, input.empresa)),

    getComEstoque: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getProdutosComEstoque(input?.limit || 50, input?.offset || 0, input?.search)
      ),

    getStatusEstoque: publicProcedure
      .input(companyInput.optional())
      .query(async ({ input }) => getProdutosPorStatusEstoque(input?.empresa)),
  }),

  // ============= EQUIPE PROCEDURES =============
  equipe: router({
    getAll: publicProcedure.query(async () => getAllEquipe()),

    getPaginada: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getEquipePaginada(input?.limit || 50, input?.offset || 0, input?.search, input?.empresa)
      ),

    getRanking: publicProcedure
      .input(z.object({ limit: z.number().optional(), empresa: z.string().optional() }).optional())
      .query(async ({ input }) => getVendedorRanking(input?.limit || 10, input?.empresa)),

    getVendedorStats: publicProcedure
      .input(z.object({ codVendedor: z.number(), empresa: z.string().optional() }))
      .query(async ({ input }) => getVendedorStats(input.codVendedor, input.empresa)),

    getVendedorVendasPorMes: publicProcedure
      .input(z.object({ codVendedor: z.number(), empresa: z.string().optional() }))
      .query(async ({ input }) => getVendedorVendasPorMes(input.codVendedor, input.empresa)),
  }),

  // ============= ESTOQUE PROCEDURES =============
  estoque: router({
    getFilterOptions: publicProcedure
      .input(companyInput.optional())
      .query(async ({ input }) => getEstoqueFilterOptions(input?.empresa)),
    getSemEstoque: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        codigo: z.string().optional(),
        marca: z.string().optional(),
        categoria: z.string().optional(),
        empresa: z.string().optional(),
        orderBy: z.enum(['estoque']).optional(),
        orderDir: z.enum(['asc', 'desc']).optional(),
      }).optional())
      .query(async ({ input }) => getProdutosSemEstoque(input ?? {})),
    getEmAtencao: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        codigo: z.string().optional(),
        marca: z.string().optional(),
        categoria: z.string().optional(),
        empresa: z.string().optional(),
        orderBy: z.enum(['gap', 'vendas3m', 'estoqueAtual', 'totalVendido3Meses', 'mediaVendasMensal', 'diasEstoque']).optional(),
        orderDir: z.enum(['asc', 'desc']).optional(),
      }).optional())
      .query(async ({ input }) => getProdutosEmAtencao(input ?? {})),
    getProjecaoPedidos: publicProcedure
      .input(z.object({
        diasPedido: z.number().min(1),
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        codigo: z.string().optional(),
        marca: z.string().optional(),
        categoria: z.string().optional(),
        empresa: z.string().optional(),
        orderBy: z.enum(['vendas3m', 'estoqueAtual', 'totalVendido3Meses', 'mediaVendasMensal', 'diasEstoque']).optional(),
        orderDir: z.enum(['asc', 'desc']).optional(),
        excludeZeroStock: z.boolean().optional(),
        excludeNoSales: z.boolean().optional(),
      }))
      .query(async ({ input }) => getProjecaoPedidos(input)),
    getTotal: publicProcedure.input(companyInput.optional()).query(async ({ input }) => getTotalEstoque(input?.empresa)),
    getResumo: publicProcedure.input(companyInput.optional()).query(async ({ input }) => getEstoqueResumo(input?.empresa)),
    getPorCategoria: publicProcedure.input(companyInput.optional()).query(async ({ input }) => getEstoquePorCategoria(input?.empresa)),
    getPorMarca: publicProcedure.input(companyInput.optional()).query(async ({ input }) => getEstoquePorMarca(input?.empresa)),
    getPaginado: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        codigo: z.string().optional(),
        marca: z.string().optional(),
        categoria: z.string().optional(),
        empresa: z.string().optional(),
        status: z.enum(['semEstoque', 'emAtencao']).optional(),
        orderBy: z.enum(['estoque']).optional(),
        orderDir: z.enum(['asc', 'desc']).optional(),
      }).optional())
      .query(async ({ input }) => getEstoquePaginado(input ?? {})),
    getProdutosAgrupadosPorMarca: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        codigo: z.string().optional(),
        marca: z.string().optional(),
        categoria: z.string().optional(),
        empresa: z.string().optional(),
        status: z.enum(['semEstoque', 'emAtencao']).optional(),
        orderBy: z.enum(['estoque']).optional(),
        orderDir: z.enum(['asc', 'desc']).optional(),
      }).optional())
      .query(async ({ input }) => getEstoqueProdutosAgrupadosPorMarca(input ?? {})),
  }),

  // ============= VENDAS PROCEDURES =============
  vendas: router({
    getByPeriod: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        empresa: z.string().optional(),
      }))
      .query(async ({ input }) => getVendasByPeriod(input.startDate, input.endDate, input.empresa)),

    getPaginadas: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getVendasPaginadas(input?.limit || 50, input?.offset || 0, input?.search, input?.empresa)
      ),

    getRecentes: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getVendasRecentes(input?.limit || 50)),

    getPorMes: publicProcedure
      .input(z.object({ meses: z.number().optional(), empresa: z.string().optional() }).optional())
      .query(async ({ input }) => getVendasPorMes(input?.meses || 12, input?.empresa)),

    getPorCategoria: publicProcedure.input(companyInput.optional()).query(async ({ input }) => getVendasPorCategoria(input?.empresa)),
    getPorCanal: publicProcedure.input(companyInput.optional()).query(async ({ input }) => getVendasPorCanal(input?.empresa)),

    getMetrics: publicProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const startDate = input?.startDate;
        const endDate = input?.endDate;
        const empresa = input?.empresa;
        const [total, quantidade, ticketMedio] = await Promise.all([
          getTotalVendas(startDate, endDate, empresa),
          getQuantidadeVendas(startDate, endDate, empresa),
          getTicketMedio(startDate, endDate, empresa),
        ]);
        return { total, quantidade, ticketMedio };
      }),
  }),

  // ============= ALERTAS PROCEDURES =============
  alertas: router({
    getAll: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getAlertas(input?.limit || 50)),

    getNaoLidos: publicProcedure.query(async () => getAlertasNaoLidos()),

    marcarLido: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markAlertaAsRead(input.id);
        return { success: true };
      }),

    notificarEstoqueCritico: publicProcedure
      .input(z.object({
        produto: z.string(),
        quantidade: z.number(),
      }))
      .mutation(async ({ input }) => {
        await notifyOwner({
          title: `⚠️ Estoque Crítico: ${input.produto}`,
          content: `O produto **${input.produto}** atingiu nível crítico de estoque com apenas **${input.quantidade} unidades** disponíveis. Ação imediata necessária.`,
        });
        return { success: true };
      }),
  }),

  // ============= DRE GERENCIAL PROCEDURES =============
  dre: router({
    create: publicProcedure
      .input(z.object({
        competencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato deve ser YYYY-MM"),
        receitaBrutaManual: z.string().nullable().optional(),
        deducoesReceita: z.string().optional().default("0"),
        custosVariaveis: z.string().optional().default("0"),
        despesasPessoal: z.string().optional().default("0"),
        despesasAdministrativas: z.string().optional().default("0"),
        despesasComerciais: z.string().optional().default("0"),
        despesasGerais: z.string().optional().default("0"),
        depreciacaoAmortizacao: z.string().optional().default("0"),
        resultadoFinanceiro: z.string().optional().default("0"),
        irCsll: z.string().optional().default("0"),
        observacoes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getDreByCompetencia(input.competencia);
        if (existing) {
          throw new Error(`Já existe registro para a competência ${input.competencia}`);
        }
        return await createDreGerencial(input);
      }),

    getByCompetencia: publicProcedure
      .input(z.object({ competencia: z.string(), empresa: z.string().optional() }))
      .query(async ({ input }) => {
        const [dre, faturamento] = await Promise.all([
          getDreByCompetencia(input.competencia),
          getFaturamentoByCompetencia(input.competencia, input.empresa),
        ]);
        return { dre, faturamento };
      }),

    list: publicProcedure.input(companyInput.optional()).query(async ({ input }) => {
      const [registros, faturamentoMap] = await Promise.all([
        listDreGerencial(),
        getFaturamentoMensalMap(input?.empresa),
      ]);
      return registros.map(r => ({
        ...r,
        faturamento: faturamentoMap[r.competencia] ?? 0,
      }));
    }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        competencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato deve ser YYYY-MM").optional(),
        receitaBrutaManual: z.string().nullable().optional(),
        deducoesReceita: z.string().optional(),
        custosVariaveis: z.string().optional(),
        despesasPessoal: z.string().optional(),
        despesasAdministrativas: z.string().optional(),
        despesasComerciais: z.string().optional(),
        despesasGerais: z.string().optional(),
        depreciacaoAmortizacao: z.string().optional(),
        resultadoFinanceiro: z.string().optional(),
        irCsll: z.string().optional(),
        observacoes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateDreGerencial(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteDreGerencial(input.id);
      }),

    getResumo: publicProcedure.input(companyInput.optional()).query(async ({ input }) => {
      const [registros, faturamentoMap] = await Promise.all([
        listDreGerencial(),
        getFaturamentoMensalMap(input?.empresa),
      ]);
      return registros.map(r => {
        const receitaBruta = r.receitaBrutaManual
          ? Number(r.receitaBrutaManual)
          : (faturamentoMap[r.competencia] ?? 0);
        const dre = calcularDre({
          receitaBruta,
          deducoesReceita: Number(r.deducoesReceita),
          custosVariaveis: Number(r.custosVariaveis),
          despesasPessoal: Number(r.despesasPessoal),
          despesasAdministrativas: Number(r.despesasAdministrativas),
          despesasComerciais: Number(r.despesasComerciais),
          despesasGerais: Number(r.despesasGerais),
          depreciacaoAmortizacao: Number(r.depreciacaoAmortizacao),
          resultadoFinanceiro: Number(r.resultadoFinanceiro),
          irCsll: Number(r.irCsll),
        });
        return { competencia: r.competencia, id: r.id, ...dre };
      });
    }),
  }),

  // ============= CONTA AZUL INTEGRATION =============
  contaAzul: router({
    getConnectUrl: publicProcedure.query(() => {
      return { url: getAuthorizationUrl() };
    }),

    getStatus: publicProcedure.query(async () => {
      return await getConnectionStatus();
    }),

    disconnect: publicProcedure.mutation(async () => {
      await disconnectContaAzul();
      return { success: true };
    }),

    syncMasterData: publicProcedure.mutation(async () => {
      return await syncAllMasterData();
    }),

    syncExpenses: publicProcedure
      .input(z.object({
        competencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato deve ser YYYY-MM"),
      }))
      .mutation(async ({ input }) => {
        const result = await syncExpensesByCompetencia(input.competencia);
        return result;
      }),

    getImportPreview: publicProcedure
      .input(z.object({
        competencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato deve ser YYYY-MM"),
      }))
      .query(async ({ input }) => {
        return await consolidarDreImportado(input.competencia);
      }),

    getUnmappedItems: publicProcedure.query(async () => {
      return await getUnmappedItems();
    }),

    getCategories: publicProcedure.query(async () => {
      return await listContaAzulCategories();
    }),

    getCostCenters: publicProcedure.query(async () => {
      return await listContaAzulCostCenters();
    }),
  }),

  // ============= DRE ACCOUNT MAPPINGS =============
  dreMappings: router({
    list: publicProcedure.query(async () => {
      return await listDreMappings();
    }),

    upsert: publicProcedure
      .input(z.object({
        sourceType: z.enum(["conta_azul_category", "cost_center"]),
        sourceExternalId: z.string(),
        sourceName: z.string(),
        dreGroup: z.enum([
          "deducoes_receita",
          "custos_variaveis",
          "despesas_pessoal",
          "despesas_administrativas",
          "despesas_comerciais",
          "despesas_gerais",
          "depreciacao_amortizacao",
          "resultado_financeiro",
          "ir_csll",
          "ignorar",
        ]),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return await upsertDreMapping(input);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteDreMapping(input.id);
      }),

    autoMap: publicProcedure.mutation(async () => {
      return await autoMapCategories();
    }),
  }),
});

export type AppRouter = typeof appRouter;
