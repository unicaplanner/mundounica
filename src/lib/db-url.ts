// Os dados do Financeiro moram no mesmo projeto Supabase do login, mas num
// schema privado (?schema=financeiro em producao, financeiro_teste no dev).
// O schema "public" e exposto pela chave publica do Supabase, entao nunca
// pode receber essas tabelas -- por isso a recusa explicita abaixo.
// As mensagens dizem o problema sem nunca mostrar o valor (tem senha nele).
export function databaseUrlComSchemaPrivado() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL nao configurada.");
  }
  if (/^["']|["']$/.test(raw)) {
    throw new Error("DATABASE_URL esta com aspas no valor: cole so o endereco, sem aspas.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL nao e um endereco valido (deve comecar com postgresql://).");
  }

  const schema = url.searchParams.get("schema");
  if (!schema || schema === "public") {
    throw new Error(
      'DATABASE_URL precisa apontar pra um schema privado (terminar em "?schema=financeiro"), nunca o public.'
    );
  }

  url.searchParams.delete("schema");
  return { completa: raw, semSchema: url.toString(), schema };
}
