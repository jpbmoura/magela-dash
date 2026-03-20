import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  index,
  unique,
  double,
  date
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clientes table - Customer data from CLIENTES sheet
 */
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 255 }),
  codCliente: int("cod_cliente").notNull(),
  razaoSocial: varchar("razao_social", { length: 255 }).notNull(),
  fantasia: varchar("fantasia", { length: 255 }),
  cpfOuCnpj: varchar("cpf_ou_cnpj", { length: 20 }),
  tipoPessoa: varchar("tipo_pessoa", { length: 50 }),
  inscricaoEstadual: varchar("inscricao_estadual", { length: 20 }),
  codGrupo: int("cod_grupo"),
  descGrupo: varchar("desc_grupo", { length: 100 }),
  codSubgrupo: int("cod_subgrupo"),
  descSubgrupo: varchar("desc_subgrupo", { length: 100 }),
  codClassificacao: int("cod_classificacao"),
  descClassificacao: varchar("desc_classificacao", { length: 100 }),
  codTipo: varchar("cod_tipo", { length: 50 }),
  descTipo: varchar("desc_tipo", { length: 100 }),
  limiteCredito: decimal("limite_credito", { precision: 12, scale: 2 }),
  descLimiteCredito: varchar("desc_limite_credito", { length: 100 }),
  desconto: decimal("desconto", { precision: 5, scale: 2 }),
  descDesconto: varchar("desc_desconto", { length: 100 }),
  dataVencimento: date("data_vencimento"),
  cep: varchar("cep", { length: 10 }),
  endereco: varchar("endereco", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 255 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  latitude: double("latitude"),
  longitude: double("longitude"),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  email: varchar("email", { length: 255 }),
  dataCadastro: date("data_cadastro"),
  ativo: varchar("ativo", { length: 20 }),
  bloqueado: varchar("bloqueado", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codClienteIdx: index("clientes_cod_cliente_idx").on(table.codCliente),
  ativoIdx: index("clientes_ativo_idx").on(table.ativo),
  cidadeIdx: index("clientes_cidade_idx").on(table.cidade),
}));

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

/**
 * Produtos table - Product catalog from PRODUTOS sheet
 */
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 255 }),
  codProduto: int("cod_produto").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  codFornecedor: int("cod_fornecedor"),
  descFornecedor: varchar("desc_fornecedor", { length: 100 }),
  codGrupo: int("cod_grupo"),
  descGrupo: varchar("desc_grupo", { length: 100 }),
  codSubgrupo: int("cod_subgrupo"),
  descSubgrupo: varchar("desc_subgrupo", { length: 100 }),
  codCategoria: int("cod_categoria"),
  descCategoria: varchar("desc_categoria", { length: 100 }),
  categoria: varchar("categoria", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  grupo: varchar("grupo", { length: 100 }),
  sabor: varchar("sabor", { length: 100 }),
  tamanho: varchar("tamanho", { length: 50 }),
  unidade: varchar("unidade", { length: 20 }),
  preco: decimal("preco", { precision: 12, scale: 4 }),
  precoCusto: decimal("preco_custo", { precision: 12, scale: 4 }),
  precoVenda: decimal("preco_venda", { precision: 12, scale: 4 }),
  margem: decimal("margem", { precision: 5, scale: 2 }),
  sku: varchar("sku", { length: 50 }),
  codigoBarras: varchar("codigo_barras", { length: 50 }),
  estoqueTotal: int("estoque_total"),
  ativo: varchar("ativo", { length: 20 }),
  bloqueado: varchar("bloqueado", { length: 20 }),
  dataCadastro: date("data_cadastro"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codProdutoIdx: index("produtos_cod_produto_idx").on(table.codProduto),
  categoriaIdx: index("produtos_categoria_idx").on(table.categoria),
  marcaIdx: index("produtos_marca_idx").on(table.marca),
  ativoIdx: index("produtos_ativo_idx").on(table.ativo),
}));

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

/**
 * Estoque table - Inventory tracking
 */
export const estoque = mysqlTable("estoque", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produto_id").notNull(),
  quantidade: int("quantidade").notNull().default(0),
  quantidadeMinima: int("quantidade_minima").notNull().default(10),
  quantidadeMaxima: int("quantidade_maxima").notNull().default(1000),
  localizacao: varchar("localizacao", { length: 100 }),
  ultimaMovimentacao: timestamp("ultima_movimentacao").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  produtoIdIdx: index("estoque_produto_id_idx").on(table.produtoId),
  quantidadeIdx: index("estoque_quantidade_idx").on(table.quantidade),
  unique_produto: unique("estoque_produto_id_unique").on(table.produtoId),
}));

