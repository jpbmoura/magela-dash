export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return formatCurrency(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "0,0%";
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export function parseDecimalInput(value: string): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
