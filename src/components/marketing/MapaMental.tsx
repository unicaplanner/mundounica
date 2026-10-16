"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Braco, Tom } from "@/lib/marketing/mapa";

// Classes escritas por extenso para o Tailwind encontrar.
const TONS: Record<Tom, { traco: string; ponto: string; aberto: string; texto: string }> = {
  oliva: { traco: "var(--ok)", ponto: "bg-ok", aberto: "border-ok bg-ok-soft", texto: "text-ok" },
  terra: { traco: "var(--alerta)", ponto: "bg-alerta", aberto: "border-alerta bg-alerta-soft", texto: "text-alerta" },
  ocre: { traco: "var(--atencao)", ponto: "bg-atencao", aberto: "border-atencao bg-atencao-soft", texto: "text-atencao" },
  rosa: { traco: "var(--rosa)", ponto: "bg-rosa", aberto: "border-rosa bg-rosa-soft", texto: "text-rosa" },
  azul: { traco: "var(--azul)", ponto: "bg-azul", aberto: "border-azul bg-azul-soft", texto: "text-azul" },
  grafite: { traco: "var(--accent-ink)", ponto: "bg-accent-ink", aberto: "border-accent-ink bg-accent-soft", texto: "text-accent-ink" },
};

type Ligacao = { de: string; para: string; cor: string; grossa?: boolean };

// Caminho entre dois nos, escolhido pela posicao de um em relacao ao outro:
// lado a lado (telas largas) vira curva; um embaixo do outro (celular) vira
// um "L" arredondado saindo da borda de baixo do pai.
function caminho(pai: DOMRect, filho: DOMRect, base: DOMRect) {
  const x = (v: number) => v - base.left;
  const y = (v: number) => v - base.top;
  const pcy = y(pai.top + pai.height / 2);
  const fcy = y(filho.top + filho.height / 2);

  if (filho.left >= pai.right - 4) {
    const sx = x(pai.right);
    const ex = x(filho.left);
    const mx = (sx + ex) / 2;
    return `M${sx},${pcy} C${mx},${pcy} ${mx},${fcy} ${ex},${fcy}`;
  }
  if (filho.right <= pai.left + 4) {
    const sx = x(pai.left);
    const ex = x(filho.right);
    const mx = (sx + ex) / 2;
    return `M${sx},${pcy} C${mx},${pcy} ${mx},${fcy} ${ex},${fcy}`;
  }
  const sx = x(pai.left + 16);
  const sy = y(pai.bottom);
  const ex = x(filho.left);
  const r = Math.min(8, Math.max(0, ex - sx), Math.max(0, fcy - sy));
  return `M${sx},${sy} V${fcy - r} Q${sx},${fcy} ${sx + r},${fcy} H${ex}`;
}

