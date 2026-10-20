// Leitura de links e numeros de perfil colados pela Lari.

export type Perfil = { rede: "instagram" | "tiktok" | "youtube"; handle: string };

// Paginas do Instagram que nao sao perfil (instagram.com/p/..., /reel/...).
const NAO_PERFIL = new Set(["p", "reel", "reels", "stories", "explore", "tv", "accounts", "direct"]);

export function normalizarHandle(texto: string | null | undefined): string | null {
  const h = String(texto ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(h) ? h : null;
}

// "https://www.instagram.com/camilecarvalho/?igsh=..." -> instagram/camilecarvalho
// "https://www.tiktok.com/@karynsatie" -> tiktok/karynsatie
// "@camilecarvalho" ou "camilecarvalho" -> instagram (rede padrao)
export function lerPerfil(texto: string): Perfil | null {
  const t = texto.trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t) && !/\.(com|be)\//i.test(t)) {
    const handle = normalizarHandle(t);
    return handle ? { rede: "instagram", handle } : null;
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const partes = url.pathname.split("/").filter(Boolean);
  if (host.endsWith("instagram.com")) {
    const primeiro = partes[0];
    if (!primeiro || NAO_PERFIL.has(primeiro)) return null;
    const handle = normalizarHandle(primeiro);
    return handle ? { rede: "instagram", handle } : null;
  }
  if (host.endsWith("tiktok.com")) {
    const arroba = partes.find((p) => p.startsWith("@"));
    const handle = normalizarHandle(arroba);
    return handle ? { rede: "tiktok", handle } : null;
  }
  if (host.endsWith("youtube.com")) {
    const arroba = partes.find((p) => p.startsWith("@"));
    const handle = normalizarHandle(arroba);
    return handle ? { rede: "youtube", handle } : null;
  }
  return null;
}

export function linkPerfil(rede: Perfil["rede"], handle: string) {
  if (/^https?:\/\//.test(handle)) return handle;
  if (rede === "instagram") return `https://instagram.com/${handle}`;
  if (rede === "tiktok") return `https://www.tiktok.com/@${handle}`;
  return `https://www.youtube.com/@${handle}`;
}

// "1,6k" -> 1600; "83,7k" -> 83700; "920" -> 920; "1.2M" -> 1200000; "sim" -> null
export function lerSeguidores(texto: unknown): number | null {
  const t = String(texto ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "");
  const m = t.match(/^(\d+(?:[.,]\d+)?)(k|mil|m)?$/);
  if (!m) return null;
  let n = Number(m[1].replace(",", "."));
  // "9.800" sem sufixo e milhar brasileiro
  if (!m[2] && /^\d{1,3}\.\d{3}$/.test(m[1])) n = Number(m[1].replace(".", ""));
  if (m[2] === "k" || m[2] === "mil") n *= 1000;
  if (m[2] === "m") n *= 1_000_000;
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function formatarSeguidores(n: number | null | undefined) {
  if (n === null || n === undefined) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (n >= 1000) return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return String(n);
}

export function linkWhatsapp(numero: string | null | undefined): string | null {
  const n = String(numero ?? "").replace(/\D/g, "");
  if (n.length < 10) return null;
  return `https://wa.me/${n.startsWith("55") && n.length > 11 ? n : `55${n}`}`;
}
