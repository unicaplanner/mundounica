import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// O proxy ja barra quem nao esta logado, mas cada rota de API confere de
// novo: uma mudanca no matcher do proxy nao pode deixar dado financeiro
// aberto sem ninguem perceber.
export async function getUsuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export const naoAutenticado = () => erro("Sua sessão expirou. Entre de novo.", 401);
