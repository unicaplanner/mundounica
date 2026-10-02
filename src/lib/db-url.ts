// Os dados do Financeiro moram no mesmo projeto Supabase do login, mas num
// schema privado (?schema=financeiro em producao, financeiro_teste no dev).
// O schema "public" e exposto pela chave publica do Supabase, entao nunca
// pode receber essas tabelas -- por isso a recusa explicita abaixo.
export function databaseUrlComSchemaPrivado() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const url = new URL(raw);
  const schema = url.searchParams.get("schema");
  if (!schema || schema === "public") {
    throw new Error(
      'DATABASE_URL precisa apontar pra um schema privado (ex: "?schema=financeiro"), nunca o public.'
    );
  }

  const semSchema = new URL(raw);
  semSchema.searchParams.delete("schema");

  return { completa: raw, semSchema: semSchema.toString(), schema };
}
