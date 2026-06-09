// Helpers de sessão usando iron-session (cookie HTTP-only assinado)
import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessaoUsuario } from "@/types";

// Configuração da sessão
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "memory-day-session",
  cookieOptions: {
    // Em produção, sempre use HTTPS
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
};

// Tipagem da sessão para o iron-session
declare module "iron-session" {
  interface IronSessionData {
    usuario?: SessaoUsuario;
  }
}

// Retorna a sessão atual (use em Server Components e Route Handlers)
export async function getSessao(): Promise<IronSession<{ usuario?: SessaoUsuario }>> {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}

// Retorna o usuário autenticado ou lança 401
export async function getUsuarioOuErro(): Promise<SessaoUsuario> {
  const sessao = await getSessao();
  if (!sessao.usuario) {
    throw new Error("Não autenticado");
  }
  return sessao.usuario;
}
