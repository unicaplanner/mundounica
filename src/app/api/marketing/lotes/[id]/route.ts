import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraLink } from "@/lib/financeiro/valores";

// Guarda o link da pasta do Google Drive onde vao as fotos e videos do lote.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const link = paraLink(body.pastaDriveUrl);
  if (link === undefined) return erro("Cole o link inteiro da pasta (começa com https://).");

  const { count } = await prisma.mktLote.updateMany({ where: { id }, data: { pastaDriveUrl: link } });
  if (!count) return erro("Esse lote não existe mais.", 404);
  return NextResponse.json({ ok: true });
}
