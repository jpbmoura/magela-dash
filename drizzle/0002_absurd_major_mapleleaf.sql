CREATE TABLE `dre_gerencial_mensal` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competencia` varchar(7) NOT NULL,
	`receita_bruta_manual` decimal(14,2),
	`deducoes_receita` decimal(14,2) NOT NULL DEFAULT '0',
	`custos_variaveis` decimal(14,2) NOT NULL DEFAULT '0',
	`despesas_pessoal` decimal(14,2) NOT NULL DEFAULT '0',
	`despesas_administrativas` decimal(14,2) NOT NULL DEFAULT '0',
	`despesas_comerciais` decimal(14,2) NOT NULL DEFAULT '0',
	`despesas_gerais` decimal(14,2) NOT NULL DEFAULT '0',
	`depreciacao_amortizacao` decimal(14,2) NOT NULL DEFAULT '0',
	`resultado_financeiro` decimal(14,2) NOT NULL DEFAULT '0',
	`ir_csll` decimal(14,2) NOT NULL DEFAULT '0',
	`observacoes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dre_gerencial_mensal_id` PRIMARY KEY(`id`),
	CONSTRAINT `dre_competencia_unique` UNIQUE(`competencia`)
);
--> statement-breakpoint
CREATE INDEX `dre_competencia_idx` ON `dre_gerencial_mensal` (`competencia`);