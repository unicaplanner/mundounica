// Preenche um modelo de DM com os dados da criadora.
// Variaveis: {nome}, {gancho}, {cupom}, {instagram}.
export function preencherMensagem(
  texto: string,
  c: { nome: string | null; gancho: string | null; cupom: string | null; instagram: string | null }
) {
  return texto
    .replaceAll("{nome}", c.nome || "")
    .replaceAll("{gancho}", c.gancho || "")
    .replaceAll("{cupom}", c.cupom || "[cupom]")
    .replaceAll("{instagram}", c.instagram ? `@${c.instagram}` : "")
    .replace(/\n{3,}/g, "\n\n");
}
