// Singleton do PrismaClient — evita múltiplas conexões em desenvolvimento (hot reload do Next.js)
import { PrismaClient, Prisma } from "@prisma/client";

// Converte qualquer objeto para o tipo Json esperado pelo Prisma sem repetir o cast em todo o código
export function jsonInput<T>(val: T): Prisma.InputJsonValue {
  return val as unknown as Prisma.InputJsonValue;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
