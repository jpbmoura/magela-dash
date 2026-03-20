CREATE TABLE `conta_azul_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50),
	`entrada_dre` varchar(100),
	`parent_external_id` varchar(255),
	`raw_payload` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conta_azul_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `ca_cat_external_id_unique` UNIQUE(`external_id`)
);
--> statement-breakpoint
CREATE TABLE `conta_azul_connection` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` datetime,
	`external_company_id` varchar(255),
	`connected_at` timestamp,
	`last_sync_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conta_azul_connection_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conta_azul_cost_centers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(100),
	`active` boolean DEFAULT true,
	`raw_payload` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conta_azul_cost_centers_id` PRIMARY KEY(`id`),
	CONSTRAINT `ca_cc_external_id_unique` UNIQUE(`external_id`)
);
--> statement-breakpoint
CREATE TABLE `conta_azul_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`competencia` varchar(7) NOT NULL,
	`due_date` date,
	`payment_date` date,
	`description` text,
	`amount` decimal(14,2) NOT NULL DEFAULT '0',
	`status` varchar(50),
	`category_external_id` varchar(255),
	`category_name` varchar(255),
	`cost_center_external_id` varchar(255),
	`cost_center_name` varchar(255),
	`raw_payload` json,
	`imported_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conta_azul_expenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `ca_exp_external_id_unique` UNIQUE(`external_id`)
);
--> statement-breakpoint
CREATE TABLE `dre_account_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_type` enum('conta_azul_category','cost_center') NOT NULL,
	`source_external_id` varchar(255) NOT NULL,
	`source_name` varchar(255) NOT NULL,
	`dre_group` enum('deducoes_receita','custos_variaveis','despesas_pessoal','despesas_administrativas','despesas_comerciais','despesas_gerais','depreciacao_amortizacao','resultado_financeiro','ir_csll','ignorar') NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dre_account_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `dre_map_source_unique` UNIQUE(`source_type`,`source_external_id`)
);
--> statement-breakpoint
CREATE INDEX `ca_exp_competencia_idx` ON `conta_azul_expenses` (`competencia`);