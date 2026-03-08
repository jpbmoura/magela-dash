# Dashboard Comercial e de Estoque

Sistema de análise comercial e gestão de estoque desenvolvido com React 19, Express 4, tRPC 11 e MySQL/TiDB. Permite importar dados de planilhas Excel e visualizá-los em dashboards interativos com gráficos, rankings e alertas de estoque.

---

## Visão Geral

O Dashboard Comercial centraliza as informações de vendas, clientes, produtos, equipe e estoque em uma interface moderna com tema escuro. Os dados são importados a partir de um arquivo Excel com abas padronizadas e ficam disponíveis imediatamente em todos os monitores da aplicação.

### Módulos disponíveis

| Módulo | Descrição |
|---|---|
| **Dashboard** | KPIs gerais, Top 5 Clientes, Top 5 Produtos e Ranking de Vendedores |
| **Clientes** | Rankings por valor e pedidos, ticket médio, clientes novos e inativos, gráfico de evolução |
| **Vendas** | Análise por período, gráficos de faturamento mensal, ranking de produtos e canais |
| **Estoque** | Alertas de estoque crítico/baixo/zerado calculados a partir da coluna `ESTOQUE TOTAL UND` |
| **Produtos** | Catálogo com busca, performance de vendas e status de estoque por produto |
| **Equipe** | Ranking de vendedores, metas com barra de progresso e evolução mensal |

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React | 19.x |
| Estilização | Tailwind CSS | 4.x |
| Componentes | shadcn/ui + Lucide React | — |
| Gráficos | Recharts | 2.x |
| Backend | Express | 4.x |
| API | tRPC | 11.x |
| ORM | Drizzle ORM | 0.44.x |
| Banco de dados | MySQL / TiDB | — |
| Runtime | Node.js | 22.x |
| Gerenciador de pacotes | pnpm | 10.x |
| Linguagem | TypeScript | 5.9.x |

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado na sua máquina:

