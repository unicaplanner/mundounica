"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MktCanal, MktNivel } from "@prisma/client";
import { chamarApi } from "@/components/marketing/Acoes";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";
import { CANAIS, ORDEM_CANAIS } from "@/lib/marketing/rotulos";

// Formulario de "Novo post" e de "Editar" da ficha. O roteiro cena a cena
// continua vindo do plano; aqui e o que a Lari ajusta no dia a dia.

export type ValoresConteudo = {
  data: string;
  horario?: string | null;
  canal?: MktCanal;
  formato?: string | null;
  nivel?: MktNivel;
  perfil?: string | null;
  titulo?: string | null;
  gancho?: string | null;
  legenda?: string | null;
  hashtags?: string | null;
  cta?: string | null;
  linkCanva?: string | null;
  produtos?: string | null;
  campanha?: string | null;
  producao?: string | null;
  observacao?: string | null;
};

const FORMATOS: Record<MktCanal, string> = {
  stories: "Sequência de stories",
  instagram: "Carrossel",
  tiktok: "Vídeo",
  youtube: "Vídeo",
  email: "E-mail",
  blog: "Post de blog",
};
const PERFIS = ["@unicaplanner", "@larirotina", "Collab @unicaplanner + @larirotina"];

export function EditarConteudo({
  id,
  inicial,
  onPronto,
  onCancelar,
}: {
  id?: string; // sem id: post novo
  inicial: ValoresConteudo;
  onPronto: (novoId?: string) => void;
  onCancelar: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [v, setV] = useState<ValoresConteudo>({ canal: "instagram", nivel: "realista", formato: inicial.formato ?? FORMATOS[inicial.canal ?? "instagram"], ...inicial });
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const muda = (k: keyof ValoresConteudo) => (e: { target: { value: string } }) => setV((a) => ({ ...a, [k]: e.target.value }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setMensagem(null);
    try {
      const r = id
        ? await chamarApi(`/api/marketing/conteudos/${id}`, { acao: "editar", ...v })
        : await chamarApi<{ id: string }>("/api/marketing/conteudos", v, "POST");
      startTransition(() => router.refresh());
      onPronto(id ? undefined : (r as { id: string }).id);
    } catch (err) {
      setMensagem((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const area = (k: keyof ValoresConteudo, label: string, linhas = 3, dica?: string) => (
    <label className="flex flex-col sm:col-span-2">
      <span className={rotulo}>{label}</span>
      <textarea value={(v[k] as string) ?? ""} onChange={muda(k)} rows={linhas} className={campo} placeholder={dica} />
    </label>
  );
  const linha = (k: keyof ValoresConteudo, label: string, dica?: string, tipo = "text") => (
    <label className="flex flex-col">
      <span className={rotulo}>{label}</span>
      <input type={tipo} value={(v[k] as string) ?? ""} onChange={muda(k)} className={campo} placeholder={dica} />
    </label>
  );

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4 rounded-2xl border border-ink/20 bg-card p-4 sm:p-5">
      <h3 className="font-serif text-lg font-semibold text-ink">{id ? "Editar post" : "Novo post"}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {linha("data", "Data", undefined, "date")}
        {linha("horario", "Horário", "ex: 19h")}
        <label className="flex flex-col">
          <span className={rotulo}>Canal</span>
          <select
            value={v.canal}
            onChange={(e) => {
              const canal = e.target.value as MktCanal;
              setV((a) => ({ ...a, canal, formato: !a.formato || a.formato === FORMATOS[a.canal ?? "instagram"] ? FORMATOS[canal] : a.formato }));
            }}
            className={campo}
          >
            {ORDEM_CANAIS.map((c) => (
              <option key={c} value={c}>
                {CANAIS[c].rotulo}
              </option>
            ))}
          </select>
        </label>
        {linha("formato", "Formato", "ex: Carrossel (7 lâminas)")}
        <label className="flex flex-col">
          <span className={rotulo}>Perfil</span>
          <input list="perfis-mkt" value={v.perfil ?? ""} onChange={muda("perfil")} className={campo} placeholder="@unicaplanner" />
          <datalist id="perfis-mkt">
            {PERFIS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col">
          <span className={rotulo}>Ritmo</span>
          <select value={v.nivel} onChange={muda("nivel")} className={campo}>
            <option value="realista">Realista</option>
            <option value="extra">Extra (estratégico)</option>
          </select>
        </label>
        <label className="flex flex-col sm:col-span-2">
          <span className={rotulo}>Título</span>
          <input value={v.titulo ?? ""} onChange={muda("titulo")} className={campo} required />
        </label>
        {linha("linkCanva", "Link do Canva", "https://www.canva.com/...")}
        {linha("campanha", "Campanha", "ex: Black Friday")}
        {area("gancho", "Gancho (a primeira frase)", 2)}
        {area("legenda", v.canal === "email" ? "Texto do e-mail" : v.canal === "youtube" ? "Descrição do vídeo" : "Legenda", 6)}
        {linha("hashtags", "Hashtags")}
        {linha("cta", "Chamada (CTA)", "ex: Comente PLANNER")}
        {area("produtos", "Produtos que aparecem (com link)", 2)}
        {area("producao", "O que gravar / fotografar (uma linha por item)", 3)}
        {area("observacao", "Observações", 2)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={ocupado} className={botaoPrimario}>
          {ocupado ? "Salvando…" : id ? "Salvar mudanças" : "Criar post"}
        </button>
        <button type="button" onClick={onCancelar} className={botaoSecundario}>
          Cancelar
        </button>
        {mensagem && <span className="text-xs text-alerta">{mensagem}</span>}
      </div>
    </form>
  );
}
