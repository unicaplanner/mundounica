// Chamada das rotas /api/financeiro a partir das telas: devolve a mensagem
// de erro da rota (ou uma generica) pra mostrar pra Lari, em vez de falhar
// em silencio.
export async function enviar(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<{ ok: true; dados: Record<string, unknown> } | { ok: false; erro: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, erro: dados.erro ?? "Não deu certo. Tente de novo." };
    }
    return { ok: true, dados };
  } catch {
    return { ok: false, erro: "Sem conexão. Confira a internet e tente de novo." };
  }
}