- **Node.js** v22 ou superior — [nodejs.org](https://nodejs.org)
- **pnpm** v10 ou superior — instale com `npm install -g pnpm`
- **MySQL** v8+ ou acesso a um banco **TiDB** compatível

---

## Instalação e Configuração

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd dashboard-comercial
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de dados MySQL/TiDB (obrigatório)
DATABASE_URL=mysql://usuario:senha@host:3306/nome_do_banco

# Segredo para assinar os cookies de sessão (obrigatório)
JWT_SECRET=uma-string-secreta-longa-e-aleatoria

# Configurações do Manus OAuth (necessário para autenticação)
VITE_APP_ID=seu-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im
OWNER_OPEN_ID=seu-open-id
OWNER_NAME=Seu Nome

# APIs internas Manus (opcional — necessário apenas para funcionalidades de IA)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
```

> **Atenção:** O sistema de autenticação utiliza o Manus OAuth. Para rodar localmente sem autenticação, seria necessário modificar o middleware de sessão em `server/_core/context.ts`. Para uso completo, as credenciais OAuth devem ser obtidas na plataforma Manus.

### 4. Aplique o schema no banco de dados

O comando abaixo gera as migrations e aplica todas as tabelas no banco configurado em `DATABASE_URL`:

```bash
pnpm db:push
```

As tabelas criadas são: `users`, `clientes`, `vendas`, `produtos`, `equipe` e `estoque`.

---

## Executando em Desenvolvimento

Com as variáveis de ambiente configuradas e o banco populado, inicie o servidor de desenvolvimento:

```bash
pnpm dev
```

O servidor sobe na porta **3000** por padrão. Acesse [http://localhost:3000](http://localhost:3000) no navegador.

O comando `pnpm dev` inicia simultaneamente o servidor Express (backend + tRPC) e o Vite (frontend com HMR), ambos servidos pela mesma porta via proxy integrado.

---

## Importando Dados via Excel

O sistema não possui dados de exemplo pré-carregados. Para visualizar informações nos dashboards, é necessário importar um arquivo Excel com a estrutura esperada.

### Estrutura do arquivo Excel

O arquivo deve conter as seguintes abas com os respectivos campos obrigatórios:

| Aba | Campos principais |
|---|---|
| **DADOS** (vendas) | `COD_CLIENTE`, `NUM_VENDA`, `EMISSAO_DATA`, `VLR_VDA`, `QTD_UND_VDA`, `COD_PRODUTO`, `OCORRENCIA`, `COD_VENDEDOR` |
| **CLIENTES** | `COD_CLIENTE`, `RAZAO_SOCIAL`, `FANTASIA`, `CIDADE`, `ESTADO`, `ATIVO` |
| **PRODUTOS** | `COD_PRODUTO`, `PRODUTO`, `CATEGORIA`, `MARCA`, `PRECO_VENDA`, `ESTOQUE TOTAL UND` |
| **EQUIPE** | `COD_VENDEDOR`, `NOME`, `CARGO`, `META_MENSAL` |

> A coluna **`ESTOQUE TOTAL UND`** na aba PRODUTOS é usada diretamente como medidor de estoque. Os alertas de estoque crítico (≤ 50 un.) e baixo (≤ 200 un.) são calculados com base nesse valor.

### Como importar

Após fazer login na aplicação, acesse **Configurações → Atualizar Base** no menu lateral e faça o upload do arquivo Excel. O processo de importação trunca e recarrega todas as tabelas de dados (clientes, vendas, produtos, equipe), preservando apenas os dados de usuários e configurações do sistema.

---

## Build para Produção

Para gerar os artefatos de produção:

```bash
pnpm build
```

O comando compila o frontend com Vite e empacota o servidor com esbuild. Os arquivos gerados ficam em `dist/`. Para iniciar em modo produção:

```bash
pnpm start
```

---

## Testes

O projeto utiliza **Vitest** para testes unitários e de integração. Para executar a suíte de testes:

```bash
pnpm test
```

Os arquivos de teste seguem o padrão `*.test.ts` e ficam na pasta `server/`. O arquivo de referência é `server/auth.logout.test.ts`.

---

## Verificação de Tipos

Para checar erros de TypeScript sem compilar:

```bash
pnpm check
```

---

## Estrutura de Pastas

```
dashboard-comercial/
├── client/
│   ├── index.html
│   └── src/
│       ├── components/       # Componentes reutilizáveis (KPICard, PageHeader, DashboardLayout...)
│       ├── pages/            # Páginas: Dashboard, Clientes, Vendas, Estoque, Produtos, Equipe
│       ├── App.tsx           # Roteamento principal
│       ├── index.css         # Tema global (variáveis CSS, dark mode)
│       └── lib/trpc.ts       # Cliente tRPC
├── drizzle/
│   └── schema.ts             # Definição das tabelas do banco de dados
├── server/
│   ├── _core/                # Infraestrutura: OAuth, contexto, cookies, env
│   ├── utils/
│   │   └── excelImport.ts    # Parser de planilhas Excel
│   ├── db.ts                 # Funções de consulta ao banco
│   └── routers.ts            # Procedures tRPC (API)
├── shared/                   # Tipos e constantes compartilhados entre client e server
├── drizzle.config.ts         # Configuração do Drizzle Kit
├── vite.config.ts            # Configuração do Vite
└── package.json
```

---

## Observações Importantes

O banco de dados opera em modo `ONLY_FULL_GROUP_BY` (padrão do MySQL/TiDB). As queries que utilizam `GROUP BY` com campos não agregados executam `SET SESSION sql_mode` antes de cada consulta para garantir compatibilidade. Essa abordagem é segura para uso em produção, pois a configuração é aplicada apenas na sessão de conexão atual.

O sistema de autenticação é baseado em **Manus OAuth** e utiliza cookies de sessão assinados com `JWT_SECRET`. Não há suporte nativo para autenticação por usuário/senha local — toda autenticação passa pelo provedor OAuth configurado.
