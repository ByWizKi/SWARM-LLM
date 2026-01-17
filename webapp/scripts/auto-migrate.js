/**
 * Script de migration automatique pour Vercel
 *
 * Ce script s'exécute pendant le build pour appliquer automatiquement
 * les migrations de base de données.
 *
 * Il utilise prisma db push qui est idempotent et synchronise le schéma.
 */

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

const writeUrl = process.env.DATABASE_URL;

// Vérifier si DATABASE_URL est disponible
if (!writeUrl) {
  console.log("[AUTO_MIGRATE] DATABASE_URL non disponible, migrations ignorées");
  console.log("[AUTO_MIGRATE] Les migrations devront être appliquées manuellement");
  process.exit(0); // Ne pas échouer le build si DATABASE_URL n'est pas disponible
}

console.log("[AUTO_MIGRATE] Démarrage de la migration automatique...");

try {
  // Utiliser prisma db push pour synchroniser le schéma
  // db push est idempotent et peut être exécuté plusieurs fois sans problème
  console.log("[AUTO_MIGRATE] Synchronisation du schéma Prisma avec la base de données...");

  execSync("npx prisma db push --accept-data-loss --skip-generate", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: writeUrl,
    },
  });

  console.log("[AUTO_MIGRATE] Migration automatique terminée avec succès");
  process.exit(0);
} catch (error) {
  console.error("[AUTO_MIGRATE] Erreur lors de la migration automatique:", error.message);
  console.error("[AUTO_MIGRATE] Le build continue malgré l'erreur de migration");
  console.error("[AUTO_MIGRATE] Les migrations devront être appliquées manuellement");

  // Ne pas faire échouer le build si la migration échoue
  // Cela permet au déploiement de continuer même si la DB n'est pas accessible
  process.exit(0);
}