export function MapaMental({ bracos }: { bracos: Braco[] }) {
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
  const caixa = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const nos = useRef(new Map<string, HTMLElement>());

  const registrar = useCallback((chave: string) => {
    return (el: HTMLElement | null) => {
      if (el) nos.current.set(chave, el);
      else nos.current.delete(chave);
    };
  }, []);

  // Metade dos bracos fica a esquerda do centro e metade a direita (telas
  // largas). No celular vira uma arvore so, de cima para baixo.
  const meio = Math.ceil(bracos.length / 2);
  const lados = [bracos.slice(0, meio), bracos.slice(meio)] as const;

  useLayoutEffect(() => {
    const ligacoes: Ligacao[] = [];
    for (const b of bracos) {
      const cor = TONS[b.tom].traco;
      ligacoes.push({ de: "centro", para: `b:${b.id}`, cor, grossa: true });
      if (abertos.has(b.id)) {
        b.filhos.forEach((_, i) => ligacoes.push({ de: `b:${b.id}`, para: `f:${b.id}:${i}`, cor }));
      }
    }

    // As linhas sao desenhadas direto no SVG (sem estado do React) para
    // acompanhar qualquer mudanca de tamanho sem re-renderizar a tela.
    function desenhar() {
      const el = caixa.current;
      const alvo = svg.current;
      if (!el || !alvo) return;
      const base = el.getBoundingClientRect();
      alvo.replaceChildren(
        ...ligacoes.flatMap(({ de, para, cor, grossa }) => {
          const a = nos.current.get(de);
          const b = nos.current.get(para);
          if (!a || !b) return [];
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", caminho(a.getBoundingClientRect(), b.getBoundingClientRect(), base));
          p.setAttribute("fill", "none");
          p.setAttribute("stroke", cor);
          p.setAttribute("stroke-width", grossa ? "2" : "1.25");
          p.setAttribute("stroke-linecap", "round");
          if (!grossa) p.setAttribute("opacity", "0.7");
          return [p];
        })
      );
    }

    desenhar();
    const observador = new ResizeObserver(desenhar);
    if (caixa.current) observador.observe(caixa.current);
    document.fonts?.ready.then(desenhar);
    return () => observador.disconnect();
  }, [abertos, bracos]);

  function alternar(id: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const tudoAberto = abertos.size === bracos.length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Toque em um braço para abrir; toque de novo para recolher.</p>
        <button
          type="button"
          onClick={() => setAbertos(tudoAberto ? new Set() : new Set(bracos.map((b) => b.id)))}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-accent-soft"
        >
          {tudoAberto ? "Recolher tudo" : "Abrir tudo"}
        </button>
      </div>

      <div
        ref={caixa}
        className="relative grid grid-cols-1 gap-y-4 xl:grid-cols-[1fr_auto_1fr] xl:items-center xl:gap-x-12"
      >
        <svg ref={svg} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" />

        <div className="relative xl:order-2 xl:justify-self-center">
          <div
            ref={registrar("centro")}
            className="inline-flex items-center rounded-full bg-ink px-6 py-3 font-serif text-xl font-semibold text-background shadow-sm"
          >
            Marketing
          </div>
        </div>

        {lados.map((grupo, lado) => (
          <ul
            key={lado}
            className={`relative flex flex-col gap-4 pl-8 xl:pl-0 ${lado === 0 ? "xl:order-1" : "xl:order-3"}`}
          >
            {grupo.map((b) => {
              const tom = TONS[b.tom];
              const aberto = abertos.has(b.id);
              const idLista = `bracos-${b.id}`;
              return (
                <li
                  key={b.id}
                  className={`flex flex-col gap-3 xl:items-center xl:gap-10 ${
                    lado === 0 ? "xl:flex-row-reverse" : "xl:flex-row"
                  }`}
                >
                  <button
                    ref={registrar(`b:${b.id}`)}
                    type="button"
                    onClick={() => alternar(b.id)}
                    aria-expanded={aberto}
                    aria-controls={idLista}
                    className={`w-full shrink-0 rounded-xl border px-4 py-3 text-left transition xl:w-52 ${
                      aberto ? tom.aberto : "border-border bg-card hover:bg-accent-soft"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tom.ponto}`} />
                        <span className="font-semibold text-ink">{b.titulo}</span>
                      </span>
                      <span className={`text-lg leading-none font-semibold ${tom.texto}`} aria-hidden>
                        {aberto ? "−" : "+"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted">{b.descricao}</span>
                    <span className={`mt-1 block text-xs font-semibold ${tom.texto}`}>
                      {b.filhos.length} braços
                    </span>
                  </button>

                  {aberto && (
                    <ul id={idLista} className="flex flex-col gap-2 pl-8 xl:pl-0">
                      {b.filhos.map((f, i) => (
                        <li
                          key={f.titulo}
                          ref={registrar(`f:${b.id}:${i}`)}
                          className="animate-brotar rounded-lg border border-border-soft bg-card px-3 py-2 xl:w-52"
                        >
                          <span className="block text-sm font-semibold text-ink">{f.titulo}</span>
                          {f.nota && <span className="block text-xs text-muted">{f.nota}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </div>
  );
}
