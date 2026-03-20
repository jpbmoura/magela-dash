export interface DreInput {
  receitaBruta: number;
  deducoesReceita: number;
  custosVariaveis: number;
  despesasPessoal: number;
  despesasAdministrativas: number;
  despesasComerciais: number;
  despesasGerais: number;
  depreciacaoAmortizacao: number;
  resultadoFinanceiro: number;
  irCsll: number;
}

export interface DreCompleto extends DreInput {
  receitaLiquida: number;
  lucroBruto: number;
  ebitda: number;
  ebit: number;
  resultadoAntesIrCsll: number;
  lucroLiquido: number;
  margemBruta: number;
  margemEbitda: number;
  margemEbit: number;
  margemLiquida: number;
}

function safe(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

function pct(part: number, base: number): number {
  if (base === 0) return 0;
  return (part / base) * 100;
}

export function calcularDre(input: DreInput): DreCompleto {
  const receitaBruta = safe(input.receitaBruta);
  const deducoesReceita = safe(input.deducoesReceita);
  const custosVariaveis = safe(input.custosVariaveis);
  const despesasPessoal = safe(input.despesasPessoal);
  const despesasAdministrativas = safe(input.despesasAdministrativas);
  const despesasComerciais = safe(input.despesasComerciais);
  const despesasGerais = safe(input.despesasGerais);
  const depreciacaoAmortizacao = safe(input.depreciacaoAmortizacao);
  const resultadoFinanceiro = safe(input.resultadoFinanceiro);
  const irCsll = safe(input.irCsll);

  const receitaLiquida = receitaBruta - deducoesReceita;
  const lucroBruto = receitaLiquida - custosVariaveis;
  const ebitda = lucroBruto - despesasPessoal - despesasAdministrativas - despesasComerciais - despesasGerais;
  const ebit = ebitda - depreciacaoAmortizacao;
  const resultadoAntesIrCsll = ebit + resultadoFinanceiro;
  const lucroLiquido = resultadoAntesIrCsll - irCsll;

  const base = receitaLiquida;

  return {
    receitaBruta,
    deducoesReceita,
    custosVariaveis,
    despesasPessoal,
    despesasAdministrativas,
    despesasComerciais,
    despesasGerais,
    depreciacaoAmortizacao,
    resultadoFinanceiro,
    irCsll,
    receitaLiquida,
    lucroBruto,
    ebitda,
    ebit,
    resultadoAntesIrCsll,
    lucroLiquido,
    margemBruta: pct(lucroBruto, base),
    margemEbitda: pct(ebitda, base),
    margemEbit: pct(ebit, base),
    margemLiquida: pct(lucroLiquido, base),
  };
}
