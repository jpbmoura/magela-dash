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
  getEstoqueFilterOptions,
  getEstoquePorCategoria,
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
} from "./db";
import { calcularDre } from "../shared/dreCalculations";
import { notifyOwner } from "./_core/notification";
import { getAuthorizationUrl, getConnectionStatus, disconnect as disconnectContaAzul } from "./integrations/contaAzulAuth";
import { syncAllMasterData, syncExpensesByCompetencia, autoMapCategories } from "./integrations/contaAzulSync";
import { consolidarDreImportado, getUnmappedItems } from "./integrations/dreConsolidation";

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
      }).optional())
      .query(async ({ input }) => {
        const startDate = input?.startDate;
        const endDate = input?.endDate;
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
          getTotalVendas(startDate, endDate),
          getQuantidadeVendas(startDate, endDate),
          getTicketMedio(startDate, endDate),
          getClientesCount(),
          getProdutosCount(),
          getEquipeCount(),
          getTotalEstoque(),
          getProdutosSemEstoque(),
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
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getTopClientesByValue(input?.limit || 5)),

    getTopProdutos: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getTopProdutosByVendas(input?.limit || 5)),

    getVendedores: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getVendedorRanking(input?.limit || 5)),

    getVendasPorMes: publicProcedure
      .input(z.object({ meses: z.number().optional() }).optional())
      .query(async ({ input }) => getVendasPorMes(input?.meses || 12)),

    getAlertas: publicProcedure.query(async () => getAlertas(10)),
    getAlertasNaoLidos: publicProcedure.query(async () => getAlertasNaoLidos()),
    getAvailablePeriods: publicProcedure.query(async () => getAvailablePeriods()),
  }),

  // ============= CLIENTES PROCEDURES =============
  clientes: router({
    getAll: publicProcedure.query(async () => getAllClientes()),
    getPaginados: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getClientesPaginados(input?.limit || 50, input?.offset || 0, input?.search)
      ),
    getTopByValue: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getTopClientesByValue(input?.limit || 10)),
    getHistoricoVendas: publicProcedure
      .input(z.object({ codCliente: z.string() }))
      .query(async ({ input }) => getClienteHistoricoVendas(input.codCliente)),
    getStats: publicProcedure
      .input(z.object({ codCliente: z.string() }))
      .query(async ({ input }) => getClienteStats(input.codCliente)),
    // New analytics endpoints
    getKPIs: publicProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getClientesKPIs(input?.dataInicio, input?.dataFim)),
    getRanking: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        orderBy: z.enum(['valor', 'pedidos', 'ticket']).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getRankingClientes(
          input?.limit || 50,
          input?.offset || 0,
          input?.search,
          input?.orderBy || 'valor',
          input?.dataInicio,
          input?.dataFim
        )
      ),
    getTopPorPedidos: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getTopClientesPorPedidos(input?.limit || 10, input?.dataInicio, input?.dataFim)),
    getTopPorValor: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getTopClientesPorValor(input?.limit || 10, input?.dataInicio, input?.dataFim)),
    getInativos: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getClientesInativos(input?.limit || 50, input?.offset || 0, input?.dataInicio, input?.dataFim)),
    getNovos: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getClientesNovos(input?.limit || 50, input?.offset || 0, input?.dataInicio, input?.dataFim)),
    getEvolucaoMensal: publicProcedure
      .input(z.object({ topN: z.number().optional() }).optional())
      .query(async ({ input }) => getEvolucaoMensalTopClientes(input?.topN || 5)),
  }),

  // ============= PRODUTOS PROCEDURES =============
  produtos: router({
    getAll: publicProcedure.query(async () => getAllProdutos()),

    getPaginados: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getProdutosPaginados(input?.limit || 50, input?.offset || 0, input?.search)
      ),

    getTopByVendas: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getTopProdutosByVendas(input?.limit || 10)),

    getPerformance: publicProcedure
      .input(z.object({ codProduto: z.string() }))
      .query(async ({ input }) => getProdutoPerformance(input.codProduto)),

    getComEstoque: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getProdutosComEstoque(input?.limit || 50, input?.offset || 0, input?.search)
      ),

    getStatusEstoque: publicProcedure.query(async () => getProdutosPorStatusEstoque()),
  }),

  // ============= EQUIPE PROCEDURES =============
  equipe: router({
    getAll: publicProcedure.query(async () => getAllEquipe()),

    getPaginada: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getEquipePaginada(input?.limit || 50, input?.offset || 0, input?.search)
      ),

    getRanking: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getVendedorRanking(input?.limit || 10)),

    getVendedorStats: publicProcedure
      .input(z.object({ codVendedor: z.number() }))
      .query(async ({ input }) => getVendedorStats(input.codVendedor)),

    getVendedorVendasPorMes: publicProcedure
      .input(z.object({ codVendedor: z.number() }))
      .query(async ({ input }) => getVendedorVendasPorMes(input.codVendedor)),
  }),

  // ============= ESTOQUE PROCEDURES =============
  estoque: router({
    getFilterOptions: publicProcedure.query(async () => getEstoqueFilterOptions()),
    getSemEstoque: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        codigo: z.string().optional(),
        marca: z.string().optional(),
        categoria: z.string().optional(),
        orderBy: z.enum(['estoque']).optional(),
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
        orderBy: z.enum(['gap', 'vendas3m', 'estoqueAtual', 'totalVendido3Meses', 'mediaVendasMensal']).optional(),
      }).optional())
      .query(async ({ input }) => getProdutosEmAtencao(input ?? {})),
    getTotal: publicProcedure.query(async () => getTotalEstoque()),
    getResumo: publicProcedure.query(async () => getEstoqueResumo()),
    getPorCategoria: publicProcedure.query(async () => getEstoquePorCategoria()),
    getPaginado: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        codigo: z.string().optional(),
        marca: z.string().optional(),
        categoria: z.string().optional(),
        status: z.enum(['semEstoque', 'emAtencao']).optional(),
        orderBy: z.enum(['estoque']).optional(),
      }).optional())
      .query(async ({ input }) => getEstoquePaginado(input ?? {})),
  }),

  // ============= VENDAS PROCEDURES =============
  vendas: router({
    getByPeriod: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => getVendasByPeriod(input.startDate, input.endDate)),

    getPaginadas: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) =>
        getVendasPaginadas(input?.limit || 50, input?.offset || 0, input?.search)
      ),

    getRecentes: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => getVendasRecentes(input?.limit || 50)),

    getPorMes: publicProcedure
      .input(z.object({ meses: z.number().optional() }).optional())
      .query(async ({ input }) => getVendasPorMes(input?.meses || 12)),

    getPorCategoria: publicProcedure.query(async () => getVendasPorCategoria()),
    getPorCanal: publicProcedure.query(async () => getVendasPorCanal()),

    getMetrics: publicProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        const startDate = input?.startDate;
        const endDate = input?.endDate;
        const [total, quantidade, ticketMedio] = await Promise.all([
          getTotalVendas(startDate, endDate),
          getQuantidadeVendas(startDate, endDate),
          getTicketMedio(startDate, endDate),
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
      .input(z.object({ competencia: z.string() }))
      .query(async ({ input }) => {
        const [dre, faturamento] = await Promise.all([
          getDreByCompetencia(input.competencia),
          getFaturamentoByCompetencia(input.competencia),
        ]);
        return { dre, faturamento };
      }),

    list: publicProcedure.query(async () => {
      const [registros, faturamentoMap] = await Promise.all([
        listDreGerencial(),
        getFaturamentoMensalMap(),
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

    getResumo: publicProcedure.query(async () => {
      const [registros, faturamentoMap] = await Promise.all([
        listDreGerencial(),
        getFaturamentoMensalMap(),
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
