import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Utilise PRISMA_DATABASE_URL (Prisma Accelerate) si disponible, sinon DATABASE_URL
// Prisma Accelerate améliore les performances avec un cache intelligent
const databaseUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL ou PRISMA_DATABASE_URL doit être défini dans les variables d'environnement"
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

