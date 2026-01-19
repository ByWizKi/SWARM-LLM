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

    // Migration 2: victoryPoints (remplace rank)
    console.log("[AUTO_MIGRATE] Vérification de la colonne victoryPoints...");
    const checkVictoryPoints = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'victoryPoints'
    `;

    if (!checkVictoryPoints || (Array.isArray(checkVictoryPoints) && checkVictoryPoints.length === 0)) {
      console.log("[AUTO_MIGRATE] Ajout de la colonne victoryPoints...");
      await prisma.$executeRaw`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "victoryPoints" INTEGER
      `;
      console.log("[AUTO_MIGRATE] Colonne victoryPoints ajoutée avec succès");
    } else {
      console.log("[AUTO_MIGRATE] Colonne victoryPoints existe déjà");
    }

    // Migration 3: draft_sessions table
    console.log("[AUTO_MIGRATE] Vérification de la table draft_sessions...");
    const checkDraftSessionsTable = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'draft_sessions'
    `;

    if (!checkDraftSessionsTable || (Array.isArray(checkDraftSessionsTable) && checkDraftSessionsTable.length === 0)) {
      console.log("[AUTO_MIGRATE] Création de la table draft_sessions...");

      // Créer la table draft_sessions
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "draft_sessions" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "firstPlayer" TEXT NOT NULL,
          "winner" TEXT,
          "playerAPicks" JSONB NOT NULL,
          "playerBPicks" JSONB NOT NULL,
          "playerABans" JSONB NOT NULL,
          "playerBBans" JSONB NOT NULL,
          "recommendations" JSONB NOT NULL,
          "banRecommendations" JSONB,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "draft_sessions_pkey" PRIMARY KEY ("id")
        )
      `;

      // Créer les index
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "draft_sessions_userId_idx" ON "draft_sessions"("userId")
      `;
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "draft_sessions_createdAt_idx" ON "draft_sessions"("createdAt")
      `;

      // Ajouter la contrainte de clé étrangère
      const checkForeignKey = await prisma.$queryRaw`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE constraint_name = 'draft_sessions_userId_fkey'
      `;

      if (!checkForeignKey || (Array.isArray(checkForeignKey) && checkForeignKey.length === 0)) {
        await prisma.$executeRaw`
          ALTER TABLE "draft_sessions"
          ADD CONSTRAINT "draft_sessions_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `;
      }

      console.log("[AUTO_MIGRATE] Table draft_sessions créée avec succès");
    } else {
      console.log("[AUTO_MIGRATE] Table draft_sessions existe déjà");
    }

    // Migration 4: recommendation_ratings table (si nécessaire)
    console.log("[AUTO_MIGRATE] Vérification de la table recommendation_ratings...");
    const checkRatingsTable = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'recommendation_ratings'
    `;

    if (!checkRatingsTable || (Array.isArray(checkRatingsTable) && checkRatingsTable.length === 0)) {
      console.log("[AUTO_MIGRATE] Création de la table recommendation_ratings...");

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "recommendation_ratings" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "messageId" TEXT NOT NULL,
          "rating" INTEGER NOT NULL,
          "recommendationText" TEXT,
          "phase" TEXT,
          "turn" INTEGER,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "recommendation_ratings_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "recommendation_ratings_userId_messageId_key" UNIQUE ("userId", "messageId")
        )
      `;

      const checkRatingsForeignKey = await prisma.$queryRaw`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE constraint_name = 'recommendation_ratings_userId_fkey'
      `;

      if (!checkRatingsForeignKey || (Array.isArray(checkRatingsForeignKey) && checkRatingsForeignKey.length === 0)) {
        await prisma.$executeRaw`
          ALTER TABLE "recommendation_ratings"
          ADD CONSTRAINT "recommendation_ratings_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `;
      }

      console.log("[AUTO_MIGRATE] Table recommendation_ratings créée avec succès");
    } else {
      console.log("[AUTO_MIGRATE] Table recommendation_ratings existe déjà");
    }

    // Migration 5: Migration de rating vers textRating et monsterRecommendationRating
    console.log("[AUTO_MIGRATE] Vérification de la migration rating -> textRating/monsterRecommendationRating...");

    // Vérifier si la colonne rating existe
    const checkRatingColumn = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recommendation_ratings' AND column_name = 'rating'
    `;

    // Vérifier si les nouvelles colonnes existent
    const checkTextRatingColumn = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recommendation_ratings' AND column_name = 'textRating'
    `;

    const checkMonsterRatingColumn = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recommendation_ratings' AND column_name = 'monsterRecommendationRating'
    `;

    const hasOldRating = checkRatingColumn && Array.isArray(checkRatingColumn) && checkRatingColumn.length > 0;
    const hasTextRating = checkTextRatingColumn && Array.isArray(checkTextRatingColumn) && checkTextRatingColumn.length > 0;
    const hasMonsterRating = checkMonsterRatingColumn && Array.isArray(checkMonsterRatingColumn) && checkMonsterRatingColumn.length > 0;

    if (hasOldRating && (!hasTextRating || !hasMonsterRating)) {
      console.log("[AUTO_MIGRATE] Migration de rating vers textRating et monsterRecommendationRating...");

      // Ajouter les nouvelles colonnes si elles n'existent pas
      if (!hasTextRating) {
        await prisma.$executeRaw`
          ALTER TABLE "recommendation_ratings"
          ADD COLUMN IF NOT EXISTS "textRating" INTEGER
        `;
        console.log("[AUTO_MIGRATE] Colonne textRating ajoutée");
      }

      if (!hasMonsterRating) {
        await prisma.$executeRaw`
          ALTER TABLE "recommendation_ratings"
          ADD COLUMN IF NOT EXISTS "monsterRecommendationRating" INTEGER
        `;
        console.log("[AUTO_MIGRATE] Colonne monsterRecommendationRating ajoutée");
      }

      // Migrer les données existantes : copier rating vers textRating
      await prisma.$executeRaw`
        UPDATE "recommendation_ratings"
        SET "textRating" = "rating"
        WHERE "textRating" IS NULL AND "rating" IS NOT NULL
      `;
      console.log("[AUTO_MIGRATE] Données migrées de rating vers textRating");

      // Supprimer l'ancienne colonne rating (optionnel, on peut la garder pour compatibilité)
      // await prisma.$executeRaw`
      //   ALTER TABLE "recommendation_ratings" DROP COLUMN IF EXISTS "rating"
      // `;
      // console.log("[AUTO_MIGRATE] Ancienne colonne rating supprimée");
    } else if (hasTextRating && hasMonsterRating) {
      console.log("[AUTO_MIGRATE] Colonnes textRating et monsterRecommendationRating existent déjà");
    }

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
