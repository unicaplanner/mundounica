import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerPerfil } from "@/lib/parcerias/perfil";
import { lerCriadora } from "@/lib/parcerias/leitura";

// Captura relampago: cola o link do perfil e salva com data/hora. Se a
// criadora ja existe (mesmo @), devolve a ficha dela em vez de duplicar.
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = await req.json();

  const link = String(body.link ?? "").trim();
  if (link) {
    const perfil = lerPerfil(link);
    if (!perfil) return erro("Não reconheci esse link. Cole o link do perfil (instagram.com/..., tiktok.com/@...) ou o @.");

    const existente = await prisma.criadora.findFirst({
      where: perfil.rede === "instagram" ? { instagram: perfil.handle } : perfil.rede === "tiktok" ? { tiktok: perfil.handle } : { youtube: perfil.handle },
      select: { id: true },
    });
    if (existente) return NextResponse.json({ id: existente.id, existente: true });

    const criada = await prisma.criadora.create({
      data: {
        instagram: perfil.rede === "instagram" ? perfil.handle : null,
        tiktok: perfil.rede === "tiktok" ? perfil.handle : null,
        youtube: perfil.rede === "youtube" ? perfil.handle : null,
        linkOrigem: /^https?:\/\//i.test(link) ? link.slice(0, 1000) : null,
        motivo: String(body.motivo ?? "").trim().slice(0, 2000) || null,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: criada.id, existente: false });
  }

  // Cadastro completo (ex: indicacao sem link)
  const lido = lerCriadora(body);
  if (!lido.ok) return erro(lido.erro);
  if (!lido.dados.instagram && !lido.dados.nome) return erro("Informe pelo menos o @ do Instagram ou o nome.");
  try {
    const criada = await prisma.criadora.create({ data: lido.dados as Parameters<typeof prisma.criadora.create>[0]["data"], select: { id: true } });
    return NextResponse.json({ id: criada.id, existente: false });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") return erro("Já existe uma criadora com esse @ ou cupom.", 409);
    throw e;
  }
}
