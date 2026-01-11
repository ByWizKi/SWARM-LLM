import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaWrite: PrismaClient | undefined;
};

// IMPORTANT: Prisma Accelerate (PRISMA_DATABASE_URL) supporte uniquement les LECTURES
// Pour les ÉCRITURES, il faut utiliser DATABASE_URL directement
const readUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;
const writeUrl = process.env.DATABASE_URL; // Toujours utiliser DATABASE_URL pour les écritures

if (!readUrl || !writeUrl) {
  throw new Error(
    "DATABASE_URL doit être défini. PRISMA_DATABASE_URL est optionnel (pour les lectures uniquement)."
  );
}

// Instance Prisma pour les lectures (peut utiliser Accelerate)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: readUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Instance Prisma pour les écritures (toujours utiliser DATABASE_URL direct)
export const prismaWrite =
  globalForPrisma.prismaWrite ??
  new PrismaClient({
    datasources: {
      db: {
        url: writeUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaWrite = prismaWrite;
}

