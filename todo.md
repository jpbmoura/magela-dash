# Dashboard Comercial - TODO

## Fase 1: Schema e Banco de Dados
- [x] Configurar schema Prisma com tabelas: Clientes, Vendas, Produtos, Estoque, Equipe
- [x] Criar migrações do banco SQLite
- [x] Implementar relações entre tabelas

## Fase 2: Backend de Importação
- [x] Implementar parser de arquivos .xlsm
- [x] Criar validação de abas obrigatórias (PRODUTOS, CLIENTES, EQUIPE, DADOS)
- [x] Implementar lógica de importação com transações
- [x] Criar rota/server action de upload
- [x] Adicionar feedback de sucesso/erro e logs

## Fase 3: Layout e Navegação
- [x] Criar componente DashboardLayout com sidebar
- [x] Implementar topbar com filtros globais
- [x] Configurar rotas e navegação
- [x] Adicionar tema claro/escuro

## Fase 4: Componentes Reutilizáveis
- [x] Criar componente KPI Card
- [x] Criar componente Table com filtros e paginação
- [x] Criar componente Chart (Recharts)
- [x] Criar componente Alert/Badge
- [x] Criar componente Filter
- [x] Criar componente Loading States

## Fase 5: Dashboard Principal
- [x] Implementar KPIs: faturamento, vendas, ticket médio, clientes ativos
- [x] Criar gráfico de vendas por período
- [x] Implementar ranking de vendedores
- [x] Implementar top clientes
- [x] Adicionar alertas de estoque baixo

## Fase 6: Monitores Específicos
- [x] Monitor de Clientes: listagem, busca, filtros, histórico
- [x] Monitor de Vendas: gráficos, análise por período, ranking de produtos
- [x] Monitor de Estoque: alertas, níveis críticos, movimentações
- [x] Monitor de Produtos: cadastro, categorização, performance
- [x] Monitor de Equipe: ranking, metas, performance

## Fase 7: Sistema de Alertas
- [ ] Implementar notificações de estoque crítico
- [ ] Configurar envio de emails ao proprietário
- [ ] Criar sistema de alertas em tempo real
- [ ] Adicionar histórico de alertas

## Fase 8: Testes e Entrega
- [ ] Testar importação de Excel
- [ ] Testar dashboards e gráficos
- [ ] Validar responsividade
- [ ] Testar sistema de alertas
- [ ] Documentação de uso


## Adaptação para Arquivo Excel Real (BASERELATORIOS3.0.xlsm)

### Estrutura do Excel Identificada:
- **PRODUTOS** (38 colunas): Dados de produtos com informações de fornecedor, categoria, preços, etc.
- **CLIENTES** (38 colunas): Dados de clientes com informações de contato, localização, status
- **EQUIPE** (8 colunas): Dados de vendedores, supervisores e gerentes
- **DADOS** (57 colunas): Transações de vendas com detalhes completos

### Tarefas:
- [x] Normalizar nomes de colunas (remover acentos, espaços, caracteres especiais)
- [x] Atualizar schema Prisma para incluir todas as colunas do Excel
- [x] Reescrever parser de importação com mapeamento correto de tipos
- [x] Implementar validação de dados por tipo (datas, números, strings)
- [ ] Testar importação com arquivo real
- [x] Corrigir erros 500 no dashboard (schema snake_case + GROUP BY + ANY_VALUE)
- [ ] Atualizar dashboards com dados reais (aguardando importação)

## Bug: Importação parcial (apenas CLIENTES) - RESOLVIDO
- [x] Diagnosticar por que apenas aba CLIENTES era importada (nomes de colunas errados no parser)
- [x] Corrigir mapeamento: COD. PROD, PRODUTO, VENDEDOR, Nº. VENDA, ENDEREÇO, UF
- [x] Corrigir inserção em lote para PRODUTOS, EQUIPE e DADOS
- [ ] Validar importação completa com arquivo real

## Melhoria UI/UX (Mar 2026)
- [x] Ícones específicos no sidebar (Users, ShoppingCart, Warehouse, Package, UserSquare2)
- [x] Componente PageHeader padronizado para todos os monitores
- [x] Tabelas com classe data-table (estilo consistente em todos os monitores)
- [x] Badges substituídos por pill-badges coloridos (sem bordas, fundo translúcido)
- [x] KPI cards com accent bar colorida no topo
- [x] Formatação de valores: fmtShort com 1 decimal (R$ 1.2M, R$ 500K)
- [x] Ticket Médio no Dashboard com formatação correta
- [x] Cores diversificadas nos gráficos de pizza (não mais tons do mesmo azul)
- [ ] Adicionar filtro de período global
- [ ] Implementar exportação CSV/Excel

## Bug: Monitor de Estoque zerado
- [x] Investigar campo de estoque no banco (coluna estoque em produtos)
- [x] Corrigir query/mapeamento de dados de estoque — estoque calculado a partir de vendas
- [x] Validar exibição no Monitor de Estoque

## Feature: Estoque a partir de ESTOQUE TOTAL UND (aba PRODUTOS do Excel)
- [x] Adicionar coluna estoque_total na tabela produtos (schema + migração via SQL direto)
- [x] Atualizar importação para ler coluna "ESTOQUE TOTAL UND" da aba PRODUTOS
- [x] Reescrever queries de estoque para usar produtos.estoque_total
- [ ] Validar exibição no Monitor de Estoque após reimportação do Excel

## Bug: Nomes ausentes nos Top 5 do Dashboard
- [x] Corrigir Top 5 Clientes — exibir razaoSocial/fantasia
- [x] Corrigir Top 5 Produtos — exibir nome do produto
- [x] Corrigir Ranking de Vendedores — exibir nome do vendedor

## Feature: Tela de Clientes Reformulada
- [x] Top clientes por valor comprado (KPI + ranking)
- [x] Top clientes por número de pedidos
- [x] Ticket médio por cliente
- [x] Clientes inativos (sem compra no período)
- [x] Clientes novos (primeira compra no período)
- [x] Tabela com ranking de clientes paginada
- [x] Filtros por período
- [x] Gráfico comparativo (evolução mensal dos top clientes)

## Bug: Erros SQL nas queries de Clientes
- [x] Corrigir getClientesKPIs - SET SESSION sql_mode para remover ONLY_FULL_GROUP_BY
- [x] Corrigir getRankingClientes - sql.raw() para LIMIT/OFFSET
- [x] Corrigir getTopClientesPorValor/Pedidos - mesma correção aplicada
- [x] Corrigir getClientesNovos / getClientesInativos - mesma correção aplicada

## Bug: alias 'v' em subquery de inativos (getClientesKPIs db.ts:767)
- [x] Corrigir subquery de inativos em getClientesKPIs - adicionado dateFilterSub sem alias v.
- [x] Verificar outras subqueries similares - getClientesInativos e getClientesNovos corrigidos

## Feature: Remover Autenticação (app público)
- [x] Converter todas as protectedProcedure para publicProcedure no routers.ts
- [x] Remover rotas de OAuth e auth do backend
- [x] Remover guards de login do DashboardLayout
- [x] Redirecionar / direto para /dashboard
- [x] Remover seção de perfil de usuário do sidebar
- [x] Remover useAuth e referências a login/logout do frontend
