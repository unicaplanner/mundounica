import { Prisma } from "@prisma/client";
import { normalizarNumero } from "./formato";

// Converte o que vem do formulario num Decimal, ou null se nao for um
// numero valido e >= 0. Aceita "12.5", "12,5" e "1.234,50".
export function paraDecimal(valor: unknown): Prisma.Decimal | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const texto = normalizarNumero(String(valor));
  if (!/^\d+(\.\d+)?$/.test(texto)) return null;
  return new Prisma.Decimal(texto);
}

// Texto curto vindo de formulario: sem espacos nas pontas, null se vazio.
export function paraTexto(valor: unknown, max = 120): string | null {
  const texto = String(valor ?? "").trim().slice(0, max);
  return texto || null;
}