export type Estoque = typeof estoque.$inferSelect;
export type InsertEstoque = typeof estoque.$inferInsert;

/**
 * Equipe table - Sales team members from EQUIPE sheet
 */
export const equipe = mysqlTable("equipe", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 255 }),
  codVendedor: int("cod_vendedor").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  codSup: int("cod_sup"),
  funcao: varchar("funcao", { length: 100 }),
  codGer: int("cod_ger"),
  tipo: varchar("tipo", { length: 100 }),
  empresaResponsavel: varchar("empresa_responsavel", { length: 255 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  cargo: varchar("cargo", { length: 100 }),
  departamento: varchar("departamento", { length: 100 }),
  meta: decimal("meta", { precision: 12, scale: 2 }),
  ativo: varchar("ativo", { length: 20 }).default('ATIVO').notNull(),
  dataCadastro: timestamp("data_cadastro").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codVendedorIdx: index("equipe_cod_vendedor_idx").on(table.codVendedor),
  ativoIdx: index("equipe_ativo_idx").on(table.ativo),
}));

export type Equipe = typeof equipe.$inferSelect;
export type InsertEquipe = typeof equipe.$inferInsert;

/**
 * Vendas table - Sales transactions from DADOS sheet
 */
export const vendas = mysqlTable("vendas", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 255 }),
  status: varchar("status", { length: 50 }),
  ocorrencia: varchar("ocorrencia", { length: 100 }),
  emissaoData: date("emissao_data"),
  emissaoAnoMes: varchar("emissao_ano_mes", { length: 10 }),
  acertoData: date("acerto_data"),
  acertoAnoMes: varchar("acerto_ano_mes", { length: 10 }),
  ano: int("ano"),
  numVenda: int("num_venda").notNull(),
  numLote: int("num_lote"),
  numNota: int("num_nota"),
  modNf: varchar("mod_nf", { length: 20 }),
  codCliente: int("cod_cliente"),
  razaoSocial: varchar("razao_social", { length: 255 }),
  fantasia: varchar("fantasia", { length: 255 }),
  cpfOuCnpj: varchar("cpf_ou_cnpj", { length: 20 }),
  canal: varchar("canal", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  codVendedor: int("cod_vendedor"),
  codSup: int("cod_sup"),
  codGer: int("cod_ger"),
  funcao: varchar("funcao", { length: 100 }),
  cfop: varchar("cfop", { length: 10 }),
  tipoCob: varchar("tipo_cob", { length: 50 }),
  prazo: varchar("prazo", { length: 20 }),
  idVendaItens: int("id_venda_itens"),
  codProduto: int("cod_produto"),
  produto: varchar("produto", { length: 255 }),
  qtdEmb: int("qtd_emb"),
  marca: varchar("marca", { length: 100 }),
  categoria: varchar("categoria", { length: 100 }),
  grupo: varchar("grupo", { length: 100 }),
  sabor: varchar("sabor", { length: 100 }),
  motorista: varchar("motorista", { length: 255 }),
  ajudante1: varchar("ajudante1", { length: 255 }),
  ajudante2: varchar("ajudante2", { length: 255 }),
  placa: varchar("placa", { length: 20 }),
  itemCDev: varchar("item_c_dev", { length: 50 }),
  devMotivo: varchar("dev_motivo", { length: 255 }),
  peso: decimal("peso", { precision: 10, scale: 3 }),
  qtdUndVda: decimal("qtd_und_vda", { precision: 12, scale: 4 }),
  qtdUndBonif: decimal("qtd_und_bonif", { precision: 12, scale: 4 }),
  qtdUndTroca: decimal("qtd_und_troca", { precision: 12, scale: 4 }),
  qtdCxVda: decimal("qtd_cx_vda", { precision: 12, scale: 4 }),
  qtdCxRem: decimal("qtd_cx_rem", { precision: 12, scale: 4 }),
  qtdCxDev: decimal("qtd_cx_dev", { precision: 12, scale: 4 }),
  qtdUndDevol: decimal("qtd_und_devol", { precision: 12, scale: 4 }),
  vlrRemet: decimal("vlr_remet", { precision: 12, scale: 2 }),
  vlrDev: decimal("vlr_dev", { precision: 12, scale: 2 }),
  vlrVda: decimal("vlr_vda", { precision: 12, scale: 2 }),
  vlrCx: decimal("vlr_cx", { precision: 12, scale: 2 }),
  vlrUndTab: decimal("vlr_und_tab", { precision: 12, scale: 4 }),
  vlrUndVda: decimal("vlr_und_vda", { precision: 12, scale: 4 }),
  descPerc: decimal("desc_perc", { precision: 5, scale: 2 }),
  descVlr: decimal("desc_vlr", { precision: 12, scale: 2 }),
  vlrDescItem: decimal("vlr_desc_item", { precision: 12, scale: 2 }),
  descVendedorPerc: decimal("desc_vendedor_perc", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  numVendaIdx: index("vendas_num_venda_idx").on(table.numVenda),
  codClienteIdx: index("vendas_cod_cliente_idx").on(table.codCliente),
  codVendedorIdx: index("vendas_cod_vendedor_idx").on(table.codVendedor),
  emissaoDataIdx: index("vendas_emissao_data_idx").on(table.emissaoData),
  statusIdx: index("vendas_status_idx").on(table.status),
}));

