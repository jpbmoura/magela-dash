CREATE TABLE `alertas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` enum('estoque_baixo','estoque_critico','ruptura','venda_alta','cliente_inativo') NOT NULL,
	`produto_id` int,
	`cliente_id` int,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`severidade` enum('info','aviso','critico') NOT NULL DEFAULT 'info',
	`lido` boolean NOT NULL DEFAULT false,
	`data_alerta` timestamp NOT NULL DEFAULT (now()),
	`email_enviado` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alertas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(255),
	`cod_cliente` int NOT NULL,
	`razao_social` varchar(255) NOT NULL,
	`fantasia` varchar(255),
	`cpf_ou_cnpj` varchar(20),
	`tipo_pessoa` varchar(50),
	`inscricao_estadual` varchar(20),
	`cod_grupo` int,
	`desc_grupo` varchar(100),
	`cod_subgrupo` int,
	`desc_subgrupo` varchar(100),
	`cod_classificacao` int,
	`desc_classificacao` varchar(100),
	`cod_tipo` varchar(50),
	`desc_tipo` varchar(100),
	`limite_credito` decimal(12,2),
	`desc_limite_credito` varchar(100),
	`desconto` decimal(5,2),
	`desc_desconto` varchar(100),
	`data_vencimento` date,
	`cep` varchar(10),
	`endereco` varchar(255),
	`numero` varchar(20),
	`complemento` varchar(255),
	`bairro` varchar(100),
	`cidade` varchar(100),
	`estado` varchar(2),
	`latitude` double,
	`longitude` double,
	`telefone` varchar(20),
	`celular` varchar(20),
	`email` varchar(255),
	`data_cadastro` date,
	`ativo` varchar(20),
	`bloqueado` varchar(20),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipe` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(255),
	`cod_vendedor` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cod_sup` int,
	`funcao` varchar(100),
	`cod_ger` int,
	`tipo` varchar(100),
	`empresa_responsavel` varchar(255),
	`email` varchar(255),
	`telefone` varchar(20),
	`cargo` varchar(100),
	`departamento` varchar(100),
	`meta` decimal(12,2),
	`ativo` varchar(20) NOT NULL DEFAULT 'ATIVO',
	`data_cadastro` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipe_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `estoque` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produto_id` int NOT NULL,
	`quantidade` int NOT NULL DEFAULT 0,
	`quantidade_minima` int NOT NULL DEFAULT 10,
	`quantidade_maxima` int NOT NULL DEFAULT 1000,
	`localizacao` varchar(100),
	`ultima_movimentacao` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estoque_id` PRIMARY KEY(`id`),
	CONSTRAINT `estoque_produto_id_unique` UNIQUE(`produto_id`)
);
--> statement-breakpoint
CREATE TABLE `import_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome_arquivo` varchar(255) NOT NULL,
	`data_importacao` timestamp NOT NULL DEFAULT (now()),
	`status` enum('sucesso','erro','parcial') NOT NULL,
	`mensagem` text,
	`linhas_importadas` int DEFAULT 0,
	`linhas_erro` int DEFAULT 0,
	`detalhes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(255),
	`cod_produto` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`cod_fornecedor` int,
	`desc_fornecedor` varchar(100),
	`cod_grupo` int,
	`desc_grupo` varchar(100),
	`cod_subgrupo` int,
	`desc_subgrupo` varchar(100),
	`cod_categoria` int,
	`desc_categoria` varchar(100),
	`categoria` varchar(100),
	`marca` varchar(100),
	`grupo` varchar(100),
	`sabor` varchar(100),
	`tamanho` varchar(50),
	`unidade` varchar(20),
	`preco` decimal(12,4),
	`preco_custo` decimal(12,4),
	`preco_venda` decimal(12,4),
	`margem` decimal(5,2),
	`sku` varchar(50),
	`codigo_barras` varchar(50),
	`ativo` varchar(20),
	`bloqueado` varchar(20),
	`data_cadastro` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`open_id` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`login_method` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_signed_in` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_open_id_unique` UNIQUE(`open_id`)
);
--> statement-breakpoint
CREATE TABLE `vendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(255),
	`status` varchar(50),
	`ocorrencia` varchar(100),
	`emissao_data` date,
	`emissao_ano_mes` varchar(10),
	`acerto_data` date,
	`acerto_ano_mes` varchar(10),
	`ano` int,
	`num_venda` int NOT NULL,
	`num_lote` int,
	`num_nota` int,
	`mod_nf` varchar(20),
	`cod_cliente` int,
	`razao_social` varchar(255),
	`fantasia` varchar(255),
	`cpf_ou_cnpj` varchar(20),
	`canal` varchar(100),
	`cidade` varchar(100),
	`cod_vendedor` int,
	`cod_sup` int,
	`cod_ger` int,
	`funcao` varchar(100),
	`cfop` varchar(10),
	`tipo_cob` varchar(50),
	`prazo` varchar(20),
	`id_venda_itens` int,
	`cod_produto` int,
	`produto` varchar(255),
	`qtd_emb` int,
	`marca` varchar(100),
	`categoria` varchar(100),
	`grupo` varchar(100),
	`sabor` varchar(100),
	`motorista` varchar(255),
	`ajudante1` varchar(255),
	`ajudante2` varchar(255),
	`placa` varchar(20),
	`item_c_dev` varchar(50),
	`dev_motivo` varchar(255),
	`peso` decimal(10,3),
	`qtd_und_vda` decimal(12,4),
	`qtd_und_bonif` decimal(12,4),
	`qtd_und_troca` decimal(12,4),
	`qtd_cx_vda` decimal(12,4),
	`qtd_cx_rem` decimal(12,4),
	`qtd_cx_dev` decimal(12,4),
	`qtd_und_devol` decimal(12,4),
	`vlr_remet` decimal(12,2),
	`vlr_dev` decimal(12,2),
	`vlr_vda` decimal(12,2),
	`vlr_cx` decimal(12,2),
	`vlr_und_tab` decimal(12,4),
	`vlr_und_vda` decimal(12,4),
	`desc_perc` decimal(5,2),
	`desc_vlr` decimal(12,2),
	`vlr_desc_item` decimal(12,2),
	`desc_vendedor_perc` decimal(5,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `alertas_produto_id_idx` ON `alertas` (`produto_id`);--> statement-breakpoint
CREATE INDEX `alertas_cliente_id_idx` ON `alertas` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `alertas_tipo_idx` ON `alertas` (`tipo`);--> statement-breakpoint
CREATE INDEX `alertas_lido_idx` ON `alertas` (`lido`);--> statement-breakpoint
CREATE INDEX `clientes_cod_cliente_idx` ON `clientes` (`cod_cliente`);--> statement-breakpoint
CREATE INDEX `clientes_ativo_idx` ON `clientes` (`ativo`);--> statement-breakpoint
CREATE INDEX `clientes_cidade_idx` ON `clientes` (`cidade`);--> statement-breakpoint
CREATE INDEX `equipe_cod_vendedor_idx` ON `equipe` (`cod_vendedor`);--> statement-breakpoint
CREATE INDEX `equipe_ativo_idx` ON `equipe` (`ativo`);--> statement-breakpoint
CREATE INDEX `estoque_produto_id_idx` ON `estoque` (`produto_id`);--> statement-breakpoint
CREATE INDEX `estoque_quantidade_idx` ON `estoque` (`quantidade`);--> statement-breakpoint
CREATE INDEX `import_logs_data_importacao_idx` ON `import_logs` (`data_importacao`);--> statement-breakpoint
CREATE INDEX `produtos_cod_produto_idx` ON `produtos` (`cod_produto`);--> statement-breakpoint
CREATE INDEX `produtos_categoria_idx` ON `produtos` (`categoria`);--> statement-breakpoint
CREATE INDEX `produtos_marca_idx` ON `produtos` (`marca`);--> statement-breakpoint
CREATE INDEX `produtos_ativo_idx` ON `produtos` (`ativo`);--> statement-breakpoint
CREATE INDEX `vendas_num_venda_idx` ON `vendas` (`num_venda`);--> statement-breakpoint
CREATE INDEX `vendas_cod_cliente_idx` ON `vendas` (`cod_cliente`);--> statement-breakpoint
CREATE INDEX `vendas_cod_vendedor_idx` ON `vendas` (`cod_vendedor`);--> statement-breakpoint
CREATE INDEX `vendas_emissao_data_idx` ON `vendas` (`emissao_data`);--> statement-breakpoint
CREATE INDEX `vendas_status_idx` ON `vendas` (`status`);