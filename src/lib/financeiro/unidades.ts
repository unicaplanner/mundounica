export const UNIDADES = [
  { valor: "un", rotulo: "unidade" },
  { valor: "folha", rotulo: "folha" },
  { valor: "m", rotulo: "metro" },
  { valor: "kg", rotulo: "quilo" },
  { valor: "g", rotulo: "grama" },
  { valor: "ml", rotulo: "mililitro" },
] as const;

export const VALORES_UNIDADE: string[] = UNIDADES.map((u) => u.valor);