export type Venda = typeof vendas.$inferSelect;
export type InsertVenda = typeof vendas.$inferInsert;

/**
 * ImportLog table - Track Excel imports
 */
export const importLogs = mysqlTable("import_logs", {
  id: int("id").autoincrement().primaryKey(),
  nomeArquivo: varchar("nome_arquivo", { length: 255 }).notNull(),
  dataImportacao: timestamp("data_importacao").defaultNow().notNull(),
  status: mysqlEnum("status", ["sucesso", "erro", "parcial"]).notNull(),
  mensagem: text("mensagem"),
  linhasImportadas: int("linhas_importadas").default(0),
  linhasErro: int("linhas_erro").default(0),
  detalhes: text("detalhes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dataImportacaoIdx: index("import_logs_data_importacao_idx").on(table.dataImportacao),
}));

export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = typeof importLogs.$inferInsert;

/**
 * Alertas table - Stock and business alerts
 */
export const alertas = mysqlTable("alertas", {
  id: int("id").autoincrement().primaryKey(),
  tipo: mysqlEnum("tipo", ["estoque_baixo", "estoque_critico", "ruptura", "venda_alta", "cliente_inativo"]).notNull(),
  produtoId: int("produto_id"),
  clienteId: int("cliente_id"),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  severidade: mysqlEnum("severidade", ["info", "aviso", "critico"]).default("info").notNull(),
  lido: boolean("lido").default(false).notNull(),
  dataAlerta: timestamp("data_alerta").defaultNow().notNull(),
  emailEnviado: boolean("email_enviado").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  produtoIdIdx: index("alertas_produto_id_idx").on(table.produtoId),
  clienteIdIdx: index("alertas_cliente_id_idx").on(table.clienteId),
  tipoIdx: index("alertas_tipo_idx").on(table.tipo),
  lidoIdx: index("alertas_lido_idx").on(table.lido),
}));

export type Alerta = typeof alertas.$inferSelect;
export type InsertAlerta = typeof alertas.$inferInsert;

/**
 * DRE Gerencial Mensal - Monthly managerial income statement with EBITDA
 */
export const dreGerencialMensal = mysqlTable("dre_gerencial_mensal", {
  id: int("id").autoincrement().primaryKey(),
  competencia: varchar("competencia", { length: 7 }).notNull(),
  receitaBrutaManual: decimal("receita_bruta_manual", { precision: 14, scale: 2 }),
  deducoesReceita: decimal("deducoes_receita", { precision: 14, scale: 2 }).notNull().default("0"),
  custosVariaveis: decimal("custos_variaveis", { precision: 14, scale: 2 }).notNull().default("0"),
  despesasPessoal: decimal("despesas_pessoal", { precision: 14, scale: 2 }).notNull().default("0"),
  despesasAdministrativas: decimal("despesas_administrativas", { precision: 14, scale: 2 }).notNull().default("0"),
  despesasComerciais: decimal("despesas_comerciais", { precision: 14, scale: 2 }).notNull().default("0"),
  despesasGerais: decimal("despesas_gerais", { precision: 14, scale: 2 }).notNull().default("0"),
  depreciacaoAmortizacao: decimal("depreciacao_amortizacao", { precision: 14, scale: 2 }).notNull().default("0"),
  resultadoFinanceiro: decimal("resultado_financeiro", { precision: 14, scale: 2 }).notNull().default("0"),
  irCsll: decimal("ir_csll", { precision: 14, scale: 2 }).notNull().default("0"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  competenciaUnique: unique("dre_competencia_unique").on(table.competencia),
  competenciaIdx: index("dre_competencia_idx").on(table.competencia),
}));

export type DreGerencialMensal = typeof dreGerencialMensal.$inferSelect;
export type InsertDreGerencialMensal = typeof dreGerencialMensal.$inferInsert;
