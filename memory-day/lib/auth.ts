// Helpers de sessão usando iron-session (cookie HTTP-only assinado)
import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessaoUsuario } from "@/types";

const BASE_COOKIE = {
  secure:   process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "lax" as const,
};

// 400 dias — teto máximo de expiração de cookie imposto pelos navegadores modernos
// (Chrome, Edge e Safari recusam/truncam Set-Cookie com validade maior que isso).
// É o mais próximo de "permanente" que um cookie consegue ser.
const MAX_AGE_LEMBRAR_ME = 60 * 60 * 24 * 400;

// Opções para leitura (maxAge só importa no momento em que o cookie é gravado)
export const sessionOptions: SessionOptions = {
  password:      process.env.SESSION_SECRET as string,
  cookieName:    "memory-day-session",
  cookieOptions: { ...BASE_COOKIE, maxAge: MAX_AGE_LEMBRAR_ME },
};

// Opções usadas no login — escolhe duração conforme "manter login"
export function sessionOptionsLogin(lembrarMe: boolean): SessionOptions {
  return {
    password:      process.env.SESSION_SECRET as string,
    cookieName:    "memory-day-session",
    cookieOptions: {
      ...BASE_COOKIE,
      // lembrarMe=true → 400 dias (máximo permitido pelos navegadores); false → sem maxAge (session cookie, some ao fechar o navegador)
      ...(lembrarMe ? { maxAge: MAX_AGE_LEMBRAR_ME } : {}),
    },
  };
}

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
