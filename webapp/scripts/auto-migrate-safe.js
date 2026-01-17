/**
 * Script de migration automatique sécurisée pour Vercel
 * 
 * Version alternative qui utilise uniquement les migrations SQL spécifiques
 * au lieu de db push (plus sécurisée, ne modifie que ce qui est nécessaire)
 */

const { PrismaClient } = require("@prisma/client");

const writeUrl = process.env.DATABASE_URL;

// Vérifier si DATABASE_URL est disponible
if (!writeUrl) {
  console.log("[AUTO_MIGRATE] DATABASE_URL non disponible, migrations ignorées");
  process.exit(0);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: writeUrl,
    },
  },
});

async function applyMigrations() {
  try {
    console.log("[AUTO_MIGRATE] Vérification et application des migrations...");

    // Migration 1: geminiApiKey
    console.log("[AUTO_MIGRATE] Vérification de la colonne geminiApiKey...");
    
    const checkColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'geminiApiKey'
    `;

    if (!checkColumn || (Array.isArray(checkColumn) && checkColumn.length === 0)) {
      console.log("[AUTO_MIGRATE] Ajout de la colonne geminiApiKey...");
      await prisma.$executeRaw`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "geminiApiKey" TEXT
      `;
      console.log("[AUTO_MIGRATE] Colonne geminiApiKey ajoutée avec succès");
    } else {
      console.log("[AUTO_MIGRATE] Colonne geminiApiKey existe déjà");
    }

    // Ajouter ici d'autres migrations futures au besoin
    // Exemple :
    // await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nouvelle_colonne" TEXT`;

    console.log("[AUTO_MIGRATE] Toutes les migrations appliquées avec succès");
  } catch (error) {
    // Si la colonne existe déjà (erreur différente selon le SGBD)
    if (
      error?.message?.includes("already exists") ||
      error?.message?.includes("duplicate column") ||
      error?.code === "42701"
    ) {
      console.log("[AUTO_MIGRATE] Migration déjà appliquée");
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    await applyMigrations();
    process.exit(0);
  } catch (error) {
    console.error("[AUTO_MIGRATE] Erreur lors de la migration:", error.message);
    console.error("[AUTO_MIGRATE] Le build continue malgré l'erreur");
    console.error("[AUTO_MIGRATE] Les migrations devront être appliquées manuellement");
    // Ne pas faire échouer le build
    process.exit(0);
  }
}

main();
