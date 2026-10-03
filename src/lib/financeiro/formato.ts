const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(valor: number, casas = 2) {
  if (casas === 2) return BRL.format(valor);
  return BRL.format(valor).replace(
    /[\d.,]+/,
    valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })
  );
}

// "1.234,50" -> "1234.50"; "12,5" -> "12.5"; "9.000" -> "9000";
// "12.5" e "0.250" continuam decimais. Com virgula, o ponto e milhar. Sem
// virgula, o ponto so e milhar no formato brasileiro de grupos de 3 digitos
// sem zero na frente (9.000, 15.000, 1.500.000).
export function normalizarNumero(texto: string) {
  const t = texto.trim();
  if (t.includes(",")) return t.replace(/\./g, "").replace(",", ".");
  if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) return t.replace(/\./g, "");
  return t;
}

// Valor pra preencher um campo de edicao: sem separador de milhar, com
// virgula decimal ("9000", "570,00", "0,5").
export function paraCampo(valor: number, casas?: number) {
  const texto = casas === undefined ? String(valor) : valor.toFixed(casas);
  return texto.replace(".", ",");
}

// Busca sem diferenciar maiuscula nem acento ("cafe" acha "Café").
export function normalizarBusca(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function formatarQuantidade(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}
