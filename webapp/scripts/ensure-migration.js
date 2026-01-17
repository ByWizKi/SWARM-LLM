/**
 * Script pour vérifier et appliquer automatiquement les migrations manquantes
 *
 * Usage local :
 *   DATABASE_URL="votre-url" node scripts/ensure-migration.js
 *
 * Ou via npm :
 *   DATABASE_URL="votre-url" npm run db:migrate:check
 */

const { PrismaClient } = require("@prisma/client");

const writeUrl = process.env.DATABASE_URL;

if (!writeUrl) {
  console.error("[ERROR] DATABASE_URL n'est pas défini");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: writeUrl,
    },
  },
});

async function ensureGeminiApiKeyColumn() {
  try {
    console.log("[MIGRATION] Vérification de la colonne geminiApiKey...");

    // Vérifier si la colonne existe
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'geminiApiKey'
    `;

    if (result && result.length > 0) {
      console.log("[MIGRATION] La colonne geminiApiKey existe déjà");
      return { success: true, alreadyExists: true };
    }

    // Ajouter la colonne
    console.log("[MIGRATION] Ajout de la colonne geminiApiKey...");
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "geminiApiKey" TEXT
    `;

    console.log("[MIGRATION] Migration appliquée avec succès : colonne geminiApiKey ajoutée");
    return { success: true, alreadyExists: false };
  } catch (error) {
    // Si la colonne existe déjà (erreur différente selon le SGBD)
    if (
      error?.message?.includes("already exists") ||
      error?.message?.includes("duplicate column") ||
      error?.code === "42701"
    ) {
      console.log("[MIGRATION] La colonne geminiApiKey existe déjà");
      return { success: true, alreadyExists: true };
    }

    console.error("[MIGRATION] Erreur lors de la migration:", error);
    throw error;
  }
}

async function main() {
  try {
    await ensureGeminiApiKeyColumn();
    process.exit(0);
  } catch (error) {
    console.error("[MIGRATION] Échec de la migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
